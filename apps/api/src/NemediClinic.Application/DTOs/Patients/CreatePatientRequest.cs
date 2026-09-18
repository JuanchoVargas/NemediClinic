using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Patients;

public class CreatePatientRequest
{
    [Required, MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Apellido { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Cedula { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Telefono { get; set; } = string.Empty;

    [EmailAddress]
    public string? Email { get; set; }

    public DateOnly? FechaNacimiento { get; set; }

    public string? FotoUrl { get; set; }

    /// <summary>Id de un Attachment (Kind=Perfil) subido antes con POST /files.</summary>
    public Guid? ImagenId { get; set; }

    [MaxLength(2000)]
    public string? NotasGenerales { get; set; }
}
