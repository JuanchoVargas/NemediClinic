namespace NemediClinic.Application.DTOs.Files;

public class AttachmentDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SignedUrlDto
{
    /// <summary>Ruta relativa al API con el token (?t=). El cliente le antepone su base URL.</summary>
    public string Url { get; set; } = string.Empty;
    public string ThumbUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    /// <summary>Segundos de validez desde ahora; evita depender del reloj del cliente para renovar.</summary>
    public int ExpiresInSeconds { get; set; }
}

/// <summary>Foto dentro de una sesión de la evolución del paciente.</summary>
public class EvolutionPhotoDto
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}

public class EvolutionSessionDto
{
    public Guid NoteId { get; set; }
    public Guid? AppointmentId { get; set; }
    public DateTime Fecha { get; set; }
    public string Procedimiento { get; set; } = string.Empty;
    public string Esteticista { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    /// <summary>Texto libre heredado (notas anteriores al consumo de cabina).</summary>
    public string? ProductosUsados { get; set; }
    /// <summary>Consumo de cabina de la sesión.</summary>
    public List<NemediClinic.Application.DTOs.Inventory.ClinicalNoteProductDto> Productos { get; set; } = [];
    public List<EvolutionPhotoDto> Fotos { get; set; } = [];
}
