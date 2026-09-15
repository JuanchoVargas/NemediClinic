namespace NemediClinic.Application.DTOs.Users;

public class UserDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
