using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Users;

public class UpdateUserRequest
{
    [MaxLength(100)]
    public string? Nombre { get; set; }

    [MaxLength(100)]
    public string? Apellido { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public UserRole? Rol { get; set; }

    public Guid? BranchId { get; set; }

    public bool? IsActive { get; set; }
}
