using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class PatientPayment : BaseEntity
{
    public Guid PatientPackageId { get; set; }
    public decimal Monto { get; set; }
    public DateOnly FechaPago { get; set; }
    public PaymentMethod MetodoPago { get; set; }
    public string? Observacion { get; set; }

    public PatientPackage PatientPackage { get; set; } = null!;
}
