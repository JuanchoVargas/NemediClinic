namespace NemediClinic.Domain.Entities;

public class ClinicalNote : BaseEntity
{
    public Guid ClinicalRecordId { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid EsteticistId { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    public string? ProductosUsados { get; set; }
    public string? FotoEvolucionUrl { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public ClinicalRecord ClinicalRecord { get; set; } = null!;
    public User Esteticist { get; set; } = null!;
}
