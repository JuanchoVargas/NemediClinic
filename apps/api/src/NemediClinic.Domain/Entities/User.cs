using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class User : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Rol { get; set; }
    public Guid? BranchId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public Branch? Branch { get; set; }
    public Tenant Tenant { get; set; } = null!;
}
