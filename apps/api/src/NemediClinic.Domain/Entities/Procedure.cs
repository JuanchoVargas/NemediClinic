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
    /// <summary>Si es true, una cita de este procedimiento no pasa a EnCurso sin un consentimiento firmado vigente.</summary>
    public bool RequiereConsentimiento { get; set; }

    public ICollection<PackageProcedure> PackageProcedures { get; set; } = [];
}
