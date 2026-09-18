using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class PatientPayment : BaseEntity
{
    public Guid PatientPackageId { get; set; }
    public decimal Monto { get; set; }
    public DateOnly FechaPago { get; set; }
    public PaymentMethod MetodoPago { get; set; }
    public string? Observacion { get; set; }

    /// <summary>Número de transferencia, voucher del datáfono, recibo de caja…</summary>
    public string? Referencia { get; set; }
    /// <summary>Attachment (imagen o PDF) con el soporte del pago. Kind = Comprobante.</summary>
    public Guid? ComprobanteId { get; set; }
    /// <summary>Usuario que registró el pago. Null en los pagos anteriores a esta columna y en el seed.</summary>
    public Guid? RegistradoPorId { get; set; }

    public PatientPackage PatientPackage { get; set; } = null!;
    public User? RegistradoPor { get; set; }
}
