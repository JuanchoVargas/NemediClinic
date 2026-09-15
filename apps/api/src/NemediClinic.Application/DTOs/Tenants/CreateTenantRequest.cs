using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Tenants;

public class CreateTenantRequest
{
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string NIT { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Telefono { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}
