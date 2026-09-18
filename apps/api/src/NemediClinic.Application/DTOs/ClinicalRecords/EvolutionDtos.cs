using NemediClinic.Application.DTOs.Files;
using NemediClinic.Application.DTOs.Inventory;

namespace NemediClinic.Application.DTOs.ClinicalRecords;

/// <summary>
/// Respuesta de GET /api/v1/patients/{id}/evolution: la evolución del paciente agrupada por el
/// paquete que pagó, que es como la clínica piensa el tratamiento ("va 3 de 8 del Cuerpo Firme").
/// Las notas que no vienen de una sesión de paquete caen en un grupo final sin PatientPackageId.
/// </summary>
public class EvolutionDto
{
    public List<EvolutionPackageDto> Grupos { get; set; } = [];
}

public class EvolutionPackageDto
{
    /// <summary>Null en el grupo "Sesiones sueltas".</summary>
    public Guid? PatientPackageId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Activo / Pausado / Completado / Vencido. Vacío en las sesiones sueltas.</summary>
    public string Estado { get; set; } = string.Empty;
    public int SesionesCompletadas { get; set; }
    public int SesionesTotales { get; set; }
    /// <summary>0–100. Null en las sesiones sueltas y para la esteticista, que no ve dinero.</summary>
    public int? PorcentajePagado { get; set; }
    public DateOnly? FechaInicio { get; set; }
    /// <summary>Fecha de la última sesión registrada del grupo.</summary>
    public DateTime? FechaUltimaSesion { get; set; }
    public List<EvolutionSessionDto> Sesiones { get; set; } = [];
}

public class EvolutionSessionDto
{
    public Guid NoteId { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid? PatientPackageSessionId { get; set; }
    /// <summary>Número de la sesión dentro de su paquete; null en las sueltas.</summary>
    public int? NumeroSesion { get; set; }
    public DateTime Fecha { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public Guid? ProcedureId { get; set; }
    public string Esteticista { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;

    public string? ZonaTratada { get; set; }
    public string? Parametros { get; set; }
    public string? IndicacionesPost { get; set; }
    public DateOnly? ProximaSesionSugerida { get; set; }
    public int? EvaluacionPaciente { get; set; }
    /// <summary>Minutos reales de la cita (fin − inicio). Null si la nota no vino de una cita.</summary>
    public int? DuracionMinutos { get; set; }

    /// <summary>Texto libre heredado (notas anteriores al consumo de cabina).</summary>
    public string? ProductosUsados { get; set; }
    /// <summary>Consumo de cabina de la sesión.</summary>
    public List<ClinicalNoteProductDto> Productos { get; set; } = [];
    public List<EvolutionPhotoDto> Fotos { get; set; } = [];
}
