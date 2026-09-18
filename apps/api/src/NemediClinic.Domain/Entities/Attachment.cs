using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

/// <summary>
/// Imagen adjunta a una entidad del tenant. El binario vive en IFileStorage
/// (StoragePath / ThumbnailPath son claves del storage, no rutas absolutas).
/// EntityId es null mientras el adjunto está "pendiente": se sube antes de guardar
/// el formulario y la entidad lo reclama al crearse (p. ej. las fotos de una nota clínica).
/// </summary>
public class Attachment : BaseEntity
{
    public AttachmentEntityType EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public AttachmentKind Kind { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string ThumbnailPath { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }

    /// <summary>Fecha en que el job de limpieza borró los archivos físicos (tras el soft delete).</summary>
    public DateTime? PurgedAt { get; set; }
}
