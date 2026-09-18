using System.ComponentModel.DataAnnotations;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Valuations;

public class ValuationDto
{
    public Guid Id { get; set; }
    public Guid? PatientId { get; set; }
    /// <summary>Nombre del paciente o, si aún no lo es, del prospecto.</summary>
    public string Nombre { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public bool EsProspecto { get; set; }
    public Guid EsteticistId { get; set; }
    public string Esteticista { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string Diagnostico { get; set; } = string.Empty;
    public string? TratamientoSugerido { get; set; }
    public Guid? PackageId { get; set; }
    public string? Paquete { get; set; }
    public List<ValuationProcedureDto> Procedimientos { get; set; } = [];
    public decimal PrecioCotizado { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? MotivoRechazo { get; set; }
    public DateTime? FechaCierre { get; set; }
    public Guid? PatientPackageId { get; set; }
    public List<EvolutionPhotoDto> Fotos { get; set; } = [];
}

public class ValuationProcedureDto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class SaveValuationRequest
{
    /// <summary>Paciente existente. Si va null, ProspectoNombre y ProspectoTelefono son obligatorios.</summary>
    public Guid? PatientId { get; set; }
    [MaxLength(200)] public string? ProspectoNombre { get; set; }
    [MaxLength(50)] public string? ProspectoTelefono { get; set; }

    [Required] public Guid EsteticistId { get; set; }
    public DateTime? Fecha { get; set; }
    [Required, MaxLength(4000)] public string Diagnostico { get; set; } = string.Empty;
    [MaxLength(2000)] public string? TratamientoSugerido { get; set; }
    public Guid? PackageId { get; set; }
    public List<Guid> ProcedureIds { get; set; } = [];
    [Range(0, double.MaxValue)] public decimal PrecioCotizado { get; set; }
    /// <summary>Fotos (Kind Antes) subidas antes con POST /files, entityType Valuation y sin entityId.</summary>
    [MaxLength(12)] public List<Guid> AdjuntoIds { get; set; } = [];
}

public class RejectValuationRequest
{
    [MaxLength(500)] public string? Motivo { get; set; }
}

public class ConvertValuationRequest
{
    // Datos para crear el paciente si la valoración es de un prospecto (se ignoran si ya es paciente)
    [MaxLength(100)] public string? Nombre { get; set; }
    [MaxLength(100)] public string? Apellido { get; set; }
    [MaxLength(20)] public string? Cedula { get; set; }
    [EmailAddress] public string? Email { get; set; }

    /// <summary>Paquete a asignar. Por defecto, el sugerido en la valoración; null en ambos = solo crea el paciente.</summary>
    public Guid? PackageId { get; set; }
    /// <summary>Por defecto, el precio cotizado.</summary>
    [Range(0, double.MaxValue)] public decimal? PrecioAcordado { get; set; }
    public DateOnly? FechaInicio { get; set; }
}

public class ConvertValuationResponse
{
    public Guid PatientId { get; set; }
    public bool PacienteCreado { get; set; }
    public Guid? PatientPackageId { get; set; }
}

/// <summary>Embudo del mes: valoraciones por estado y tasa de conversión (Aceptó / cerradas y / total).</summary>
public class ValuationStatsDto
{
    public string Mes { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Pendientes { get; set; }
    public int Aceptadas { get; set; }
    public int Rechazadas { get; set; }
    /// <summary>Aceptadas / Total del mes, entre 0 y 1.</summary>
    public decimal TasaConversion { get; set; }
    public decimal ValorCotizado { get; set; }
    public decimal ValorAceptado { get; set; }
}
