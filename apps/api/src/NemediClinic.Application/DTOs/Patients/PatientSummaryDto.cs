namespace NemediClinic.Application.DTOs.Patients;

public class PatientSummaryDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Cedula { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public Guid? ImagenId { get; set; }
    public string? PaqueteActivo { get; set; }
    public DateTime? ProximaCita { get; set; }
}
