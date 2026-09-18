using System.Globalization;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.PatientPackages;
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
///   · un pago nunca deja el saldo por debajo de 0 (422) y guarda quién lo registró, referencia y comprobante
/// </summary>
public class PatientPackageService
{
    private static readonly CultureInfo EsCo = CultureInfo.GetCultureInfo("es-CO");

    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;
    private readonly ILogger<PatientPackageService> _logger;

    public PatientPackageService(AppDbContext db, AttachmentService attachments, ILogger<PatientPackageService> logger)
    {
        _db = db;
        _attachments = attachments;
        _logger = logger;
    }

    // ── Pagos ───────────────────────────────────────────────────────
    /// <summary>Porcentaje pagado (0–100) y estado de pago de un paquete asignado.</summary>
    public static (int Porcentaje, PaymentState Estado) PaymentSummary(decimal precioAcordado, decimal totalPagado)
    {
        if (precioAcordado <= 0 || totalPagado >= precioAcordado)
            return (100, PaymentState.Pagado);
        if (totalPagado <= 0)
            return (0, PaymentState.SinPagos);

        var porcentaje = (int)Math.Round(totalPagado / precioAcordado * 100m, MidpointRounding.AwayFromZero);
        // Con saldo pendiente nunca se muestra 100 %, ni 0 % si ya hay un abono
        return (Math.Clamp(porcentaje, 1, 99), PaymentState.Parcial);
    }

    public static void ApplyPaymentSummary(PatientPackageDto dto)
    {
        var (porcentaje, estado) = PaymentSummary(dto.PrecioAcordado, dto.TotalPagado);
        dto.PorcentajePagado = porcentaje;
        dto.EstadoPago = estado.ToString();
    }

    /// <summary>
    /// Registra un pago. Regla: el monto no puede superar el saldo pendiente → 422. La asignación se
    /// marca como modificada para que su RowVersion detecte dos pagos simultáneos (el segundo recibe 409
    /// en vez de dejar el saldo negativo).
    /// </summary>
    public async Task<PatientPaymentDto> RegisterPaymentAsync(Guid patientPackageId, RegisterPaymentRequest request, Guid userId, CancellationToken ct = default)
    {
        var patientPackage = await _db.PatientPackages.FirstOrDefaultAsync(p => p.Id == patientPackageId, ct)
            ?? throw ApiException.NotFound("Paquete de paciente no encontrado.");

        var pagado = await _db.PatientPayments.Where(p => p.PatientPackageId == patientPackageId).SumAsync(p => p.Monto, ct);
        var saldo = patientPackage.PrecioAcordado - pagado;
        if (request.Monto > saldo)
            throw new ApiException(StatusCodes.Status422UnprocessableEntity,
                $"El pago supera el saldo pendiente (${Math.Max(saldo, 0).ToString("N0", EsCo)})");

        var payment = new PatientPayment
        {
            PatientPackageId = patientPackageId,
            Monto = request.Monto,
            FechaPago = request.FechaPago,
            MetodoPago = request.MetodoPago,
            Observacion = string.IsNullOrWhiteSpace(request.Observacion) ? null : request.Observacion.Trim(),
            Referencia = string.IsNullOrWhiteSpace(request.Referencia) ? null : request.Referencia.Trim(),
            RegistradoPorId = userId == Guid.Empty ? null : userId
        };
        _db.PatientPayments.Add(payment);

        if (request.ComprobanteId.HasValue)
        {
            await _attachments.AssignImageAsync(AttachmentEntityType.Payment, payment.Id, request.ComprobanteId, null, ct);
            payment.ComprobanteId = request.ComprobanteId;
        }

        _db.Entry(patientPackage).State = EntityState.Modified;
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ApiException.Conflict("Otra persona acaba de registrar un pago en este paquete. Revisa el saldo e inténtalo de nuevo.");
        }

        return (await ListPaymentsAsync(patientPackageId, ct)).First(p => p.Id == payment.Id);
    }

    /// <summary>Adjunta (o reemplaza) el comprobante de un pago ya registrado.</summary>
    public async Task<PatientPaymentDto> SetComprobanteAsync(Guid patientPackageId, Guid paymentId, Guid comprobanteId, CancellationToken ct = default)
    {
        var payment = await _db.PatientPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.PatientPackageId == patientPackageId, ct)
            ?? throw ApiException.NotFound("Pago no encontrado.");

        await _attachments.AssignImageAsync(AttachmentEntityType.Payment, payment.Id, comprobanteId, payment.ComprobanteId, ct);
        payment.ComprobanteId = comprobanteId;
        await _db.SaveChangesAsync(ct);

        return (await ListPaymentsAsync(patientPackageId, ct)).First(p => p.Id == paymentId);
    }

    /// <summary>Pagos de una asignación, del más reciente al más antiguo, con quién los registró y su comprobante.</summary>
    public async Task<List<PatientPaymentDto>> ListPaymentsAsync(Guid patientPackageId, CancellationToken ct = default)
    {
        var payments = await _db.PatientPayments.AsNoTracking()
            .Where(p => p.PatientPackageId == patientPackageId)
            .OrderByDescending(p => p.FechaPago).ThenByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        // Nombres aparte y sin el filtro de soft delete: un usuario eliminado sigue firmando sus pagos.
        var tenantId = _db.CurrentTenantId;
        var userIds = payments.Where(p => p.RegistradoPorId.HasValue).Select(p => p.RegistradoPorId!.Value).Distinct().ToList();
        var users = await _db.Users.IgnoreQueryFilters().AsNoTracking()
            .Where(u => u.TenantId == tenantId && userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => (u.Nombre + " " + u.Apellido).Trim(), ct);

        var attachmentIds = payments.Where(p => p.ComprobanteId.HasValue).Select(p => p.ComprobanteId!.Value).ToList();
        var contentTypes = await _db.Attachments.AsNoTracking()
            .Where(a => attachmentIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, a => a.ContentType, ct);

        return payments.Select(p =>
        {
            // Un comprobante borrado (soft) deja de existir para la web
            var comprobanteId = p.ComprobanteId.HasValue && contentTypes.ContainsKey(p.ComprobanteId.Value) ? p.ComprobanteId : null;
            return new PatientPaymentDto
            {
                Id = p.Id,
                Monto = p.Monto,
                FechaPago = p.FechaPago,
                MetodoPago = p.MetodoPago.ToString(),
                Observacion = p.Observacion,
                Referencia = p.Referencia,
                RegistradoPor = p.RegistradoPorId.HasValue ? users.GetValueOrDefault(p.RegistradoPorId.Value) : null,
                ComprobanteId = comprobanteId,
                ComprobanteContentType = comprobanteId.HasValue ? contentTypes[comprobanteId.Value] : null
            };
        }).ToList();
    }

    /// <summary>Último día de vigencia: inicio + VigenciaDias del paquete de catálogo.</summary>
    public static DateOnly FechaVencimiento(DateOnly fechaInicio, int vigenciaDias) => fechaInicio.AddDays(vigenciaDias);

    /// <summary>
    /// Asigna un paquete del catálogo a un paciente y genera sus sesiones. No guarda: quien llama
    /// hace un solo SaveChanges. patientIsNew = el paciente se está creando en esta misma unidad
    /// de trabajo (convertir una valoración de prospecto) y aún no existe en la base.
    /// </summary>
    public async Task<PatientPackage> AssignAsync(
        Guid patientId, Guid packageId, decimal precioAcordado, DateOnly fechaInicio, CancellationToken ct = default, bool patientIsNew = false)
    {
        if (!patientIsNew && !await _db.Patients.AnyAsync(p => p.Id == patientId, ct))
            throw ApiException.BadRequest("Paciente no encontrado.");

        var package = await _db.Packages.Include(p => p.PackageProcedures).FirstOrDefaultAsync(p => p.Id == packageId, ct)
            ?? throw ApiException.BadRequest("Paquete no encontrado.");

        var patientPackage = new PatientPackage
        {
            PatientId = patientId,
            PackageId = packageId,
            PrecioAcordado = precioAcordado,
            FechaInicio = fechaInicio,
            Estado = PackageStatus.Activo
        };
        _db.PatientPackages.Add(patientPackage);

        // Una sesión por cada CantidadSesiones de cada procedimiento del paquete
        var numero = 1;
        foreach (var item in package.PackageProcedures)
        {
            for (var i = 0; i < item.CantidadSesiones; i++)
            {
                _db.PatientPackageSessions.Add(new PatientPackageSession
                {
                    PatientPackageId = patientPackage.Id,
                    ProcedureId = item.ProcedureId,
                    Numero = numero++,
                    Estado = SessionStatus.Pendiente
                });
            }
        }
        return patientPackage;
    }

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
        if (payment.ComprobanteId.HasValue)
        {
            // El soporte se va con el pago (AttachmentCleanupService borra el archivo 24 h después)
            var comprobante = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == payment.ComprobanteId.Value, ct);
            if (comprobante is not null) comprobante.IsDeleted = true;
        }
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
