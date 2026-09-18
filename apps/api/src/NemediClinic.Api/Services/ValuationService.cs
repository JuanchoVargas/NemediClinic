using System.Globalization;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Application.DTOs.Valuations;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Valoraciones: diagnóstico + cotización a un paciente o a un prospecto (sin cédula).
/// "Convertir" cierra la venta: crea el paciente si no existía y le asigna el paquete cotizado,
/// todo en un solo SaveChanges.
/// </summary>
public class ValuationService
{
    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;
    private readonly PatientPackageService _packages;

    public ValuationService(AppDbContext db, AttachmentService attachments, PatientPackageService packages)
    {
        _db = db;
        _attachments = attachments;
        _packages = packages;
    }

    public async Task<List<ValuationDto>> ListAsync(ValuationEstado? estado, DateOnly? desde, DateOnly? hasta, string? search, CancellationToken ct)
    {
        var query = BaseQuery();
        if (estado.HasValue) query = query.Where(v => v.Estado == estado.Value);
        if (desde.HasValue) query = query.Where(v => v.Fecha >= desde.Value.ToDateTime(TimeOnly.MinValue));
        if (hasta.HasValue) query = query.Where(v => v.Fecha < hasta.Value.ToDateTime(TimeOnly.MinValue).AddDays(1));
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(v =>
                (v.ProspectoNombre != null && v.ProspectoNombre.Contains(search)) ||
                (v.Patient != null && (v.Patient.Nombre.Contains(search) || v.Patient.Apellido.Contains(search) || v.Patient.Cedula.Contains(search))));
        }

        var rows = await query.OrderByDescending(v => v.Fecha).Take(200).ToListAsync(ct);
        var fotos = await LoadPhotosAsync(rows.Select(v => v.Id).ToList(), ct);
        return rows.Select(v => ToDto(v, fotos.GetValueOrDefault(v.Id, []))).ToList();
    }

    public async Task<ValuationDto> GetAsync(Guid id, CancellationToken ct)
    {
        var valuation = await BaseQuery().FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw ApiException.NotFound("Valoración no encontrada.");
        var fotos = await LoadPhotosAsync([id], ct);
        return ToDto(valuation, fotos.GetValueOrDefault(id, []));
    }

    public async Task<ValuationDto> CreateAsync(SaveValuationRequest request, CancellationToken ct)
    {
        var valuation = new Valuation();
        await ApplyAsync(valuation, request, ct);
        _db.Valuations.Add(valuation);
        await _attachments.ClaimAsync(request.AdjuntoIds, AttachmentEntityType.Valuation, valuation.Id, ct);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(valuation.Id, ct);
    }

    public async Task<ValuationDto> UpdateAsync(Guid id, SaveValuationRequest request, CancellationToken ct)
    {
        var valuation = await _db.Valuations.Include(v => v.Procedures).FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw ApiException.NotFound("Valoración no encontrada.");
        if (valuation.Estado == ValuationEstado.Acepto)
            throw ApiException.Conflict("Una valoración aceptada ya no se puede editar.");

        await ApplyAsync(valuation, request, ct);
        await _attachments.ClaimAsync(request.AdjuntoIds, AttachmentEntityType.Valuation, valuation.Id, ct);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var valuation = await _db.Valuations.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw ApiException.NotFound("Valoración no encontrada.");
        valuation.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ValuationDto> RejectAsync(Guid id, string? motivo, CancellationToken ct)
    {
        var valuation = await _db.Valuations.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw ApiException.NotFound("Valoración no encontrada.");
        if (valuation.Estado == ValuationEstado.Acepto)
            throw ApiException.Conflict("La valoración ya fue aceptada y convertida.");

        valuation.Estado = ValuationEstado.Rechazo;
        valuation.MotivoRechazo = string.IsNullOrWhiteSpace(motivo) ? null : motivo.Trim();
        valuation.FechaCierre = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>Aceptó: crea el paciente si era prospecto y asigna el paquete (el sugerido o el que venga en el request).</summary>
    public async Task<ConvertValuationResponse> ConvertAsync(Guid id, ConvertValuationRequest request, CancellationToken ct)
    {
        var valuation = await _db.Valuations.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw ApiException.NotFound("Valoración no encontrada.");
        if (valuation.Estado == ValuationEstado.Acepto)
            throw ApiException.Conflict("Esta valoración ya fue convertida.");

        var created = false;
        if (valuation.PatientId is null)
        {
            var cedula = request.Cedula?.Trim();
            if (string.IsNullOrWhiteSpace(cedula))
                throw ApiException.BadRequest("Para convertir a un prospecto en paciente se necesita su cédula.");
            if (await _db.Patients.AnyAsync(p => p.Cedula == cedula, ct))
                throw ApiException.Conflict($"Ya existe un paciente con la cédula {cedula}. Edita la valoración y elígelo como paciente.");

            // El prospecto se guardó con el nombre completo en un solo campo
            var parts = (valuation.ProspectoNombre ?? string.Empty).Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var patient = new Patient
            {
                Nombre = string.IsNullOrWhiteSpace(request.Nombre) ? parts.ElementAtOrDefault(0) ?? "Paciente" : request.Nombre.Trim(),
                Apellido = string.IsNullOrWhiteSpace(request.Apellido) ? parts.ElementAtOrDefault(1) ?? string.Empty : request.Apellido.Trim(),
                Cedula = cedula,
                Telefono = valuation.ProspectoTelefono ?? string.Empty,
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim()
            };
            _db.Patients.Add(patient);
            _db.ClinicalRecords.Add(new ClinicalRecord { PatientId = patient.Id, ObservacionesGenerales = $"Valoración inicial: {valuation.Diagnostico}" });
            valuation.PatientId = patient.Id;
            created = true;
        }

        var packageId = request.PackageId ?? valuation.PackageId;
        if (packageId.HasValue)
        {
            var assignment = await _packages.AssignAsync(
                valuation.PatientId.Value, packageId.Value,
                request.PrecioAcordado ?? valuation.PrecioCotizado,
                request.FechaInicio ?? DateOnly.FromDateTime(DateTime.Now), ct, patientIsNew: created);
            valuation.PatientPackageId = assignment.Id;
            valuation.PackageId = packageId;
        }

        valuation.Estado = ValuationEstado.Acepto;
        valuation.MotivoRechazo = null;
        valuation.FechaCierre = DateTime.Now;
        await _db.SaveChangesAsync(ct);

        return new ConvertValuationResponse
        {
            PatientId = valuation.PatientId.Value,
            PacienteCreado = created,
            PatientPackageId = valuation.PatientPackageId
        };
    }

    public async Task<ValuationStatsDto> GetStatsAsync(string? mes, CancellationToken ct)
    {
        var month = string.IsNullOrWhiteSpace(mes) ? DateTime.Now.ToString("yyyy-MM", CultureInfo.InvariantCulture) : mes;
        if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var inicio))
            throw ApiException.BadRequest("El parámetro mes debe tener formato YYYY-MM.");

        var fin = inicio.AddMonths(1);
        var rows = await _db.Valuations.AsNoTracking()
            .Where(v => v.Fecha >= inicio && v.Fecha < fin)
            .Select(v => new { v.Estado, v.PrecioCotizado })
            .ToListAsync(ct);

        var aceptadas = rows.Where(r => r.Estado == ValuationEstado.Acepto).ToList();
        return new ValuationStatsDto
        {
            Mes = month,
            Total = rows.Count,
            Pendientes = rows.Count(r => r.Estado == ValuationEstado.Pendiente),
            Aceptadas = aceptadas.Count,
            Rechazadas = rows.Count(r => r.Estado == ValuationEstado.Rechazo),
            TasaConversion = rows.Count == 0 ? 0m : Math.Round((decimal)aceptadas.Count / rows.Count, 4),
            ValorCotizado = rows.Sum(r => r.PrecioCotizado),
            ValorAceptado = aceptadas.Sum(r => r.PrecioCotizado)
        };
    }

    // ── Helpers ─────────────────────────────────────────────────────
    private IQueryable<Valuation> BaseQuery() => _db.Valuations.AsNoTracking()
        .Include(v => v.Patient)
        .Include(v => v.Esteticist)
        .Include(v => v.Package)
        .Include(v => v.Procedures).ThenInclude(p => p.Procedure);

    private async Task ApplyAsync(Valuation valuation, SaveValuationRequest request, CancellationToken ct)
    {
        if (request.PatientId.HasValue)
        {
            if (!await _db.Patients.AnyAsync(p => p.Id == request.PatientId.Value, ct))
                throw ApiException.BadRequest("Paciente no encontrado.");
            valuation.PatientId = request.PatientId;
            valuation.ProspectoNombre = null;
            valuation.ProspectoTelefono = null;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.ProspectoNombre) || string.IsNullOrWhiteSpace(request.ProspectoTelefono))
                throw ApiException.BadRequest("Elige un paciente o escribe el nombre y el teléfono del prospecto.");
            valuation.PatientId = null;
            valuation.ProspectoNombre = request.ProspectoNombre.Trim();
            valuation.ProspectoTelefono = request.ProspectoTelefono.Trim();
        }

        if (!await _db.Users.AnyAsync(u => u.Id == request.EsteticistId, ct))
            throw ApiException.BadRequest("Esteticista no encontrado.");
        if (request.PackageId.HasValue && !await _db.Packages.AnyAsync(p => p.Id == request.PackageId.Value, ct))
            throw ApiException.BadRequest("Paquete no encontrado.");

        var procedureIds = request.ProcedureIds.Distinct().ToList();
        if (procedureIds.Count > 0 && await _db.Procedures.CountAsync(p => procedureIds.Contains(p.Id), ct) != procedureIds.Count)
            throw ApiException.BadRequest("Alguno de los procedimientos no existe.");

        valuation.EsteticistId = request.EsteticistId;
        valuation.Fecha = request.Fecha ?? valuation.Fecha;
        valuation.Diagnostico = request.Diagnostico.Trim();
        valuation.TratamientoSugerido = string.IsNullOrWhiteSpace(request.TratamientoSugerido) ? null : request.TratamientoSugerido.Trim();
        valuation.PackageId = request.PackageId;
        valuation.PrecioCotizado = request.PrecioCotizado;

        // Diferencia, no "borrar todo y volver a crear": EF no admite quitar y agregar la misma clave compuesta
        foreach (var removed in valuation.Procedures.Where(p => !procedureIds.Contains(p.ProcedureId)).ToList())
            valuation.Procedures.Remove(removed);
        foreach (var procedureId in procedureIds.Where(pid => valuation.Procedures.All(p => p.ProcedureId != pid)))
            valuation.Procedures.Add(new ValuationProcedure { ValuationId = valuation.Id, ProcedureId = procedureId });
    }

    private async Task<Dictionary<Guid, List<EvolutionPhotoDto>>> LoadPhotosAsync(List<Guid> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return [];
        var rows = await _db.Attachments.AsNoTracking()
            .Where(a => a.EntityType == AttachmentEntityType.Valuation && a.EntityId != null && ids.Contains(a.EntityId.Value))
            .OrderBy(a => a.CreatedAt)
            .Select(a => new { ValuationId = a.EntityId!.Value, a.Id, a.Kind, a.FileName })
            .ToListAsync(ct);
        return rows.GroupBy(r => r.ValuationId).ToDictionary(
            g => g.Key,
            g => g.Select(r => new EvolutionPhotoDto { Id = r.Id, Kind = r.Kind.ToString(), FileName = r.FileName }).ToList());
    }

    private static ValuationDto ToDto(Valuation v, List<EvolutionPhotoDto> fotos) => new()
    {
        Id = v.Id,
        PatientId = v.PatientId,
        Nombre = v.Patient is not null ? $"{v.Patient.Nombre} {v.Patient.Apellido}".Trim() : v.ProspectoNombre ?? string.Empty,
        Telefono = v.Patient?.Telefono ?? v.ProspectoTelefono ?? string.Empty,
        EsProspecto = v.PatientId is null,
        EsteticistId = v.EsteticistId,
        Esteticista = $"{v.Esteticist.Nombre} {v.Esteticist.Apellido}".Trim(),
        Fecha = v.Fecha,
        Diagnostico = v.Diagnostico,
        TratamientoSugerido = v.TratamientoSugerido,
        PackageId = v.PackageId,
        Paquete = v.Package?.Nombre,
        Procedimientos = v.Procedures.Select(p => new ValuationProcedureDto { Id = p.ProcedureId, Nombre = p.Procedure.Nombre }).ToList(),
        PrecioCotizado = v.PrecioCotizado,
        Estado = v.Estado.ToString(),
        MotivoRechazo = v.MotivoRechazo,
        FechaCierre = v.FechaCierre,
        PatientPackageId = v.PatientPackageId,
        Fotos = fotos
    };
}
