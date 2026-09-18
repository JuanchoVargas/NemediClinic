using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.ClinicalRecords;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Application.DTOs.Inventory;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Evolución del paciente agrupada por el paquete que pagó, que es como la clínica piensa el
/// tratamiento ("va 3 de 8 del Cuerpo Firme") en vez de una lista plana de notas.
///
/// El vínculo nota → paquete existe porque al crear una nota desde una cita de paquete se guarda
/// PatientPackageSession.ClinicalNoteId. Las notas sin esa sesión (una consulta suelta, una nota
/// escrita a mano) caen en un último grupo "Sesiones sueltas".
///
/// Orden: los paquetes por fecha de inicio descendente (lo más reciente arriba), las sesiones de
/// cada paquete en orden cronológico (así se lee la evolución hacia adelante) y las sueltas al final.
/// </summary>
public class EvolutionService
{
    private const string GrupoSueltas = "Sesiones sueltas";

    private readonly AppDbContext _db;

    public EvolutionService(AppDbContext db) => _db = db;

    /// <summary>
    /// <paramref name="verFinanzas"/> false (esteticista) deja PorcentajePagado en null, igual que
    /// en el resto de la API.
    /// </summary>
    public async Task<EvolutionDto> GetAsync(Guid patientId, bool verFinanzas, CancellationToken ct = default)
    {
        var record = await _db.ClinicalRecords.AsNoTracking()
            .FirstOrDefaultAsync(r => r.PatientId == patientId, ct)
            ?? throw ApiException.NotFound("Historia clínica no encontrada.");

        var notas = await _db.ClinicalNotes.AsNoTracking()
            .Where(n => n.ClinicalRecordId == record.Id)
            .OrderBy(n => n.FechaCreacion)
            .Select(n => new EvolutionSessionDto
            {
                NoteId = n.Id,
                AppointmentId = n.AppointmentId,
                Fecha = n.FechaCreacion,
                Procedimiento = n.Procedimiento,
                Esteticista = n.Esteticist.Nombre + " " + n.Esteticist.Apellido,
                Observaciones = n.Observaciones,
                ZonaTratada = n.ZonaTratada,
                Parametros = n.Parametros,
                IndicacionesPost = n.IndicacionesPost,
                ProximaSesionSugerida = n.ProximaSesionSugerida,
                EvaluacionPaciente = n.EvaluacionPaciente,
                ProductosUsados = n.ProductosUsados
            })
            .ToListAsync(ct);

        if (notas.Count == 0)
            return new EvolutionDto();

        var noteIds = notas.Select(n => n.NoteId).ToList();
        await FillPhotosAsync(notas, noteIds, ct);
        await FillProductsAsync(notas, noteIds, ct);
        await FillAppointmentDataAsync(notas, ct);

        // A qué sesión de paquete pertenece cada nota
        var sesiones = await _db.PatientPackageSessions.AsNoTracking()
            .Where(s => s.ClinicalNoteId != null && noteIds.Contains(s.ClinicalNoteId.Value))
            .Select(s => new { NoteId = s.ClinicalNoteId!.Value, s.Id, s.PatientPackageId, s.Numero })
            .ToListAsync(ct);
        var porNota = sesiones.ToDictionary(s => s.NoteId);

        foreach (var nota in notas)
        {
            if (!porNota.TryGetValue(nota.NoteId, out var sesion)) continue;
            nota.PatientPackageSessionId = sesion.Id;
            nota.NumeroSesion = sesion.Numero;
        }

        var paquetes = await _db.PatientPackages.AsNoTracking()
            .Where(pp => pp.PatientId == patientId)
            .Select(pp => new
            {
                pp.Id,
                pp.PackageNombre,
                pp.Estado,
                pp.SesionesCompletadas,
                pp.SesionesTotales,
                pp.FechaInicio,
                pp.PrecioAcordado,
                Pagado = pp.Payments.Sum(p => p.Monto)
            })
            .ToListAsync(ct);

        var notasPorPaquete = notas
            .Where(n => n.PatientPackageSessionId.HasValue)
            .GroupBy(n => porNota[n.NoteId].PatientPackageId)
            .ToDictionary(g => g.Key, g => g.OrderBy(n => n.NumeroSesion ?? 0).ThenBy(n => n.Fecha).ToList());

        var dto = new EvolutionDto();

        // Solo los paquetes que ya tienen alguna sesión registrada: un paquete recién vendido no
        // aporta nada a la evolución y ensuciaría la pantalla.
        foreach (var paquete in paquetes.OrderByDescending(p => p.FechaInicio))
        {
            if (!notasPorPaquete.TryGetValue(paquete.Id, out var suyas)) continue;
            dto.Grupos.Add(new EvolutionPackageDto
            {
                PatientPackageId = paquete.Id,
                Nombre = paquete.PackageNombre,
                Estado = paquete.Estado.ToString(),
                SesionesCompletadas = paquete.SesionesCompletadas,
                SesionesTotales = paquete.SesionesTotales,
                PorcentajePagado = verFinanzas
                    ? PatientPackageService.PaymentSummary(paquete.PrecioAcordado, paquete.Pagado).Porcentaje
                    : null,
                FechaInicio = paquete.FechaInicio,
                FechaUltimaSesion = suyas.Max(n => n.Fecha),
                Sesiones = suyas
            });
        }

        var sueltas = notas.Where(n => !n.PatientPackageSessionId.HasValue).ToList();
        if (sueltas.Count > 0)
        {
            dto.Grupos.Add(new EvolutionPackageDto
            {
                PatientPackageId = null,
                Nombre = GrupoSueltas,
                SesionesCompletadas = sueltas.Count,
                SesionesTotales = sueltas.Count,
                FechaUltimaSesion = sueltas.Max(n => n.Fecha),
                Sesiones = sueltas
            });
        }

        return dto;
    }

    /// <summary>Fotos por nota, "Antes" primero. Una sola consulta.</summary>
    private async Task FillPhotosAsync(List<EvolutionSessionDto> notas, List<Guid> noteIds, CancellationToken ct)
    {
        var rows = await _db.Attachments.AsNoTracking()
            .Where(a => a.EntityType == AttachmentEntityType.ClinicalNote && a.EntityId != null && noteIds.Contains(a.EntityId.Value))
            .OrderBy(a => a.CreatedAt)
            .Select(a => new { NoteId = a.EntityId!.Value, a.Id, a.Kind, a.FileName })
            .ToListAsync(ct);

        var porNota = rows
            .GroupBy(r => r.NoteId)
            .ToDictionary(g => g.Key, g => g
                .OrderBy(r => r.Kind == AttachmentKind.Antes ? 0 : 1)
                .Select(r => new EvolutionPhotoDto { Id = r.Id, Kind = r.Kind.ToString(), FileName = r.FileName })
                .ToList());

        foreach (var nota in notas)
            nota.Fotos = porNota.GetValueOrDefault(nota.NoteId, []);
    }

    private async Task FillProductsAsync(List<EvolutionSessionDto> notas, List<Guid> noteIds, CancellationToken ct)
    {
        var rows = await _db.ClinicalNoteProducts.AsNoTracking()
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
            .ToListAsync(ct);

        var porNota = rows.GroupBy(r => r.ClinicalNoteId).ToDictionary(g => g.Key, g => g.Select(r => r.Dto).ToList());
        foreach (var nota in notas)
            nota.Productos = porNota.GetValueOrDefault(nota.NoteId, []);
    }

    /// <summary>
    /// Duración real y procedimiento de la cita que originó la nota. Una nota escrita desde la ficha
    /// (sin cita) no tiene duración, pero su procedimiento se resuelve por nombre para que el botón
    /// "Agendar" de la próxima sesión llegue al calendario con el procedimiento ya elegido.
    /// </summary>
    private async Task FillAppointmentDataAsync(List<EvolutionSessionDto> notas, CancellationToken ct)
    {
        var ids = notas.Where(n => n.AppointmentId.HasValue).Select(n => n.AppointmentId!.Value).Distinct().ToList();
        if (ids.Count > 0)
        {
            var citas = await _db.Appointments.AsNoTracking()
                .Where(a => ids.Contains(a.Id))
                .Select(a => new { a.Id, a.ProcedureId, a.FechaInicio, a.FechaFin })
                .ToDictionaryAsync(a => a.Id, ct);

            foreach (var nota in notas)
            {
                if (!nota.AppointmentId.HasValue || !citas.TryGetValue(nota.AppointmentId.Value, out var cita)) continue;
                nota.ProcedureId = cita.ProcedureId;
                nota.DuracionMinutos = (int)(cita.FechaFin - cita.FechaInicio).TotalMinutes;
            }
        }

        var sinProcedimiento = notas.Where(n => n.ProcedureId is null).Select(n => n.Procedimiento).Distinct().ToList();
        if (sinProcedimiento.Count == 0)
            return;

        // Solo los activos: no tiene sentido precargar uno que ya no se puede agendar
        var porNombre = await _db.Procedures.AsNoTracking()
            .Where(p => p.Activo && sinProcedimiento.Contains(p.Nombre))
            .ToDictionaryAsync(p => p.Nombre, p => p.Id, ct);

        foreach (var nota in notas.Where(n => n.ProcedureId is null))
        {
            if (porNombre.TryGetValue(nota.Procedimiento, out var procedureId))
                nota.ProcedureId = procedureId;
        }
    }
}
