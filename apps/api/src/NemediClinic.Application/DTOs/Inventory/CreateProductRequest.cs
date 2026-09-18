using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Inventory;

public class CreateProductRequest
{
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Descripcion { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Referencia { get; set; }

    [Required]
    public ProductType TipoProducto { get; set; }

    [Required, MaxLength(20)]
    public string UnidadMedida { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal StockMinimo { get; set; } = 0m;

    public decimal? StockMaximo { get; set; }

    /// <summary>Id de un Attachment (Kind=Producto) subido antes con POST /files.</summary>
    public Guid? ImagenId { get; set; }

    // ── Trazabilidad sanitaria ──
    public RegulatoryType TipoRegulatorio { get; set; } = RegulatoryType.Insumo;

    [MaxLength(60)]
    public string? RegistroSanitarioInvima { get; set; }

    [MaxLength(150)]
    public string? PrincipioActivo { get; set; }

    [MaxLength(60)]
    public string? Concentracion { get; set; }

    public bool RequiereCadenaFrio { get; set; }
}
