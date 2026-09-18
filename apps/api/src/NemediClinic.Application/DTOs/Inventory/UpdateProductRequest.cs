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
}
