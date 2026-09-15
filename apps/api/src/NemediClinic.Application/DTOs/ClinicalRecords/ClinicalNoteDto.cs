namespace NemediClinic.Application.DTOs.ClinicalRecords;

public class ClinicalNoteDto
{
    public Guid Id { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid EsteticistId { get; set; }
    public string EsteticistNombre { get; set; } = string.Empty;
    public string Procedimiento { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    public string? ProductosUsados { get; set; }
    public string? FotoEvolucionUrl { get; set; }
    public DateTime FechaCreacion { get; set; }
}
