using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class InventoryEntry : BaseEntity
{
    public Guid ProductId { get; set; }
    public decimal Cantidad { get; set; }
    public EntryReason MotivoEntrada { get; set; }
    public string? Observacion { get; set; }
    public Guid UserId { get; set; }
    public DateTime FechaEntrada { get; set; }
    /// <summary>Lote que creó esta entrada. Null solo en las entradas anteriores a los lotes.</summary>
    public Guid? ProductLotId { get; set; }

    public Product Product { get; set; } = null!;
    public ProductLot? ProductLot { get; set; }
    public User Usuario { get; set; } = null!;
}
