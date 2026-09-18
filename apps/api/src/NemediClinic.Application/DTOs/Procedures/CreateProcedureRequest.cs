using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Procedures;

public class CreateProcedureRequest
{
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Descripcion { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal PrecioBase { get; set; }

    [Range(1, 480)]
    public int DuracionMinutos { get; set; }

    [Required, MaxLength(100)]
    public string AreaCorporal { get; set; } = string.Empty;

    /// <summary>Id de un Attachment (Kind=Procedimiento) subido antes con POST /files.</summary>
    public Guid? ImagenId { get; set; }

    /// <summary>La cita de este procedimiento no inicia sin un consentimiento informado firmado.</summary>
    public bool RequiereConsentimiento { get; set; }
}
