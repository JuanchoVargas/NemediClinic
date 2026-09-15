using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Auth;

public class SeedRequest
{
    [Required, MaxLength(200)]
    public string TenantNombre { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string TenantNit { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string TenantEmail { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string AdminNombre { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string AdminApellido { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string AdminEmail { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string AdminPassword { get; set; } = string.Empty;
}
