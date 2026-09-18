using Microsoft.EntityFrameworkCore;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Reglas del ciclo de vida de un paquete asignado, en UN solo lugar (antes la regla de cierre
/// vivía en PatientPackagesController y AppointmentsController no la replicaba — FLUJOS bug 6):
///   · completar una sesión suma al contador y, si era la última, cierra el paquete (Completado)
///   · un paquete Activo/Pausado cuya vigencia venció pasa a Vencido (job diario de Hangfire)
///   · eliminar una asignación o un pago es soft delete y solo lo hace Admin
/// </summary>
public class PatientPackageService
{
    private readonly AppDbContext _db;
    private readonly ILogger<PatientPackageService> _logger;

    public PatientPackageService(AppDbContext db, ILogger<PatientPackageService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Último día de vigencia: inicio + VigenciaDias del paquete de catálogo.</summary>
    public static DateOnly FechaVencimiento(DateOnly fechaInicio, int vigenciaDias) => fechaInicio.AddDays(vigenciaDias);

    /// <summary>
    /// Marca la sesión como completada y aplica el cierre. No guarda: el caller hace SaveChanges
    /// junto con su propio cambio (p. ej. el estado de la cita). Devuelve false si ya estaba completada.
    /// </summary>
    public async Task<bool> CompleteSessionAsync(PatientPackageSession session, CancellationToken ct = default)
    {
        if (session.Estado == SessionStatus.Completada)
            return false;

        var patientPackage = session.PatientPackage
            ?? await _db.PatientPackages.FirstAsync(p => p.Id == session.PatientPackageId, ct);

        // IgnoreQueryFilters: si el paquete de catálogo fue eliminado, la asignación sigue viva
        var sesionesTotales = await _db.Packages.IgnoreQueryFilters()
            .Where(p => p.Id == patientPackage.PackageId)
            .Select(p => p.SesionesTotales)
            .FirstAsync(ct);

        session.Estado = SessionStatus.Completada;
        session.FechaCompletada = DateTime.Now;
        patientPackage.SesionesCompletadas++;

        if (patientPackage.SesionesCompletadas >= sesionesTotales && patientPackage.Estado != PackageStatus.Vencido)
            patientPackage.Estado = PackageStatus.Completado;

        return true;
    }

    /// <summary>Soft delete de la asignación con sus sesiones y pagos. Las citas pierden el vínculo a la sesión.</summary>
    public async Task DeleteAssignmentAsync(Guid id, CancellationToken ct = default)
    {
        var patientPackage = await _db.PatientPackages
            .Include(p => p.Sessions)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw ApiException.NotFound("Paquete de paciente no encontrado.");

        var sessionIds = patientPackage.Sessions.Select(s => s.Id).ToList();
        var linked = await _db.Appointments
            .Where(a => a.PatientPackageSessionId != null && sessionIds.Contains(a.PatientPackageSessionId.Value))
            .ToListAsync(ct);
        foreach (var appointment in linked)
            appointment.PatientPackageSessionId = null;

        foreach (var session in patientPackage.Sessions) session.IsDeleted = true;
        foreach (var payment in patientPackage.Payments) payment.IsDeleted = true;
        patientPackage.IsDeleted = true;

        await _db.SaveChangesAsync(ct);
    }

    public async Task DeletePaymentAsync(Guid patientPackageId, Guid paymentId, CancellationToken ct = default)
    {
        var payment = await _db.PatientPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.PatientPackageId == patientPackageId, ct)
            ?? throw ApiException.NotFound("Pago no encontrado.");

        payment.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Job diario (Hangfire, sin tenant ni usuario): todos los tenants, por eso IgnoreQueryFilters.
    /// Un paquete Activo o Pausado cuya vigencia ya pasó queda Vencido.
    /// </summary>
    public async Task<int> ExpireOverdueAsync()
    {
        var hoy = DateOnly.FromDateTime(DateTime.Now);

        var candidatos = await _db.PatientPackages.IgnoreQueryFilters()
            .Where(pp => !pp.IsDeleted && (pp.Estado == PackageStatus.Activo || pp.Estado == PackageStatus.Pausado))
            .Join(_db.Packages.IgnoreQueryFilters(), pp => pp.PackageId, p => p.Id,
                (pp, p) => new { PatientPackage = pp, p.VigenciaDias })
            .Where(x => x.VigenciaDias > 0)
            .ToListAsync();

        var vencidos = candidatos
            .Where(x => FechaVencimiento(x.PatientPackage.FechaInicio, x.VigenciaDias) < hoy)
            .Select(x => x.PatientPackage)
            .ToList();

        foreach (var patientPackage in vencidos)
            patientPackage.Estado = PackageStatus.Vencido;

        if (vencidos.Count > 0)
            await _db.SaveChangesAsync();

        _logger.LogInformation("Vencimiento de paquetes: {Count} paquetes pasaron a Vencido.", vencidos.Count);
        return vencidos.Count;
    }
}
