namespace NemediClinic.Application.DTOs.PatientPackages;

public class PatientPackageDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientNombre { get; set; } = string.Empty;
    public Guid PackageId { get; set; }
    public string PackageNombre { get; set; } = string.Empty;
    public decimal PrecioAcordado { get; set; }
    public DateOnly FechaInicio { get; set; }
    public string Estado { get; set; } = string.Empty;
    public int SesionesCompletadas { get; set; }
    public int SesionesTotales { get; set; }
    public decimal TotalPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public List<PatientPackageSessionDto> Sesiones { get; set; } = [];
    public List<PatientPaymentDto> Pagos { get; set; } = [];
}

public class PatientPackageSessionDto
{
    public Guid Id { get; set; }
    public Guid ProcedureId { get; set; }
    public string ProcedureNombre { get; set; } = string.Empty;
    public int Numero { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime? FechaCompletada { get; set; }
    public Guid? ClinicalNoteId { get; set; }
}

public class PatientPaymentDto
{
    public Guid Id { get; set; }
    public decimal Monto { get; set; }
    public DateOnly FechaPago { get; set; }
    public string MetodoPago { get; set; } = string.Empty;
    public string? Observacion { get; set; }
}
