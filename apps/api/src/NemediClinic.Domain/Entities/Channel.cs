namespace NemediClinic.Domain.Entities;

/// <summary>
/// Canal comercial (aliado que revende la plataforma con su marca). Entidad de PLATAFORMA:
/// no hereda BaseEntity, no tiene TenantId ni filtro global.
/// </summary>
public class Channel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    // Branding (marca blanca por dominio)
    public string NombreComercial { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string ColorPrimario { get; set; } = "#1F4E79";
    public string ColorSecundario { get; set; } = "#D9A441";
    public string Dominio { get; set; } = string.Empty;

    /// <summary>Participación del canal sobre lo facturado, entre 0 y 1 (0.50 = 50 %).</summary>
    public decimal PorcentajeCanal { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Tenant> Tenants { get; set; } = [];
    public ICollection<Lead> Leads { get; set; } = [];
}
