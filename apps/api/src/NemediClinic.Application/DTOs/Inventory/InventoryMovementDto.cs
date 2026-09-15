namespace NemediClinic.Application.DTOs.Inventory;

public class InventoryMovementDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty;
    public string? Referencia { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid? PatientId { get; set; }
    public DateTime FechaMovimiento { get; set; }
}
