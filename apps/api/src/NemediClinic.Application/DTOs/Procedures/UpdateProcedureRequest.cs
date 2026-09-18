using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Procedures;

public class UpdateProcedureRequest
{
    [MaxLength(200)]
    public string? Nombre { get; set; }

    [MaxLength(1000)]
    public string? Descripcion { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PrecioBase { get; set; }

    [Range(1, 480)]
    public int? DuracionMinutos { get; set; }

    [MaxLength(100)]
    public string? AreaCorporal { get; set; }

    public bool? Activo { get; set; }

    /// <summary>Id de un Attachment (Kind=Procedimiento) subido antes con POST /files.</summary>
    public Guid? ImagenId { get; set; }

    /// <summary>La cita de este procedimiento no inicia sin un consentimiento informado firmado.</summary>
    public bool? RequiereConsentimiento { get; set; }
}
