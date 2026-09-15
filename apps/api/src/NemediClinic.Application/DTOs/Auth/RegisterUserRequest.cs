using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Auth;

public class RegisterUserRequest
{
    [Required, MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Apellido { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public UserRole Rol { get; set; }

    public Guid? BranchId { get; set; }
}
