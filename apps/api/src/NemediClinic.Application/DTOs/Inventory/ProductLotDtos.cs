using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Inventory;

public class ProductLotDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string? NumeroLote { get; set; }
    public DateOnly? FechaVencimiento { get; set; }
    /// <summary>Días que faltan para vencer; negativo si ya venció. Null si no vence.</summary>
    public int? DiasParaVencer { get; set; }
    /// <summary>Vigente / PorVencer / Critico / Vencido.</summary>
    public string Estado { get; set; } = string.Empty;
    public decimal CantidadInicial { get; set; }
    public decimal CantidadDisponible { get; set; }
    public DateTime FechaIngreso { get; set; }
    public string? Proveedor { get; set; }
    public string? NumeroFactura { get; set; }
    public string? RegistroSanitario { get; set; }
}

/// <summary>Lote a punto de vencer o vencido, para el tab de Alertas.</summary>
public class LotAlertaDto : ProductLotDto
{
    public string ProductoNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public string TipoRegulatorio { get; set; } = string.Empty;
}

// ── Reporte para la Secretaría de Salud ──────────────────────────
public class RegulatoryReportDto
{
    public DateOnly Desde { get; set; }
    public DateOnly Hasta { get; set; }
    public List<RegulatoryGroupDto> Grupos { get; set; } = [];
}

public class RegulatoryGroupDto
{
    /// <summary>Medicamento / DispositivoMedico / Insumo / Cosmetico.</summary>
    public string TipoRegulatorio { get; set; } = string.Empty;
    public List<RegulatoryProductDto> Productos { get; set; } = [];
}

public class RegulatoryProductDto
{
    public Guid ProductId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? RegistroSanitarioInvima { get; set; }
    public string? PrincipioActivo { get; set; }
    public string? Concentracion { get; set; }
    public bool RequiereCadenaFrio { get; set; }
    public string UnidadMedida { get; set; } = string.Empty;
    /// <summary>Disponible hoy, sumando solo lotes sin vencer.</summary>
    public decimal CantidadDisponible { get; set; }
    /// <summary>Unidades que salieron en el periodo (consumo de cabina y otras salidas).</summary>
    public decimal ConsumoPeriodo { get; set; }
    public List<ProductLotDto> Lotes { get; set; } = [];
}

// ── Peticiones ───────────────────────────────────────────────────
/// <summary>Datos del lote que acompañan a una entrada de inventario.</summary>
public class LotInputRequest
{
    [MaxLength(60)]
    public string? NumeroLote { get; set; }
    public DateOnly? FechaVencimiento { get; set; }

    [MaxLength(150)]
    public string? Proveedor { get; set; }

    [MaxLength(60)]
    public string? NumeroFactura { get; set; }
}
