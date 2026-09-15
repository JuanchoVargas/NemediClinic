namespace NemediClinic.Application.DTOs.ClinicalRecords;

public class UpdateClinicalRecordRequest
{
    public string? AntecedentesMedicos { get; set; }
    public string? Alergias { get; set; }
    public string? MedicamentosActuales { get; set; }
    public string? ObservacionesGenerales { get; set; }
}
