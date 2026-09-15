namespace NemediClinic.Application.DTOs.Procedures;

public class ProcedureDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal PrecioBase { get; set; }
    public int DuracionMinutos { get; set; }
    public string AreaCorporal { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public DateTime CreatedAt { get; set; }
}
