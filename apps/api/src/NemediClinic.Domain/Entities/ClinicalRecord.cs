namespace NemediClinic.Domain.Entities;

public class ClinicalRecord : BaseEntity
{
    public Guid PatientId { get; set; }
    public string? AntecedentesMedicos { get; set; }
    public string? Alergias { get; set; }
    public string? MedicamentosActuales { get; set; }
    public string? ObservacionesGenerales { get; set; }

    public Patient Patient { get; set; } = null!;
    public ICollection<ClinicalNote> ClinicalNotes { get; set; } = [];
}
