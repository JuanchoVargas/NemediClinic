using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Inventory;

/// <summary>Producto bajo el stock mínimo. Lo usan el Dashboard y el aviso al guardar una nota clínica.</summary>
public class StockAlertaDto
{
    public Guid ProductId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
    /// <summary>"Amarillo" | "Rojo"</summary>
    public string Semaforo { get; set; } = string.Empty;
}

/// <summary>Un producto consumido en una sesión (entra en CreateClinicalNoteRequest.Productos).</summary>
public class ClinicalNoteProductRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(0.0001, double.MaxValue, ErrorMessage = "La cantidad debe ser mayor a cero.")]
    public decimal Cantidad { get; set; }
}

/// <summary>Producto consumido, tal como se devuelve dentro de una nota clínica.</summary>
public class ClinicalNoteProductDto
{
    public Guid ProductId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
}

/// <summary>Una línea del historial de consumo de cabina de un paciente.</summary>
public class PatientConsumptionDto
{
    public Guid ClinicalNoteId { get; set; }
    public Guid? AppointmentId { get; set; }
    public DateTime Fecha { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public string Esteticista { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public string Producto { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
}
