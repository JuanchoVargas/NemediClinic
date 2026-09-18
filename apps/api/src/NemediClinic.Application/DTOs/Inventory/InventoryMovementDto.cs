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
    /// <summary>Paciente de la sesión en la que se gastó (solo en las salidas por consumo de cabina).</summary>
    public string? PacienteNombre { get; set; }
    /// <summary>De qué lote salió o entró. Null en movimientos anteriores a la trazabilidad por lote.</summary>
    public Guid? ProductLotId { get; set; }
    public string? NumeroLote { get; set; }
    public DateOnly? FechaVencimientoLote { get; set; }
    public DateTime FechaMovimiento { get; set; }
}
