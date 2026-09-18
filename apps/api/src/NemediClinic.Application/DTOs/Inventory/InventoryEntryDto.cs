namespace NemediClinic.Application.DTOs.Inventory;

public class InventoryEntryDto
{
    /// <summary>Lote que creó la entrada (número; null si el producto no maneja lotes).</summary>
    public string? NumeroLote { get; set; }
    public DateOnly? FechaVencimiento { get; set; }
    public string? Proveedor { get; set; }
    public string? NumeroFactura { get; set; }
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string MotivoEntrada { get; set; } = string.Empty;
    public string? Observacion { get; set; }
    public DateTime FechaEntrada { get; set; }
    public Guid UserId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
}
