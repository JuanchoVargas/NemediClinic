using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Logo { get; set; }
    /// <summary>Logo subido (Attachment Kind=Logo). La interfaz de la clínica lo muestra en lugar del logo del canal.</summary>
    public Guid? LogoId { get; set; }
    public bool IsActive { get; set; } = true;

    // ── Nivel de plataforma ────────────────────────────────────────
    public Guid ChannelId { get; set; }
    public TenantPlan Plan { get; set; } = TenantPlan.Basico;
    public int SedesAdicionales { get; set; }
    public bool EsIps { get; set; }
    public TenantEstado Estado { get; set; } = TenantEstado.Activo;
    public DateTime? FechaActivacion { get; set; }

    /// <summary>Si tiene valor, reemplaza Channel.PorcentajeCanal para este tenant (p. ej. 60/40 del Anexo A).</summary>
    public decimal? PorcentajeCanalOverride { get; set; }

    public Channel Channel { get; set; } = null!;
    public ICollection<Branch> Branches { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
}
