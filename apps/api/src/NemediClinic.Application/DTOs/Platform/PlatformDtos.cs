using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Platform;

// ── Branding / Canales ────────────────────────────────────────────

public class BrandingDto
{
    public string Canal { get; set; } = string.Empty;
    public string NombreComercial { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string ColorPrimario { get; set; } = string.Empty;
    public string ColorSecundario { get; set; } = string.Empty;
    public string Dominio { get; set; } = string.Empty;
}

public class ChannelDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public BrandingDto Branding { get; set; } = new();
    public decimal PorcentajeCanal { get; set; }
    public bool Activo { get; set; }
    public int Tenants { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveChannelRequest
{
    [Required, MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(50), RegularExpression("^[a-z0-9-]+$", ErrorMessage = "El slug solo admite minúsculas, números y guiones.")]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string NombreComercial { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color en formato #RRGGBB.")]
    public string ColorPrimario { get; set; } = "#171717";

    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color en formato #RRGGBB.")]
    public string ColorSecundario { get; set; } = "#737373";

    [Required, MaxLength(200)]
    public string Dominio { get; set; } = string.Empty;

    [Range(0, 1, ErrorMessage = "El porcentaje del canal va entre 0 y 1.")]
    public decimal PorcentajeCanal { get; set; }

    public bool Activo { get; set; } = true;
}

// ── Tenants ───────────────────────────────────────────────────────

public class PlatformTenantDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid ChannelId { get; set; }
    public string Canal { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public int SedesAdicionales { get; set; }
    public bool EsIps { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime? FechaActivacion { get; set; }
    public decimal? PorcentajeCanalOverride { get; set; }
    public decimal PorcentajeCanalEfectivo { get; set; }
    public bool TieneSuperAdmin { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePlatformTenantRequest
{
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string NIT { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Telefono { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public Guid ChannelId { get; set; }

    public TenantPlan Plan { get; set; } = TenantPlan.Basico;

    [Range(0, 100)]
    public int SedesAdicionales { get; set; }

    public bool EsIps { get; set; }
    public TenantEstado Estado { get; set; } = TenantEstado.Activo;

    [Range(0, 1)]
    public decimal? PorcentajeCanalOverride { get; set; }
}

public class UpdatePlatformTenantRequest
{
    [MaxLength(200)] public string? Nombre { get; set; }
    [MaxLength(50)] public string? NIT { get; set; }
    [MaxLength(50)] public string? Telefono { get; set; }
    [EmailAddress] public string? Email { get; set; }
    public Guid? ChannelId { get; set; }
    public TenantPlan? Plan { get; set; }
    [Range(0, 100)] public int? SedesAdicionales { get; set; }
    public bool? EsIps { get; set; }
    public TenantEstado? Estado { get; set; }
    [Range(0, 1)] public decimal? PorcentajeCanalOverride { get; set; }
    /// <summary>true = quita el override y vuelve al porcentaje del canal.</summary>
    public bool QuitarOverride { get; set; }
}

public class BootstrapAdminRequest
{
    [Required, MaxLength(100)] public string AdminNombre { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string AdminApellido { get; set; } = string.Empty;
    [Required, EmailAddress] public string AdminEmail { get; set; } = string.Empty;
}

public class BootstrapAdminResponse
{
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    /// <summary>Se devuelve UNA sola vez (solo se guarda el hash). Aún no existe cambio de contraseña.</summary>
    public string PasswordTemporal { get; set; } = string.Empty;
}

// ── Leads ─────────────────────────────────────────────────────────

public class LeadDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Ciudad { get; set; } = string.Empty;
    public string Contacto { get; set; } = string.Empty;
    public Guid ChannelId { get; set; }
    public string Canal { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; }
    public DateTime FechaLiberacion { get; set; }
    public int DiasProteccionRestantes { get; set; }
    public string Estado { get; set; } = string.Empty;
    public Guid? TenantId { get; set; }
}

public class CreateLeadRequest
{
    [Required, MaxLength(200)] public string Nombre { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{6,10}(-\d)?$", ErrorMessage = "NIT inválido: de 6 a 10 dígitos y, opcional, guion y dígito de verificación.")]
    public string NIT { get; set; } = string.Empty;

    [Required, MaxLength(100)] public string Ciudad { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Contacto { get; set; } = string.Empty;
    [Required] public Guid ChannelId { get; set; }
}

public class UpdateLeadRequest
{
    [MaxLength(200)] public string? Nombre { get; set; }
    [MaxLength(100)] public string? Ciudad { get; set; }
    [MaxLength(200)] public string? Contacto { get; set; }
    /// <summary>Solo se admite liberar manualmente (Registrado → Liberado).</summary>
    public bool Liberar { get; set; }
}

public class ActivateLeadRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [MaxLength(50)] public string Telefono { get; set; } = string.Empty;
    public TenantPlan Plan { get; set; } = TenantPlan.Basico;
    [Range(0, 100)] public int SedesAdicionales { get; set; }
    public bool EsIps { get; set; }
    [Range(0, 1)] public decimal? PorcentajeCanalOverride { get; set; }
}

// ── Liquidación ───────────────────────────────────────────────────

public class LiquidacionDto
{
    public string Mes { get; set; } = string.Empty;
    public List<LiquidacionCanalDto> Canales { get; set; } = [];
    public decimal TotalFacturado { get; set; }
    public decimal TotalCanales { get; set; }
    public decimal TotalNemedi { get; set; }
}

public class LiquidacionCanalDto
{
    public Guid ChannelId { get; set; }
    public string Canal { get; set; } = string.Empty;
    public decimal PorcentajeCanal { get; set; }
    public int TenantsActivos { get; set; }
    public decimal TotalFacturado { get; set; }
    public decimal MontoCanal { get; set; }
    public decimal MontoNemedi { get; set; }
    public List<LiquidacionTenantDto> Tenants { get; set; } = [];
}

public class LiquidacionTenantDto
{
    public Guid TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public int SedesAdicionales { get; set; }
    public bool EsIps { get; set; }
    public string Estado { get; set; } = string.Empty;
    /// <summary>false para Exento, Suspendido o no activado en el mes: aparece en la tabla con montos en 0.</summary>
    public bool Suma { get; set; }
    public decimal Precio { get; set; }
    public decimal Porcentaje { get; set; }
    public decimal MontoCanal { get; set; }
    public decimal MontoNemedi { get; set; }
}

public class TenantActualDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
}
