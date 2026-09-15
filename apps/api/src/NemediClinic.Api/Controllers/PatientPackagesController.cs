using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public PatientPackagesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> AssignPackage([FromBody] AssignPackageRequest request)
    {
        var patient = await _db.Patients.AnyAsync(p => p.Id == request.PatientId);
        if (!patient)
            return BadRequest(new { error = "Paciente no encontrado." });

        var package = await _db.Packages
            .Include(p => p.PackageProcedures)
            .FirstOrDefaultAsync(p => p.Id == request.PackageId);

        if (package is null)
            return BadRequest(new { error = "Paquete no encontrado." });

        var patientPackage = new PatientPackage
        {
            PatientId = request.PatientId,
            PackageId = request.PackageId,
            PrecioAcordado = request.PrecioAcordado,
            FechaInicio = request.FechaInicio,
            Estado = PackageStatus.Activo
        };

        _db.PatientPackages.Add(patientPackage);

        // Auto-generate sessions from catalog PackageProcedures
        var sessionNumber = 1;
        foreach (var pp in package.PackageProcedures)
        {
            for (var i = 0; i < pp.CantidadSesiones; i++)
            {
                _db.PatientPackageSessions.Add(new PatientPackageSession
                {
                    PatientPackageId = patientPackage.Id,
                    ProcedureId = pp.ProcedureId,
                    Numero = sessionNumber++,
                    Estado = SessionStatus.Pendiente
                });
            }
        }

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = patientPackage.Id }, new { id = patientPackage.Id });
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetByPatient(Guid patientId)
    {
        var packages = await _db.PatientPackages
            .AsNoTracking()
            .Include(pp => pp.Package)
            .Include(pp => pp.Payments)
            .Where(pp => pp.PatientId == patientId)
            .OrderByDescending(pp => pp.FechaInicio)
            .Select(pp => new PatientPackageDto
            {
                Id = pp.Id,
                PatientId = pp.PatientId,
                PackageId = pp.PackageId,
                PackageNombre = pp.Package.Nombre,
                PrecioAcordado = pp.PrecioAcordado,
                FechaInicio = pp.FechaInicio,
                Estado = pp.Estado.ToString(),
                SesionesCompletadas = pp.SesionesCompletadas,
                SesionesTotales = pp.Package.SesionesTotales,
                TotalPagado = pp.Payments.Sum(p => p.Monto),
                SaldoPendiente = pp.PrecioAcordado - pp.Payments.Sum(p => p.Monto)
            })
            .ToListAsync();

        return Ok(packages);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var pp = await _db.PatientPackages
            .AsNoTracking()
            .Include(p => p.Package)
            .Include(p => p.Patient)
            .Include(p => p.Sessions)
                .ThenInclude(s => s.Procedure)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pp is null)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        var totalPagado = pp.Payments.Sum(p => p.Monto);

        return Ok(new PatientPackageDto
        {
            Id = pp.Id,
            PatientId = pp.PatientId,
            PatientNombre = pp.Patient.Nombre + " " + pp.Patient.Apellido,
            PackageId = pp.PackageId,
            PackageNombre = pp.Package.Nombre,
            PrecioAcordado = pp.PrecioAcordado,
            FechaInicio = pp.FechaInicio,
            Estado = pp.Estado.ToString(),
            SesionesCompletadas = pp.SesionesCompletadas,
            SesionesTotales = pp.Package.SesionesTotales,
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
            Pagos = pp.Payments
                .OrderByDescending(p => p.FechaPago)
                .Select(p => new PatientPaymentDto
                {
                    Id = p.Id,
                    Monto = p.Monto,
                    FechaPago = p.FechaPago,
                    MetodoPago = p.MetodoPago.ToString(),
                    Observacion = p.Observacion
                }).ToList()
        });
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
        var patientPackage = await _db.PatientPackages.AnyAsync(p => p.Id == id);
        if (!patientPackage)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        var payment = new PatientPayment
        {
            PatientPackageId = id,
            Monto = request.Monto,
            FechaPago = request.FechaPago,
            MetodoPago = request.MetodoPago,
            Observacion = request.Observacion
        };

        _db.PatientPayments.Add(payment);
        await _db.SaveChangesAsync();

        return Created($"api/v1/patient-packages/{id}/payments", new PatientPaymentDto
        {
            Id = payment.Id,
            Monto = payment.Monto,
            FechaPago = payment.FechaPago,
            MetodoPago = payment.MetodoPago.ToString(),
            Observacion = payment.Observacion
        });
    }

    [HttpGet("{id:guid}/payments")]
    public async Task<IActionResult> GetPayments(Guid id)
    {
        var exists = await _db.PatientPackages.AnyAsync(p => p.Id == id);
        if (!exists)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        var payments = await _db.PatientPayments
            .AsNoTracking()
            .Where(p => p.PatientPackageId == id)
            .OrderByDescending(p => p.FechaPago)
            .Select(p => new PatientPaymentDto
            {
                Id = p.Id,
                Monto = p.Monto,
                FechaPago = p.FechaPago,
                MetodoPago = p.MetodoPago.ToString(),
                Observacion = p.Observacion
            })
            .ToListAsync();

        return Ok(payments);
    }

    [HttpPut("{id:guid}/sessions/{sessionId:guid}/complete")]
    public async Task<IActionResult> CompleteSession(Guid id, Guid sessionId)
    {
        var patientPackage = await _db.PatientPackages
            .Include(p => p.Package)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (patientPackage is null)
            return NotFound(new { error = "Paquete de paciente no encontrado." });

        var session = await _db.PatientPackageSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.PatientPackageId == id);

        if (session is null)
            return NotFound(new { error = "Sesión no encontrada." });

        if (session.Estado == SessionStatus.Completada)
            return BadRequest(new { error = "La sesión ya fue completada." });

        session.Estado = SessionStatus.Completada;
        session.FechaCompletada = DateTime.UtcNow;

        patientPackage.SesionesCompletadas++;

        // Auto-complete package if all sessions done
        if (patientPackage.SesionesCompletadas >= patientPackage.Package.SesionesTotales)
        {
            patientPackage.Estado = PackageStatus.Completado;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            sesionesCompletadas = patientPackage.SesionesCompletadas,
            sesionesTotales = patientPackage.Package.SesionesTotales,
            estado = patientPackage.Estado.ToString()
        });
    }
}
