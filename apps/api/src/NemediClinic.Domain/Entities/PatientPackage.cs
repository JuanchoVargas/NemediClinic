using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

/// <summary>
/// Paquete vendido a un paciente. Copia del catálogo el nombre, las sesiones y la vigencia al
/// asignarse: la venta ya ocurrió y no debe cambiar si después se edita o se elimina el paquete
/// (antes, borrar el paquete dejaba la asignación inaccesible — FLUJOS bug 5).
/// </summary>
public class PatientPackage : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid PackageId { get; set; }
    public decimal PrecioAcordado { get; set; }

    /// <summary>Nombre del paquete tal como se vendió.</summary>
    public string PackageNombre { get; set; } = string.Empty;
    /// <summary>Sesiones acordadas. Cierra el paquete cuando SesionesCompletadas las alcanza.</summary>
    public int SesionesTotales { get; set; }
    /// <summary>Días de vigencia acordados; 0 = no vence.</summary>
    public int VigenciaDias { get; set; }
    /// <summary>Días antes del vencimiento en que la asignación se marca "por vencer".</summary>
    public int DiasAlertaVencimiento { get; set; }
    public DateOnly FechaInicio { get; set; }
    public PackageStatus Estado { get; set; } = PackageStatus.Activo;
    public int SesionesCompletadas { get; set; }

    public Patient Patient { get; set; } = null!;
    public Package Package { get; set; } = null!;
    public ICollection<PatientPackageSession> Sessions { get; set; } = [];
    public ICollection<PatientPayment> Payments { get; set; } = [];
}
