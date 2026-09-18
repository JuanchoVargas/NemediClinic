using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.ClinicalRecords;

public class CreateClinicalNoteRequest
{
    public Guid? AppointmentId { get; set; }

    [Required]
    public Guid EsteticistId { get; set; }

    [Required, MaxLength(200)]
    public string Procedimiento { get; set; } = string.Empty;

    [Required, MaxLength(4000)]
    public string Observaciones { get; set; } = string.Empty;

    // ── Detalle de la sesión: todo opcional ──
    [MaxLength(150)]
    public string? ZonaTratada { get; set; }

    /// <summary>Intensidad, disparos, tiempo por zona… en texto libre.</summary>
    [MaxLength(300)]
    public string? Parametros { get; set; }

    [MaxLength(1000)]
    public string? IndicacionesPost { get; set; }

    public DateOnly? ProximaSesionSugerida { get; set; }

    [Range(1, 5)]
    public int? EvaluacionPaciente { get; set; }

    /// <summary>Productos gastados en la sesión. Si la cita está Completada, salen del inventario.</summary>
    public List<NemediClinic.Application.DTOs.Inventory.ClinicalNoteProductRequest> Productos { get; set; } = [];

    /// <summary>Ids de Attachments (Kind Antes/Despues) subidos antes con POST /files, sin entityId.</summary>
    [MaxLength(12)]
    public List<Guid> AdjuntoIds { get; set; } = [];
}
