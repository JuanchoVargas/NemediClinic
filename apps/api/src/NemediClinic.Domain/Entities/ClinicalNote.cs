namespace NemediClinic.Domain.Entities;

/// <summary>Las fotos de la sesión son Attachments (EntityType=ClinicalNote, Kind Antes/Despues), no una URL.</summary>
public class ClinicalNote : BaseEntity
{
    public Guid ClinicalRecordId { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid EsteticistId { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    /// <summary>Texto libre heredado: solo lo tienen las notas anteriores al consumo de cabina.</summary>
    public string? ProductosUsados { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public ClinicalRecord ClinicalRecord { get; set; } = null!;
    public User Esteticist { get; set; } = null!;
    /// <summary>Consumo de cabina de la sesión; descuenta inventario al guardar la nota.</summary>
    public ICollection<ClinicalNoteProduct> Productos { get; set; } = [];
}
