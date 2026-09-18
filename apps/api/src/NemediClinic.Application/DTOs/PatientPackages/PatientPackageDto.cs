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
    /// <summary>0–100, redondeado. Solo llega a 100 cuando el saldo es 0 (99,6 % se muestra como 99).</summary>
    public int PorcentajePagado { get; set; }
    /// <summary>SinPagos / Parcial / Pagado.</summary>
    public string EstadoPago { get; set; } = string.Empty;
    /// <summary>FechaInicio + VigenciaDias del paquete. Null si el paquete no vence (VigenciaDias = 0).</summary>
    public DateOnly? FechaVencimiento { get; set; }
    public int? DiasParaVencer { get; set; }
    /// <summary>Activo y dentro de los DiasAlertaVencimiento del paquete: la ficha lo resalta.</summary>
    public bool PorVencer { get; set; }
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
    public string? Referencia { get; set; }
    /// <summary>Nombre de quien registró el pago; null en pagos anteriores a la trazabilidad.</summary>
    public string? RegistradoPor { get; set; }
    /// <summary>Adjunto con el soporte (se abre con GET /files/{id}/url).</summary>
    public Guid? ComprobanteId { get; set; }
    /// <summary>image/* o application/pdf: la web decide entre miniatura e icono de PDF.</summary>
    public string? ComprobanteContentType { get; set; }
}
