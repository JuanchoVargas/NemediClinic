using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Appointments;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "Esteticista")]
public class AppointmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AppointmentsController(AppDbContext db)
    {
        _db = db;
    }

    // ── GET /api/v1/appointments?start=&end=&esteticistId=&branchId= ────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime start,
        [FromQuery] DateTime end,
        [FromQuery] Guid? esteticistId,
        [FromQuery] Guid? branchId)
    {
        if (end <= start)
            return BadRequest(new { error = "El rango de fechas es inválido." });

        var query = _db.Appointments
            .AsNoTracking()
            .Where(a => a.FechaInicio < end && a.FechaFin > start);

        query = ApplyRoleScope(query, esteticistId);

        if (branchId.HasValue)
            query = query.Where(a => a.BranchId == branchId.Value);

        var items = await query
            .OrderBy(a => a.FechaInicio)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                PatientId = a.PatientId,
                PatientNombre = a.Patient.Nombre + " " + a.Patient.Apellido,
                EsteticistId = a.EsteticistId,
                EsteticistNombre = a.Esteticist.Nombre + " " + a.Esteticist.Apellido,
                ProcedureId = a.ProcedureId,
                ProcedureNombre = a.Procedure.Nombre,
                PatientPackageSessionId = a.PatientPackageSessionId,
                BranchId = a.BranchId,
                FechaInicio = a.FechaInicio,
                FechaFin = a.FechaFin,
                Estado = a.Estado.ToString(),
                Notas = a.Notas,
                WhatsAppReminderSent = a.WhatsAppReminderSent,
                WhatsAppConfirmedAt = a.WhatsAppConfirmedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // ── GET /api/v1/appointments/day-sheet?date=&branchId= ──────────────
    [HttpGet("day-sheet")]
    public async Task<IActionResult> GetDaySheet(
        [FromQuery] DateTime date,
        [FromQuery] Guid? branchId)
    {
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);

        var query = _db.Appointments
            .AsNoTracking()
            .Where(a => a.FechaInicio >= dayStart && a.FechaInicio < dayEnd);

        query = ApplyRoleScope(query, null);

        if (branchId.HasValue)
            query = query.Where(a => a.BranchId == branchId.Value);

        var items = await query
            .OrderBy(a => a.FechaInicio)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                PatientId = a.PatientId,
                PatientNombre = a.Patient.Nombre + " " + a.Patient.Apellido,
                EsteticistId = a.EsteticistId,
                EsteticistNombre = a.Esteticist.Nombre + " " + a.Esteticist.Apellido,
                ProcedureId = a.ProcedureId,
                ProcedureNombre = a.Procedure.Nombre,
                PatientPackageSessionId = a.PatientPackageSessionId,
                BranchId = a.BranchId,
                FechaInicio = a.FechaInicio,
                FechaFin = a.FechaFin,
                Estado = a.Estado.ToString(),
                Notas = a.Notas,
                WhatsAppReminderSent = a.WhatsAppReminderSent,
                WhatsAppConfirmedAt = a.WhatsAppConfirmedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // ── GET /api/v1/appointments/{id} ───────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var query = _db.Appointments.AsNoTracking().Where(a => a.Id == id);
        query = ApplyRoleScope(query, null);

        var dto = await query
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                PatientId = a.PatientId,
                PatientNombre = a.Patient.Nombre + " " + a.Patient.Apellido,
                EsteticistId = a.EsteticistId,
                EsteticistNombre = a.Esteticist.Nombre + " " + a.Esteticist.Apellido,
                ProcedureId = a.ProcedureId,
                ProcedureNombre = a.Procedure.Nombre,
                PatientPackageSessionId = a.PatientPackageSessionId,
                BranchId = a.BranchId,
                FechaInicio = a.FechaInicio,
                FechaFin = a.FechaFin,
                Estado = a.Estado.ToString(),
                Notas = a.Notas,
                WhatsAppReminderSent = a.WhatsAppReminderSent,
                WhatsAppConfirmedAt = a.WhatsAppConfirmedAt
            })
            .FirstOrDefaultAsync();

        if (dto is null)
            return NotFound(new { error = "Cita no encontrada." });

        return Ok(dto);
    }

    // ── POST /api/v1/appointments ───────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
    {
        var procedure = await _db.Procedures.FindAsync(request.ProcedureId);
        if (procedure is null)
            return BadRequest(new { error = "Procedimiento no encontrado." });

        var patientExists = await _db.Patients.AnyAsync(p => p.Id == request.PatientId);
        if (!patientExists)
            return BadRequest(new { error = "Paciente no encontrado." });

        var esteticistExists = await _db.Users.AnyAsync(u => u.Id == request.EsteticistId);
        if (!esteticistExists)
            return BadRequest(new { error = "Esteticista no encontrado." });

        var branchExists = await _db.Branches.AnyAsync(b => b.Id == request.BranchId);
        if (!branchExists)
            return BadRequest(new { error = "Sede no encontrada." });

        var fechaFin = request.FechaInicio.AddMinutes(procedure.DuracionMinutos);

        // Validar conflicto de horario en el esteticista (citas no canceladas que se solapan)
        var conflict = await _db.Appointments.AnyAsync(a =>
            a.EsteticistId == request.EsteticistId &&
            a.Estado != AppointmentStatus.Cancelada &&
            a.FechaInicio < fechaFin &&
            a.FechaFin > request.FechaInicio);

        if (conflict)
            return Conflict(new { error = "El esteticista ya tiene una cita en ese horario." });

        // Si se asocia a una sesión de paquete, validar que existe y no está consumida
        if (request.PatientPackageSessionId.HasValue)
        {
            var session = await _db.PatientPackageSessions
                .FirstOrDefaultAsync(s => s.Id == request.PatientPackageSessionId.Value);

            if (session is null)
                return BadRequest(new { error = "Sesión de paquete no encontrada." });

            if (session.Estado == SessionStatus.Completada)
                return BadRequest(new { error = "Esa sesión del paquete ya fue completada." });

            if (session.Estado == SessionStatus.Cancelada)
                return BadRequest(new { error = "Esa sesión del paquete está cancelada." });
        }

        var appointment = new Appointment
        {
            PatientId = request.PatientId,
            EsteticistId = request.EsteticistId,
            ProcedureId = request.ProcedureId,
            BranchId = request.BranchId,
            PatientPackageSessionId = request.PatientPackageSessionId,
            FechaInicio = request.FechaInicio,
            FechaFin = fechaFin,
            Estado = AppointmentStatus.Agendada,
            Notas = request.Notas
        };

        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, new { id = appointment.Id });
    }

    // ── PUT /api/v1/appointments/{id}/status ────────────────────────────
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAppointmentStatusRequest request)
    {
        var appointment = await _db.Appointments
            .Include(a => a.PatientPackageSession)
                .ThenInclude(s => s!.PatientPackage)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment is null)
            return NotFound(new { error = "Cita no encontrada." });

        if (GetRole() == "Esteticista" && appointment.EsteticistId != GetUserId())
            return Forbid();

        var previousEstado = appointment.Estado;
        appointment.Estado = request.Estado;
        if (request.Notas is not null) appointment.Notas = request.Notas;

        // Al completar una cita asociada a sesión, marcar la sesión como Completada
        if (request.Estado == AppointmentStatus.Completada &&
            previousEstado != AppointmentStatus.Completada &&
            appointment.PatientPackageSession is not null &&
            appointment.PatientPackageSession.Estado != SessionStatus.Completada)
        {
            var session = appointment.PatientPackageSession;
            session.Estado = SessionStatus.Completada;
            session.FechaCompletada = DateTime.UtcNow;
            if (session.PatientPackage is not null)
            {
                session.PatientPackage.SesionesCompletadas++;
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── DELETE /api/v1/appointments/{id} ────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var appointment = await _db.Appointments.FindAsync(id);
        if (appointment is null)
            return NotFound(new { error = "Cita no encontrada." });

        if (GetRole() == "Esteticista" && appointment.EsteticistId != GetUserId())
            return Forbid();

        if (appointment.Estado != AppointmentStatus.Agendada &&
            appointment.Estado != AppointmentStatus.Confirmada)
        {
            return BadRequest(new { error = "Solo se pueden eliminar citas Agendada o Confirmada." });
        }

        appointment.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers privados ────────────────────────────────────────────────

    private IQueryable<Appointment> ApplyRoleScope(IQueryable<Appointment> query, Guid? esteticistIdFilter)
    {
        var role = GetRole();
        if (role == "Esteticista")
        {
            var userId = GetUserId();
            return query.Where(a => a.EsteticistId == userId);
        }

        // SuperAdmin/Admin pueden filtrar por esteticistId opcional
        if (esteticistIdFilter.HasValue)
            return query.Where(a => a.EsteticistId == esteticistIdFilter.Value);

        return query;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return claim is not null && Guid.TryParse(claim, out var uid) ? uid : Guid.Empty;
    }

    private string? GetRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value
               ?? User.FindFirst("role")?.Value;
    }
}
