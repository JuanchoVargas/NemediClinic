namespace NemediClinic.Domain.Entities;

/// <summary>
/// Administrador de la plataforma. Vive FUERA de todo tenant (tabla propia, sin TenantId):
/// es el único que crea tenants, canales, leads y ve la liquidación. No se puede crear por
/// auth/register; nace del seeder (Platform:Admin en configuración).
/// </summary>
public class PlatformAdmin
{
    public const string RoleName = "PlatformAdmin";

    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
