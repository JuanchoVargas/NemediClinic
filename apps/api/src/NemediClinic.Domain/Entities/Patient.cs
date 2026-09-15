namespace NemediClinic.Domain.Entities;

public class Patient : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Cedula { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateOnly? FechaNacimiento { get; set; }
    public string? FotoUrl { get; set; }
    public string? NotasGenerales { get; set; }
    public bool IsActive { get; set; } = true;

    public ClinicalRecord? ClinicalRecord { get; set; }
    public ICollection<PatientPackage> PatientPackages { get; set; } = [];
}
