namespace NemediClinic.Application.DTOs.Packages;

public class PackageDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal PrecioTotal { get; set; }
    public int SesionesTotales { get; set; }
    public int VigenciaDias { get; set; }
    public int DiasAlertaVencimiento { get; set; }
    public bool Activo { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PackageProcedureDto> Procedimientos { get; set; } = [];
}

public class PackageProcedureDto
{
    public Guid ProcedureId { get; set; }
    public string ProcedureNombre { get; set; } = string.Empty;
    public int CantidadSesiones { get; set; }
}
