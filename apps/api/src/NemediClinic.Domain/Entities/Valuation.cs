using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

/// <summary>
/// Valoración (cita de diagnóstico y cotización). Puede ser de un paciente existente o de un
/// prospecto que aún no es paciente (solo nombre y teléfono, sin cédula). "Convertir" crea el
/// paciente si hace falta y le asigna el paquete cotizado. Sus fotos son Attachments
/// (EntityType = Valuation, Kind = Antes).
/// </summary>
public class Valuation : BaseEntity
{
    public Guid? PatientId { get; set; }
    public string? ProspectoNombre { get; set; }
    public string? ProspectoTelefono { get; set; }

    public Guid EsteticistId { get; set; }
    public DateTime Fecha { get; set; } = DateTime.Now;
    public string Diagnostico { get; set; } = string.Empty;
    public string? TratamientoSugerido { get; set; }
    /// <summary>Paquete sugerido. Es lo que "Convertir" asigna al paciente.</summary>
    public Guid? PackageId { get; set; }
    public decimal PrecioCotizado { get; set; }
    public ValuationEstado Estado { get; set; } = ValuationEstado.Pendiente;
    public string? MotivoRechazo { get; set; }
    public DateTime? FechaCierre { get; set; }
    /// <summary>Asignación creada al convertir (si se sugirió un paquete).</summary>
    public Guid? PatientPackageId { get; set; }

    public Patient? Patient { get; set; }
    public User Esteticist { get; set; } = null!;
    public Package? Package { get; set; }
    public ICollection<ValuationProcedure> Procedures { get; set; } = [];
}

/// <summary>Procedimientos sugeridos en la valoración (sin TenantId: vive dentro de su Valuation).</summary>
public class ValuationProcedure
{
    public Guid ValuationId { get; set; }
    public Guid ProcedureId { get; set; }

    public Valuation Valuation { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
}
