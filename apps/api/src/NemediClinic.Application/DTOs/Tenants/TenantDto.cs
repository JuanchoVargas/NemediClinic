namespace NemediClinic.Application.DTOs.Tenants;

public class TenantDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public Guid? LogoId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
