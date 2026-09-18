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

    /// <summary>Productos gastados en la sesión. Si la cita está Completada, salen del inventario.</summary>
    public List<NemediClinic.Application.DTOs.Inventory.ClinicalNoteProductRequest> Productos { get; set; } = [];

    /// <summary>Ids de Attachments (Kind Antes/Despues) subidos antes con POST /files, sin entityId.</summary>
    [MaxLength(12)]
    public List<Guid> AdjuntoIds { get; set; } = [];
}
