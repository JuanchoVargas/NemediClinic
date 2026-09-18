namespace NemediClinic.Application.DTOs.Patients;

public class PatientDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Cedula { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateOnly? FechaNacimiento { get; set; }
    public string? FotoUrl { get; set; }
    public Guid? ImagenId { get; set; }
    /// <summary>Próxima cita Agendada o Confirmada, para la cabecera de la ficha.</summary>
    public DateTime? ProximaCita { get; set; }
    public string? NotasGenerales { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PatientPackageSummary> PaquetesActivos { get; set; } = [];
}

public class PatientPackageSummary
{
    public Guid Id { get; set; }
    public string PackageNombre { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public int SesionesCompletadas { get; set; }
    public int SesionesTotales { get; set; }
    /// <summary>0–100. Null para Esteticista: no ve datos financieros.</summary>
    public int? PorcentajePagado { get; set; }
}
