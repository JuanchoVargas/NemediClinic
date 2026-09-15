using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Patients;

public class UpdatePatientRequest
{
    [MaxLength(100)]
    public string? Nombre { get; set; }

    [MaxLength(100)]
    public string? Apellido { get; set; }

    [MaxLength(20)]
    public string? Cedula { get; set; }

    [MaxLength(20)]
    public string? Telefono { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public DateOnly? FechaNacimiento { get; set; }

    public string? FotoUrl { get; set; }

    [MaxLength(2000)]
    public string? NotasGenerales { get; set; }

    public bool? IsActive { get; set; }
}
