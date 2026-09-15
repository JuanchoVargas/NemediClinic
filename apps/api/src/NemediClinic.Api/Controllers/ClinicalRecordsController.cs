using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.ClinicalRecords;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/patients/{patientId:guid}/clinical-record")]
[Authorize(Policy = "Esteticista")]
public class ClinicalRecordsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClinicalRecordsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid patientId)
    {
        var record = await _db.ClinicalRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.PatientId == patientId);

        if (record is null)
            return NotFound(new { error = "Historia clínica no encontrada." });

        return Ok(new ClinicalRecordDto
        {
            Id = record.Id,
            PatientId = record.PatientId,
            AntecedentesMedicos = record.AntecedentesMedicos,
            Alergias = record.Alergias,
            MedicamentosActuales = record.MedicamentosActuales,
            ObservacionesGenerales = record.ObservacionesGenerales,
            UpdatedAt = record.UpdatedAt
        });
    }

    [HttpPut]
    public async Task<IActionResult> Update(Guid patientId, [FromBody] UpdateClinicalRecordRequest request)
    {
        var record = await _db.ClinicalRecords
            .FirstOrDefaultAsync(r => r.PatientId == patientId);

        if (record is null)
            return NotFound(new { error = "Historia clínica no encontrada." });

        if (request.AntecedentesMedicos is not null) record.AntecedentesMedicos = request.AntecedentesMedicos;
        if (request.Alergias is not null) record.Alergias = request.Alergias;
        if (request.MedicamentosActuales is not null) record.MedicamentosActuales = request.MedicamentosActuales;
        if (request.ObservacionesGenerales is not null) record.ObservacionesGenerales = request.ObservacionesGenerales;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("notes")]
    public async Task<IActionResult> GetNotes(Guid patientId, [FromQuery] PagedRequest request)
    {
        var record = await _db.ClinicalRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.PatientId == patientId);

        if (record is null)
            return NotFound(new { error = "Historia clínica no encontrada." });

        var query = _db.ClinicalNotes
            .AsNoTracking()
            .Where(n => n.ClinicalRecordId == record.Id);

        var totalCount = await query.CountAsync();

        var notes = await query
            .OrderByDescending(n => n.FechaCreacion)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => new ClinicalNoteDto
            {
                Id = n.Id,
                AppointmentId = n.AppointmentId,
                EsteticistId = n.EsteticistId,
                EsteticistNombre = n.Esteticist.Nombre + " " + n.Esteticist.Apellido,
                Procedimiento = n.Procedimiento,
                Observaciones = n.Observaciones,
                ProductosUsados = n.ProductosUsados,
                FotoEvolucionUrl = n.FotoEvolucionUrl,
                FechaCreacion = n.FechaCreacion
            })
            .ToListAsync();

        return Ok(new PagedResponse<ClinicalNoteDto>
        {
            Items = notes,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote(Guid patientId, [FromBody] CreateClinicalNoteRequest request)
    {
        var record = await _db.ClinicalRecords
            .FirstOrDefaultAsync(r => r.PatientId == patientId);

        if (record is null)
            return NotFound(new { error = "Historia clínica no encontrada." });

        var esteticistExists = await _db.Users.AnyAsync(u => u.Id == request.EsteticistId);
        if (!esteticistExists)
            return BadRequest(new { error = "Esteticista no encontrado." });

        var note = new ClinicalNote
        {
            ClinicalRecordId = record.Id,
            AppointmentId = request.AppointmentId,
            EsteticistId = request.EsteticistId,
            Procedimiento = request.Procedimiento,
            Observaciones = request.Observaciones,
            ProductosUsados = request.ProductosUsados,
            FotoEvolucionUrl = request.FotoEvolucionUrl,
            FechaCreacion = DateTime.UtcNow
        };

        _db.ClinicalNotes.Add(note);
        await _db.SaveChangesAsync();

        return Created($"api/v1/patients/{patientId}/clinical-record/notes", new ClinicalNoteDto
        {
            Id = note.Id,
            AppointmentId = note.AppointmentId,
            EsteticistId = note.EsteticistId,
            Procedimiento = note.Procedimiento,
            Observaciones = note.Observaciones,
            ProductosUsados = note.ProductosUsados,
            FotoEvolucionUrl = note.FotoEvolucionUrl,
            FechaCreacion = note.FechaCreacion
        });
    }
}
