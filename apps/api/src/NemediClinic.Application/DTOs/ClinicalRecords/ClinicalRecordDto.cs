namespace NemediClinic.Application.DTOs.ClinicalRecords;

public class ClinicalRecordDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? AntecedentesMedicos { get; set; }
    public string? Alergias { get; set; }
    public string? MedicamentosActuales { get; set; }
    public string? ObservacionesGenerales { get; set; }
    public DateTime UpdatedAt { get; set; }
}
