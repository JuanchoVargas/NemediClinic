using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.PatientPackages;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/patient-packages")]
[Authorize(Policy = "Admin")]
public class PatientPackagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PatientPackageService _packages;

    public PatientPackagesController(AppDbContext db, PatientPackageService packages)
    {
        _db = db;
        _packages = packages;
    }

    [HttpPost]
    public async Task<IActionResult> AssignPackage([FromBody] AssignPackageRequest request)
    {
        var patientPackage = await _packages.AssignAsync(
            request.PatientId, request.PackageId, request.PrecioAcordado, request.FechaInicio);

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = patientPackage.Id }, new { id = patientPackage.Id });
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        // Sin Include(Package): el nombre, las sesiones y la vigencia son la copia de la asignación
        var packages = await _db.PatientPackages
            .AsNoTracking()
            .Include(pp => pp.Payments)
            .Where(pp => pp.PatientId == patientId)
            .OrderByDescending(pp => pp.FechaInicio)
            .Select(pp => new PatientPackageDto
            {
                Id = pp.Id,
                PatientId = pp.PatientId,
                PackageId = pp.PackageId,
                PackageNombre = pp.PackageNombre,
                PrecioAcordado = pp.PrecioAcordado,
                FechaInicio = pp.FechaInicio,
                Estado = pp.Estado.ToString(),
                SesionesCompletadas = pp.SesionesCompletadas,
                SesionesTotales = pp.SesionesTotales,
                TotalPagado = pp.Payments.Sum(p => p.Monto),
                SaldoPendiente = pp.PrecioAcordado - pp.Payments.Sum(p => p.Monto),
                // VigenciaDias / alerta viajan temporalmente aquí y se resuelven abajo, en memoria
                FechaVencimiento = pp.VigenciaDias > 0 ? pp.FechaInicio.AddDays(pp.VigenciaDias) : null,
                DiasParaVencer = pp.DiasAlertaVencimiento
            })
            .ToListAsync();

        foreach (var package in packages)
        {
            ApplyExpiry(package, package.DiasParaVencer ?? 0);
            PatientPackageService.ApplyPaymentSummary(package);
        }

        return Ok(packages);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var pp = await _db.PatientPackages
            .AsNoTracking()
            .Include(p => p.Patient)
            .Include(p => p.Sessions)
                .ThenInclude(s => s.Procedure)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pp is null)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        var totalPagado = pp.Payments.Sum(p => p.Monto);

        var dto = new PatientPackageDto
        {
            FechaVencimiento = pp.VigenciaDias > 0
                ? PatientPackageService.FechaVencimiento(pp.FechaInicio, pp.VigenciaDias)
                : null,
            Id = pp.Id,
            PatientId = pp.PatientId,
            PatientNombre = pp.Patient.Nombre + " " + pp.Patient.Apellido,
            PackageId = pp.PackageId,
            PackageNombre = pp.PackageNombre,
            PrecioAcordado = pp.PrecioAcordado,
            FechaInicio = pp.FechaInicio,
            Estado = pp.Estado.ToString(),
            SesionesCompletadas = pp.SesionesCompletadas,
            SesionesTotales = pp.SesionesTotales,
            TotalPagado = totalPagado,
            SaldoPendiente = pp.PrecioAcordado - totalPagado,
            Sesiones = pp.Sessions
                .OrderBy(s => s.Numero)
                .Select(s => new PatientPackageSessionDto
                {
                    Id = s.Id,
                    ProcedureId = s.ProcedureId,
                    ProcedureNombre = s.Procedure.Nombre,
                    Numero = s.Numero,
                    Estado = s.Estado.ToString(),
                    FechaCompletada = s.FechaCompletada,
                    ClinicalNoteId = s.ClinicalNoteId
                }).ToList(),
            Pagos = await _packages.ListPaymentsAsync(id)
        };
        ApplyExpiry(dto, pp.DiasAlertaVencimiento);
        PatientPackageService.ApplyPaymentSummary(dto);
        return Ok(dto);
    }

    /// <summary>Días que faltan para vencer y si ya entró en la ventana de alerta del paquete.</summary>
    private static void ApplyExpiry(PatientPackageDto dto, int diasAlerta)
    {
        if (dto.FechaVencimiento is null)
        {
            dto.DiasParaVencer = null;
            return;
        }
        var hoy = DateOnly.FromDateTime(DateTime.Now);
        dto.DiasParaVencer = dto.FechaVencimiento.Value.DayNumber - hoy.DayNumber;
        dto.PorVencer = dto.Estado == nameof(PackageStatus.Activo) && dto.DiasParaVencer >= 0 && dto.DiasParaVencer <= diasAlerta;
    }

    // ── DELETE /api/v1/patient-packages/{id} ── soft delete de la asignación, sus sesiones y pagos
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _packages.DeleteAssignmentAsync(id);
        return NoContent();
    }

    // ── DELETE /api/v1/patient-packages/{id}/payments/{paymentId} ── soft delete de un pago
    [HttpDelete("{id:guid}/payments/{paymentId:guid}")]
    public async Task<IActionResult> DeletePayment(Guid id, Guid paymentId)
    {
        await _packages.DeletePaymentAsync(id, paymentId);
        return NoContent();
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdatePackageStatusRequest request)
    {
        var patientPackage = await _db.PatientPackages.FindAsync(id);
        if (patientPackage is null)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        patientPackage.Estado = request.Estado;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<IActionResult> RegisterPayment(Guid id, [FromBody] RegisterPaymentRequest request)
    {
        // 422 si el monto supera el saldo pendiente; guarda quién lo registró
        var userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : Guid.Empty;
        var payment = await _packages.RegisterPaymentAsync(id, request, userId);
        return Created($"api/v1/patient-packages/{id}/payments", payment);
    }

    // ── PUT /api/v1/patient-packages/{id}/payments/{paymentId}/comprobante ── adjunta o reemplaza el soporte
    [HttpPut("{id:guid}/payments/{paymentId:guid}/comprobante")]
    public async Task<IActionResult> SetComprobante(Guid id, Guid paymentId, [FromBody] SetComprobanteRequest request) =>
        Ok(await _packages.SetComprobanteAsync(id, paymentId, request.ComprobanteId));

    [HttpGet("{id:guid}/payments")]
    public async Task<IActionResult> GetPayments(Guid id)
    {
        var exists = await _db.PatientPackages.AnyAsync(p => p.Id == id);
        if (!exists)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        return Ok(await _packages.ListPaymentsAsync(id));
    }

    [HttpPut("{id:guid}/sessions/{sessionId:guid}/complete")]
    public async Task<IActionResult> CompleteSession(Guid id, Guid sessionId)
    {
        var patientPackage = await _db.PatientPackages
            .FirstOrDefaultAsync(p => p.Id == id);

        if (patientPackage is null)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        var session = await _db.PatientPackageSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.PatientPackageId == id);

        if (session is null)
            return NotFound(new { error = "Sesión no encontrada." });

        // Regla compartida con AppointmentsController (cierra el paquete en la última sesión)
        session.PatientPackage = patientPackage;
        if (!await _packages.CompleteSessionAsync(session))
            return BadRequest(new { error = "La sesión ya fue completada." });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            sesionesCompletadas = patientPackage.SesionesCompletadas,
            sesionesTotales = patientPackage.SesionesTotales,
            estado = patientPackage.Estado.ToString()
        });
    }
}
