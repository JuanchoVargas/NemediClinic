using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class InventoryMovement : BaseEntity
{
    public Guid ProductId { get; set; }
    /// <summary>Siempre positivo; el tipo indica dirección.</summary>
    public decimal Cantidad { get; set; }
    public MovementType TipoMovimiento { get; set; }
    public string? Referencia { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid? PatientId { get; set; }
    public Guid UserId { get; set; }
    public DateTime FechaMovimiento { get; set; }

    public Product Product { get; set; } = null!;
    public User Usuario { get; set; } = null!;
}
