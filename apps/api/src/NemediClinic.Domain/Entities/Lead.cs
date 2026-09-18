using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

/// <summary>
/// Oportunidad comercial registrada por un canal. Protege el NIT para ese canal durante
/// 90 días (FechaLiberacion). Entidad de PLATAFORMA: sin TenantId obligatorio ni filtro global.
/// </summary>
public class Lead
{
    public const int DiasProteccion = 90;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Ciudad { get; set; } = string.Empty;
    public string Contacto { get; set; } = string.Empty;
    public Guid ChannelId { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.Now;
    public DateTime FechaLiberacion { get; set; }
    public LeadEstado Estado { get; set; } = LeadEstado.Registrado;

    /// <summary>Tenant creado al activar el lead.</summary>
    public Guid? TenantId { get; set; }

    public Channel Channel { get; set; } = null!;
    public Tenant? Tenant { get; set; }
}
