namespace NemediClinic.Domain.Entities;

/// <summary>
/// Plantilla de consentimiento informado de un procedimiento, editable por cada tenant.
/// Variables: {{paciente}}, {{cedula}}, {{procedimiento}}, {{fecha}}.
/// </summary>
public class ConsentTemplate : BaseEntity
{
    public Guid ProcedureId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;

    public Procedure Procedure { get; set; } = null!;
}

/// <summary>
/// Consentimiento firmado. TextoFirmado es la foto del texto ya con las variables resueltas: lo que
/// la persona leyó y firmó, aunque después cambie la plantilla. El PDF es un Attachment
/// (EntityType = Patient, Kind = Consentimiento).
/// </summary>
public class Consent : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid ProcedureId { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid EsteticistId { get; set; }
    public DateTime FechaFirma { get; set; } = DateTime.Now;
    public string Titulo { get; set; } = string.Empty;
    public string TextoFirmado { get; set; } = string.Empty;
    public string FirmanteNombre { get; set; } = string.Empty;
    public string FirmanteCedula { get; set; } = string.Empty;
    public Guid AttachmentId { get; set; }

    public Patient Patient { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
    public User Esteticist { get; set; } = null!;
}
