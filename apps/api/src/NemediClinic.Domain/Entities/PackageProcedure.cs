namespace NemediClinic.Domain.Entities;

public class PackageProcedure
{
    public Guid PackageId { get; set; }
    public Package Package { get; set; } = null!;

    public Guid ProcedureId { get; set; }
    public Procedure Procedure { get; set; } = null!;

    public int CantidadSesiones { get; set; }
}
