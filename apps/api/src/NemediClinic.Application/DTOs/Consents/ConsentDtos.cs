using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Consents;

public class ConsentTemplateDto
{
    public Guid ProcedureId { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public bool RequiereConsentimiento { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    /// <summary>true si el tenant aún no la editó y se está mostrando la plantilla por defecto del sistema.</summary>
    public bool EsPorDefecto { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class SaveConsentTemplateRequest
{
    [Required, MaxLength(200)] public string Titulo { get; set; } = string.Empty;
    /// <summary>Variables: {{paciente}}, {{cedula}}, {{procedimiento}}, {{fecha}}.</summary>
    [Required, MaxLength(12000)] public string Texto { get; set; } = string.Empty;
}

/// <summary>Texto ya con las variables resueltas, tal como lo va a leer y firmar el paciente.</summary>
public class ConsentPreviewDto
{
    public string Titulo { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public string Paciente { get; set; } = string.Empty;
    public string Cedula { get; set; } = string.Empty;
    public string Procedimiento { get; set; } = string.Empty;
}

public class SignConsentRequest
{
    [Required] public Guid PatientId { get; set; }
    [Required] public Guid ProcedureId { get; set; }
    public Guid? AppointmentId { get; set; }
    /// <summary>Esteticista que acompaña la firma. Por defecto: la de la cita o el usuario en sesión.</summary>
    public Guid? EsteticistId { get; set; }
    /// <summary>Firma como data URL PNG ("data:image/png;base64,...") tal como la entrega signature_pad.</summary>
    [Required] public string FirmaPng { get; set; } = string.Empty;
}

public class ConsentDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProcedureId { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public Guid? AppointmentId { get; set; }
    public string Esteticista { get; set; } = string.Empty;
    public DateTime FechaFirma { get; set; }
    public string Titulo { get; set; } = string.Empty;
    /// <summary>PDF firmado: se abre con su URL firmada (GET /files/{id}/url).</summary>
    public Guid AttachmentId { get; set; }
}
