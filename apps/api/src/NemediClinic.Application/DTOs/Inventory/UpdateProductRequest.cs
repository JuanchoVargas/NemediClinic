using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Inventory;

public class UpdateProductRequest
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
    public string? Referencia { get; set; }
    public ProductType? TipoProducto { get; set; }
    public string? UnidadMedida { get; set; }
    public decimal? StockMinimo { get; set; }
    public decimal? StockMaximo { get; set; }
    public bool? Activo { get; set; }
    public Guid? ImagenId { get; set; }

    // ── Trazabilidad sanitaria (null = no cambiar) ──
    public RegulatoryType? TipoRegulatorio { get; set; }
    public string? RegistroSanitarioInvima { get; set; }
    public string? PrincipioActivo { get; set; }
    public string? Concentracion { get; set; }
    public bool? RequiereCadenaFrio { get; set; }
}
