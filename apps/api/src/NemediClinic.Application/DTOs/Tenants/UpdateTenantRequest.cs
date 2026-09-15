using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Tenants;

public class UpdateTenantRequest
{
    [MaxLength(200)]
    public string? Nombre { get; set; }

    [MaxLength(20)]
    public string? NIT { get; set; }

    [MaxLength(20)]
    public string? Telefono { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public string? Logo { get; set; }

    public bool? IsActive { get; set; }
}
