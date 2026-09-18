using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Application.DTOs.Patients;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "Esteticista")]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;

    public PatientsController(AppDbContext db, AttachmentService attachments)
    {
        _db = db;
        _attachments = attachments;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PagedRequest request)
    {
        var query = _db.Patients.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(p =>
                p.Nombre.ToLower().Contains(search) ||
                p.Apellido.ToLower().Contains(search) ||
                p.Cedula.Contains(search));
        }

        var totalCount = await query.CountAsync();

        var patients = await query
            .OrderBy(p => p.Apellido).ThenBy(p => p.Nombre)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PatientSummaryDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Apellido = p.Apellido,
                Cedula = p.Cedula,
                Telefono = p.Telefono,
                ImagenId = p.ImagenId,
                PaqueteActivo = p.PatientPackages
                    .Where(pp => pp.Estado == PackageStatus.Activo)
                    .Select(pp => pp.Package.Nombre)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(new PagedResponse<PatientSummaryDto>
        {
            Items = patients,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest request)
    {
        var cedulaExists = await _db.Patients.AnyAsync(p => p.Cedula == request.Cedula);
        if (cedulaExists)
            return Conflict(new { error = "Ya existe un paciente con esa cédula en este tenant." });

        var patient = new Patient
        {
            Nombre = request.Nombre,
            Apellido = request.Apellido,
            Cedula = request.Cedula,
            Telefono = request.Telefono,
            Email = request.Email,
            FechaNacimiento = request.FechaNacimiento,
            FotoUrl = request.FotoUrl,
            ImagenId = request.ImagenId,
            NotasGenerales = request.NotasGenerales
        };

        _db.Patients.Add(patient);
        await _attachments.AssignImageAsync(AttachmentEntityType.Patient, patient.Id, request.ImagenId, null);

        // Create empty clinical record automatically
        var clinicalRecord = new ClinicalRecord
        {
            PatientId = patient.Id
        };
        _db.ClinicalRecords.Add(clinicalRecord);

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, new PatientDto
        {
            Id = patient.Id,
            Nombre = patient.Nombre,
            Apellido = patient.Apellido,
            Cedula = patient.Cedula,
            Telefono = patient.Telefono,
            Email = patient.Email,
            FechaNacimiento = patient.FechaNacimiento,
            FotoUrl = patient.FotoUrl,
            ImagenId = patient.ImagenId,
            NotasGenerales = patient.NotasGenerales,
            IsActive = patient.IsActive,
            CreatedAt = patient.CreatedAt
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var patient = await _db.Patients
            .AsNoTracking()
            .Include(p => p.PatientPackages.Where(pp => pp.Estado == PackageStatus.Activo))
                .ThenInclude(pp => pp.Package)
            .Include(p => p.PatientPackages.Where(pp => pp.Estado == PackageStatus.Activo))
                .ThenInclude(pp => pp.Payments)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (patient is null)
            return NotFound(new { error = "Paciente no encontrado." });

        var ahora = DateTime.Now;
        var proximaCita = await _db.Appointments
            .AsNoTracking()
            .Where(a => a.PatientId == id && a.FechaInicio >= ahora
                && (a.Estado == AppointmentStatus.Agendada || a.Estado == AppointmentStatus.Confirmada))
            .OrderBy(a => a.FechaInicio)
            .Select(a => (DateTime?)a.FechaInicio)
            .FirstOrDefaultAsync();

        return Ok(new PatientDto
        {
            ProximaCita = proximaCita,
            Id = patient.Id,
            Nombre = patient.Nombre,
            Apellido = patient.Apellido,
            Cedula = patient.Cedula,
            Telefono = patient.Telefono,
            Email = patient.Email,
            FechaNacimiento = patient.FechaNacimiento,
            FotoUrl = patient.FotoUrl,
            ImagenId = patient.ImagenId,
            NotasGenerales = patient.NotasGenerales,
            IsActive = patient.IsActive,
            CreatedAt = patient.CreatedAt,
            PaquetesActivos = patient.PatientPackages.Select(pp => new PatientPackageSummary
            {
                Id = pp.Id,
                PackageNombre = pp.Package.Nombre,
                Estado = pp.Estado.ToString(),
                SesionesCompletadas = pp.SesionesCompletadas,
                SesionesTotales = pp.Package.SesionesTotales,
                // Dato financiero: solo recepción y dueño (misma regla que /patient-packages)
                PorcentajePagado = User.IsInRole("Esteticista")
                    ? null
                    : PatientPackageService.PaymentSummary(pp.PrecioAcordado, pp.Payments.Sum(x => x.Monto)).Porcentaje
            }).ToList()
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePatientRequest request)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient is null)
            return NotFound(new { error = "Paciente no encontrado." });

        if (request.Cedula is not null && request.Cedula != patient.Cedula)
        {
            var cedulaTaken = await _db.Patients.AnyAsync(p => p.Cedula == request.Cedula && p.Id != id);
            if (cedulaTaken)
                return Conflict(new { error = "Ya existe un paciente con esa cédula." });
            patient.Cedula = request.Cedula;
        }

        if (request.Nombre is not null) patient.Nombre = request.Nombre;
        if (request.Apellido is not null) patient.Apellido = request.Apellido;
        if (request.Telefono is not null) patient.Telefono = request.Telefono;
        if (request.Email is not null) patient.Email = request.Email;
        if (request.FechaNacimiento.HasValue) patient.FechaNacimiento = request.FechaNacimiento;
        if (request.FotoUrl is not null) patient.FotoUrl = request.FotoUrl;
        if (request.ImagenId.HasValue)
        {
            // Quitar la foto se hace con DELETE /files/{id}, que también limpia ImagenId.
            await _attachments.AssignImageAsync(AttachmentEntityType.Patient, patient.Id, request.ImagenId, patient.ImagenId);
            patient.ImagenId = request.ImagenId;
        }
        if (request.NotasGenerales is not null) patient.NotasGenerales = request.NotasGenerales;
        if (request.IsActive.HasValue) patient.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient is null)
            return NotFound(new { error = "Paciente no encontrado." });

        patient.IsDeleted = true;
        patient.IsActive = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
