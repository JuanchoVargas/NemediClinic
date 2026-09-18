using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.ClinicalRecords;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Application.DTOs.Inventory;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/patients/{patientId:guid}/clinical-record")]
[Authorize(Policy = "Esteticista")]
public class ClinicalRecordsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;
    private readonly CabinConsumptionService _consumption;
    private readonly EvolutionService _evolution;

    public ClinicalRecordsController(AppDbContext db, AttachmentService attachments, CabinConsumptionService consumption, EvolutionService evolution)
    {
        _db = db;
        _attachments = attachments;
        _consumption = consumption;
        _evolution = evolution;
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
                ZonaTratada = n.ZonaTratada,
                Parametros = n.Parametros,
                IndicacionesPost = n.IndicacionesPost,
                ProximaSesionSugerida = n.ProximaSesionSugerida,
                EvaluacionPaciente = n.EvaluacionPaciente,
                ProductosUsados = n.ProductosUsados,
                FechaCreacion = n.FechaCreacion
            })
            .ToListAsync();

        var noteIds = notes.Select(n => n.Id).ToList();
        var fotos = await LoadPhotosAsync(noteIds);
        var productos = await LoadProductsAsync(noteIds);
        foreach (var note in notes)
        {
            note.Fotos = fotos.GetValueOrDefault(note.Id, []);
            note.Productos = productos.GetValueOrDefault(note.Id, []);
        }

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
            ZonaTratada = Limpio(request.ZonaTratada),
            Parametros = Limpio(request.Parametros),
            IndicacionesPost = Limpio(request.IndicacionesPost),
            ProximaSesionSugerida = request.ProximaSesionSugerida,
            EvaluacionPaciente = request.EvaluacionPaciente,
            FechaCreacion = DateTime.Now
        };

        _db.ClinicalNotes.Add(note);
        // Consumo de cabina: enlaza los productos y, si la cita ya está Completada, los saca del stock
        var alertas = await _consumption.ApplyAsync(note, request.Productos, patientId, GetUserId());
        // Las fotos se subieron antes como pendientes; la nota las reclama en el mismo SaveChanges.
        await _attachments.ClaimForNoteAsync(request.AdjuntoIds, note.Id);

        // Nota creada desde una cita de paquete: la sesión queda apuntando a su nota
        if (request.AppointmentId.HasValue)
        {
            var session = await _db.Appointments
                .Where(a => a.Id == request.AppointmentId.Value && a.PatientId == patientId)
                .Select(a => a.PatientPackageSession)
                .FirstOrDefaultAsync();
            if (session is not null && session.ClinicalNoteId is null)
                session.ClinicalNoteId = note.Id;
        }

        await _db.SaveChangesAsync();

        var fotos = await LoadPhotosAsync([note.Id]);
        var productos = await LoadProductsAsync([note.Id]);

        return Created($"api/v1/patients/{patientId}/clinical-record/notes", new CreateClinicalNoteResponse
        {
            Nota = new ClinicalNoteDto
            {
                Id = note.Id,
                AppointmentId = note.AppointmentId,
                EsteticistId = note.EsteticistId,
                Procedimiento = note.Procedimiento,
                Observaciones = note.Observaciones,
                ZonaTratada = note.ZonaTratada,
                Parametros = note.Parametros,
                IndicacionesPost = note.IndicacionesPost,
                ProximaSesionSugerida = note.ProximaSesionSugerida,
                EvaluacionPaciente = note.EvaluacionPaciente,
                Productos = productos.GetValueOrDefault(note.Id, []),
                Fotos = fotos.GetValueOrDefault(note.Id, []),
                FechaCreacion = note.FechaCreacion
            },
            // La web avisa en el momento: "la mascarilla quedó bajo el mínimo"
            AlertasStock = alertas
        });
    }

    /// <summary>
    /// Evolución del paciente: sus sesiones (notas clínicas) en orden cronológico, cada una con
    /// sus fotos Antes/Después. Las fotos van como ids: la web pide la URL firmada de cada una.
    /// </summary>
    /// <summary>Evolución agrupada por el paquete que pagó el paciente (ver EvolutionService).</summary>
    [HttpGet("/api/v1/patients/{patientId:guid}/evolution")]
    public async Task<ActionResult<EvolutionDto>> GetEvolution(Guid patientId, CancellationToken ct) =>
        Ok(await _evolution.GetAsync(patientId, verFinanzas: !User.IsInRole("Esteticista"), ct));

    /// <summary>Historial de consumo de cabina del paciente: qué producto se gastó en cada sesión.</summary>
    [HttpGet("~/api/v1/patients/{patientId:guid}/consumption")]
    public async Task<ActionResult<List<PatientConsumptionDto>>> GetConsumption(Guid patientId, CancellationToken ct)
    {
        if (!await _db.Patients.AnyAsync(p => p.Id == patientId, ct))
            return NotFound(new { error = "Paciente no encontrado." });

        return Ok(await _consumption.GetByPatientAsync(patientId, ct));
    }

    /// <summary>Consumo de cabina por nota. Una sola consulta para todas las notas.</summary>
    private async Task<Dictionary<Guid, List<ClinicalNoteProductDto>>> LoadProductsAsync(List<Guid> noteIds)
    {
        if (noteIds.Count == 0)
            return [];

        var rows = await _db.ClinicalNoteProducts
            .AsNoTracking()
            .Where(cnp => noteIds.Contains(cnp.ClinicalNoteId))
            .OrderBy(cnp => cnp.Product.Nombre)
            .Select(cnp => new
            {
                cnp.ClinicalNoteId,
                Dto = new ClinicalNoteProductDto
                {
                    ProductId = cnp.ProductId,
                    Nombre = cnp.Product.Nombre,
                    UnidadMedida = cnp.Product.UnidadMedida,
                    Cantidad = cnp.Cantidad
                }
            })
            .ToListAsync();

        return rows.GroupBy(r => r.ClinicalNoteId).ToDictionary(g => g.Key, g => g.Select(r => r.Dto).ToList());
    }

    /// <summary>Un campo opcional en blanco se guarda como null, no como cadena vacía.</summary>
    private static string? Limpio(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;

    /// <summary>Fotos por nota, "Antes" primero. Una sola consulta para todas las notas.</summary>
    private async Task<Dictionary<Guid, List<EvolutionPhotoDto>>> LoadPhotosAsync(List<Guid> noteIds)
    {
        if (noteIds.Count == 0)
            return [];

        var rows = await _db.Attachments
            .AsNoTracking()
            .Where(a => a.EntityType == AttachmentEntityType.ClinicalNote && a.EntityId != null && noteIds.Contains(a.EntityId.Value))
            .OrderBy(a => a.CreatedAt)
            .Select(a => new { NoteId = a.EntityId!.Value, a.Id, a.Kind, a.FileName })
            .ToListAsync();

        return rows
            .GroupBy(r => r.NoteId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(r => r.Kind == AttachmentKind.Antes ? 0 : 1)
                    .Select(r => new EvolutionPhotoDto { Id = r.Id, Kind = r.Kind.ToString(), FileName = r.FileName })
                    .ToList());
    }
}
