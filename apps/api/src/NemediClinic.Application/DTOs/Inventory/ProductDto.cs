namespace NemediClinic.Application.DTOs.Inventory;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string? Referencia { get; set; }
    public string TipoProducto { get; set; } = string.Empty; // enum serializado
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal? StockMaximo { get; set; }
    public bool Activo { get; set; }
    /// <summary>"Verde" | "Amarillo" | "Rojo"</summary>
    public string SemaforoStock { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
