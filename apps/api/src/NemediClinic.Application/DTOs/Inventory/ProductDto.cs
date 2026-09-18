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
    public Guid? ImagenId { get; set; }
    /// <summary>"Verde" | "Amarillo" | "Rojo"</summary>
    public string SemaforoStock { get; set; } = string.Empty;

    // ── Trazabilidad sanitaria ──
    public string TipoRegulatorio { get; set; } = string.Empty;
    public string? RegistroSanitarioInvima { get; set; }
    public string? PrincipioActivo { get; set; }
    public string? Concentracion { get; set; }
    public bool RequiereCadenaFrio { get; set; }
    /// <summary>Peor estado entre sus lotes con existencia: null si el producto no maneja lotes.</summary>
    public string? SemaforoLotes { get; set; }
    public int LotesPorVencer { get; set; }
    public int LotesVencidos { get; set; }
    public DateTime CreatedAt { get; set; }
}
