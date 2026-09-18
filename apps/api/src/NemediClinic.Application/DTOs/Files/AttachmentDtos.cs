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

