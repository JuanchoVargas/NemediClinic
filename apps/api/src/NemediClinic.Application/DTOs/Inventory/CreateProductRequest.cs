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
}
