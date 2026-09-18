namespace NemediClinic.Application.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime Expiration { get; set; }
    /// <summary>true: la web bloquea todo hasta pasar por /change-password (y la API responde 403 fuera de /auth).</summary>
    public bool MustChangePassword { get; set; }
    public UserInfo UserInfo { get; set; } = null!;
}

public class UserInfo
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
}
