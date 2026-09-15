using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class PatientPackage : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid PackageId { get; set; }
    public decimal PrecioAcordado { get; set; }
    public DateOnly FechaInicio { get; set; }
    public PackageStatus Estado { get; set; } = PackageStatus.Activo;
    public int SesionesCompletadas { get; set; }

    public Patient Patient { get; set; } = null!;
    public Package Package { get; set; } = null!;
    public ICollection<PatientPackageSession> Sessions { get; set; } = [];
    public ICollection<PatientPayment> Payments { get; set; } = [];
}
