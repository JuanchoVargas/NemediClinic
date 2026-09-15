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

    public Product Product { get; set; } = null!;
    public User Usuario { get; set; } = null!;
}
