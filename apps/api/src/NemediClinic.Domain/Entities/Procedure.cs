namespace NemediClinic.Domain.Entities;

public class Procedure : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal PrecioBase { get; set; }
    public int DuracionMinutos { get; set; }
    public string AreaCorporal { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public Guid? ImagenId { get; set; }

    public ICollection<PackageProcedure> PackageProcedures { get; set; } = [];
}
