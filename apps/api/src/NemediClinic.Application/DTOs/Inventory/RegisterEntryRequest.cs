using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Inventory;

public class RegisterEntryRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(0.0001, double.MaxValue, ErrorMessage = "La cantidad debe ser > 0")]
    public decimal Cantidad { get; set; }

    [Required]
    public EntryReason MotivoEntrada { get; set; }

    [MaxLength(1000)]
    public string? Observacion { get; set; }

    /// <summary>Si no se envía, el backend usa DateTime.UtcNow.</summary>
    public DateTime? FechaEntrada { get; set; }
}
