namespace NemediClinic.Domain.Entities;

/// <summary>
/// Procedimiento incluido en un paquete de catálogo, con cuántas sesiones aporta.
///
/// Hereda de BaseEntity (antes era una tabla puente con clave compuesta y sin TenantId): así el
/// filtro global de tenant también aplica aquí y desaparece la advertencia EF 10622, que nacía de
/// que Package sí estaba filtrado y esta relación requerida no.
/// </summary>
public class PackageProcedure : BaseEntity
{
    public Guid PackageId { get; set; }
    public Package Package { get; set; } = null!;

    public Guid ProcedureId { get; set; }
    public Procedure Procedure { get; set; } = null!;

    public int CantidadSesiones { get; set; }
}
