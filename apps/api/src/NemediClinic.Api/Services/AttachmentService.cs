using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace NemediClinic.Api.Services;

/// <summary>
/// Adjuntos de imagen. Reglas:
///  - Solo jpeg/png/webp, máx 10 MB, y el tipo se decide por los magic bytes (no por la extensión
///    ni por el Content-Type que diga el cliente).
///  - La imagen se re-codifica SIN metadatos (EXIF/IPTC/XMP: GPS, modelo de cámara, fecha) tras
///    aplicar la orientación EXIF, y se genera una miniatura de 400 px.
///  - Un adjunto se sube "pendiente" (EntityId null) y la entidad lo reclama al guardarse.
/// </summary>
public class AttachmentService
{
    public const long MaxBytes = 10 * 1024 * 1024;
    public const int ThumbnailSize = 400;
    /// <summary>Lado máximo del original guardado: nadie necesita 8000 px de una foto clínica.</summary>
    private const int MaxOriginalSide = 2400;

    private static readonly Dictionary<AttachmentEntityType, AttachmentKind[]> AllowedKinds = new()
    {
        [AttachmentEntityType.Patient] = [AttachmentKind.Perfil],
        [AttachmentEntityType.ClinicalNote] = [AttachmentKind.Antes, AttachmentKind.Despues],
        [AttachmentEntityType.Product] = [AttachmentKind.Producto],
        [AttachmentEntityType.Procedure] = [AttachmentKind.Procedimiento],
        [AttachmentEntityType.Tenant] = [AttachmentKind.Logo],
    };

    private readonly AppDbContext _db;
    private readonly IFileStorage _storage;
    private readonly FileTokenService _tokens;

    public AttachmentService(AppDbContext db, IFileStorage storage, FileTokenService tokens)
    {
        _db = db;
        _storage = storage;
        _tokens = tokens;
    }

    // ── Subida ──────────────────────────────────────────────────────
    public async Task<AttachmentDto> UploadAsync(
        IFormFile? file, AttachmentEntityType entityType, Guid? entityId, AttachmentKind kind,
        Guid userId, string role, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw ApiException.BadRequest("No se recibió ningún archivo.");
        if (file.Length > MaxBytes)
            throw new ApiException(StatusCodes.Status413PayloadTooLarge, "La imagen supera el máximo de 10 MB.");

        EnsureKindMatches(entityType, kind);
        EnsureRoleCanWrite(entityType, role);
        if (entityId.HasValue)
            await EnsureEntityExistsAsync(entityType, entityId.Value, ct);

        await using var input = file.OpenReadStream();
        var format = await DetectFormatAsync(input, ct)
            ?? throw new ApiException(StatusCodes.Status415UnsupportedMediaType,
                "Formato no permitido. Sube una imagen JPG, PNG o WebP.");

        Image image;
        try
        {
            input.Position = 0;
            image = await Image.LoadAsync(input, ct);
        }
        catch (Exception ex) when (ex is UnknownImageFormatException or InvalidImageContentException or NotSupportedException)
        {
            throw new ApiException(StatusCodes.Status415UnsupportedMediaType, "El archivo está dañado o no es una imagen válida.");
        }

        using (image)
        {
            // Primero se aplica la orientación EXIF a los píxeles; después se tiran los metadatos.
            image.Mutate(x => x.AutoOrient());
            image.Metadata.ExifProfile = null;
            image.Metadata.IptcProfile = null;
            image.Metadata.XmpProfile = null;
            // Los PNG guardan texto libre (autor, comentarios, software) en chunks tEXt/iTXt.
            image.Metadata.GetPngMetadata().TextData.Clear();
            // El perfil ICC se conserva: no tiene datos personales y sin él cambian los colores.

            if (Math.Max(image.Width, image.Height) > MaxOriginalSide)
                image.Mutate(x => x.Resize(new ResizeOptions { Mode = ResizeMode.Max, Size = new Size(MaxOriginalSide, MaxOriginalSide) }));

            var tenantId = _db.CurrentTenantId;

            using var original = new MemoryStream();
            await image.SaveAsync(original, format.Encoder, ct);
            original.Position = 0;
            var storagePath = await _storage.SaveAsync(tenantId, format.Extension, original, ct);

            image.Mutate(x => x.Resize(new ResizeOptions { Mode = ResizeMode.Max, Size = new Size(ThumbnailSize, ThumbnailSize) }));
            using var thumb = new MemoryStream();
            await image.SaveAsync(thumb, new WebpEncoder { Quality = 80 }, ct);
            thumb.Position = 0;
            var thumbnailPath = await _storage.SaveAsync(tenantId, ".webp", thumb, ct);

            var attachment = new Attachment
            {
                EntityType = entityType,
                EntityId = entityId,
                Kind = kind,
                FileName = SanitizeFileName(file.FileName, format.Extension),
                ContentType = format.ContentType,
                Size = original.Length,
                StoragePath = storagePath,
                ThumbnailPath = thumbnailPath,
                CreatedBy = userId
            };
            _db.Attachments.Add(attachment);
            await _db.SaveChangesAsync(ct);
            return ToDto(attachment);
        }
    }

    /// <summary>Solo para el seed demo: guarda un SVG generado por el propio sistema, sin pasar por la validación de subida.</summary>
    public async Task<Attachment> SaveGeneratedSvgAsync(
        string svg, string fileName, AttachmentEntityType entityType, Guid entityId, AttachmentKind kind, Guid userId, CancellationToken ct)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(svg);
        var tenantId = _db.CurrentTenantId;
        using var a = new MemoryStream(bytes);
        var path = await _storage.SaveAsync(tenantId, ".svg", a, ct);
        using var b = new MemoryStream(bytes);
        var thumbPath = await _storage.SaveAsync(tenantId, ".svg", b, ct);

        var attachment = new Attachment
        {
            EntityType = entityType,
            EntityId = entityId,
            Kind = kind,
            FileName = fileName,
            ContentType = "image/svg+xml",
            Size = bytes.Length,
            StoragePath = path,
            ThumbnailPath = thumbPath,
            CreatedBy = userId
        };
        _db.Attachments.Add(attachment);
        return attachment;
    }

    // ── URL firmada y descarga ──────────────────────────────────────
    public async Task<SignedUrlDto> GetSignedUrlAsync(Guid id, CancellationToken ct)
    {
        // Filtro global: solo encuentra adjuntos del tenant del JWT.
        var exists = await _db.Attachments.AnyAsync(a => a.Id == id, ct);
        if (!exists)
            throw ApiException.NotFound("Imagen no encontrada.");

        var (token, expiresAt) = _tokens.Create(id, _db.CurrentTenantId);
        var url = $"/api/v1/files/{id}?t={token}";
        return new SignedUrlDto
        {
            Url = url,
            ThumbUrl = url + "&size=thumb",
            ExpiresAt = expiresAt.ToLocalTime(),
            ExpiresInSeconds = (int)FileTokenService.Lifetime.TotalSeconds
        };
    }

    /// <summary>
    /// Descarga anónima (la usa un &lt;img&gt;): la autoriza el token, que debe ser válido, vigente
    /// y del MISMO tenant que el adjunto. Cualquier fallo responde 404 para no revelar existencia.
    /// </summary>
    public async Task<(Stream Content, string ContentType, string FileName)> OpenAsync(Guid id, string? token, bool thumbnail, CancellationToken ct)
    {
        var tokenTenant = _tokens.Validate(id, token)
            ?? throw ApiException.NotFound("Imagen no encontrada.");

        var attachment = await _db.Attachments.IgnoreQueryFilters().AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, ct);
        if (attachment is null || attachment.TenantId != tokenTenant)
            throw ApiException.NotFound("Imagen no encontrada.");

        var path = thumbnail ? attachment.ThumbnailPath : attachment.StoragePath;
        var stream = await _storage.OpenReadAsync(path, ct)
            ?? throw ApiException.NotFound("Imagen no encontrada.");

        var isSvg = attachment.ContentType == "image/svg+xml";
        var contentType = thumbnail && !isSvg ? "image/webp" : attachment.ContentType;
        return (stream, contentType, attachment.FileName);
    }

    // ── Borrado ─────────────────────────────────────────────────────
    public async Task DeleteAsync(Guid id, string role, CancellationToken ct)
    {
        var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw ApiException.NotFound("Imagen no encontrada.");
        EnsureRoleCanWrite(attachment.EntityType, role);

        // Soft delete; AttachmentCleanupService borra los archivos físicos más tarde.
        attachment.IsDeleted = true;

        if (attachment.EntityId is { } entityId)
        {
            switch (attachment.EntityType)
            {
                case AttachmentEntityType.Patient:
                    await _db.Patients.Where(p => p.Id == entityId && p.ImagenId == id)
                        .ExecuteUpdateAsync(s => s.SetProperty(p => p.ImagenId, (Guid?)null), ct);
                    break;
                case AttachmentEntityType.Product:
                    await _db.Products.Where(p => p.Id == entityId && p.ImagenId == id)
                        .ExecuteUpdateAsync(s => s.SetProperty(p => p.ImagenId, (Guid?)null), ct);
                    break;
                case AttachmentEntityType.Procedure:
                    await _db.Procedures.Where(p => p.Id == entityId && p.ImagenId == id)
                        .ExecuteUpdateAsync(s => s.SetProperty(p => p.ImagenId, (Guid?)null), ct);
                    break;
                case AttachmentEntityType.Tenant:
                    await _db.Tenants.Where(t => t.Id == entityId && t.LogoId == id)
                        .ExecuteUpdateAsync(s => s.SetProperty(t => t.LogoId, (Guid?)null), ct);
                    break;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    // ── Reclamo desde las entidades ─────────────────────────────────
    /// <summary>
    /// Valida y enlaza la imagen principal de una entidad (Patient/Product/Procedure.ImagenId).
    /// No guarda: el controller hace un solo SaveChanges. Si reemplaza a otra, la anterior se elimina.
    /// </summary>
    public async Task AssignImageAsync(AttachmentEntityType entityType, Guid entityId, Guid? newImageId, Guid? previousImageId, CancellationToken ct = default)
    {
        if (newImageId == previousImageId)
            return;

        if (newImageId.HasValue)
        {
            var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == newImageId.Value, ct)
                ?? throw ApiException.BadRequest("La imagen indicada no existe.");
            if (attachment.EntityType != entityType || (attachment.EntityId.HasValue && attachment.EntityId != entityId))
                throw ApiException.BadRequest("La imagen indicada no corresponde a este registro.");
            attachment.EntityId = entityId;
        }

        if (previousImageId.HasValue)
        {
            var previous = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == previousImageId.Value, ct);
            if (previous is not null)
                previous.IsDeleted = true;
        }
    }

    /// <summary>Enlaza a una nota clínica recién creada las fotos subidas como pendientes. No guarda.</summary>
    public async Task ClaimForNoteAsync(IReadOnlyCollection<Guid> attachmentIds, Guid noteId, CancellationToken ct = default)
    {
        if (attachmentIds.Count == 0)
            return;

        var ids = attachmentIds.Distinct().ToList();
        var attachments = await _db.Attachments.Where(a => ids.Contains(a.Id)).ToListAsync(ct);
        if (attachments.Count != ids.Count)
            throw ApiException.BadRequest("Alguna de las fotos indicadas no existe.");

        foreach (var attachment in attachments)
        {
            if (attachment.EntityType != AttachmentEntityType.ClinicalNote || attachment.EntityId.HasValue)
                throw ApiException.BadRequest("Alguna de las fotos ya pertenece a otro registro.");
            attachment.EntityId = noteId;
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────
    private static void EnsureKindMatches(AttachmentEntityType entityType, AttachmentKind kind)
    {
        if (!AllowedKinds[entityType].Contains(kind))
            throw ApiException.BadRequest($"El tipo de imagen {kind} no aplica a {entityType}.");
    }

    /// <summary>Misma matriz que los controllers: productos y procedimientos los escribe Admin; el logo, SuperAdmin.</summary>
    private static void EnsureRoleCanWrite(AttachmentEntityType entityType, string role)
    {
        var allowed = entityType switch
        {
            AttachmentEntityType.Product or AttachmentEntityType.Procedure => role is "SuperAdmin" or "Admin",
            AttachmentEntityType.Tenant => role is "SuperAdmin",
            _ => true
        };
        if (!allowed)
            throw new ApiException(StatusCodes.Status403Forbidden, "No tienes permisos para esta acción.");
    }

    private async Task EnsureEntityExistsAsync(AttachmentEntityType entityType, Guid entityId, CancellationToken ct)
    {
        // Todas las consultas pasan por el filtro global: un id de otro tenant "no existe".
        var exists = entityType switch
        {
            AttachmentEntityType.Patient => await _db.Patients.AnyAsync(x => x.Id == entityId, ct),
            AttachmentEntityType.ClinicalNote => await _db.ClinicalNotes.AnyAsync(x => x.Id == entityId, ct),
            AttachmentEntityType.Product => await _db.Products.AnyAsync(x => x.Id == entityId, ct),
            AttachmentEntityType.Procedure => await _db.Procedures.AnyAsync(x => x.Id == entityId, ct),
            AttachmentEntityType.Tenant => entityId == _db.CurrentTenantId,
            _ => false
        };
        if (!exists)
            throw ApiException.NotFound("El registro al que quieres adjuntar la imagen no existe.");
    }

    private sealed record DetectedFormat(string ContentType, string Extension, IImageEncoder Encoder);

    /// <summary>Tipo real por magic bytes: JPEG FF D8 FF · PNG 89 50 4E 47 0D 0A 1A 0A · WebP "RIFF"...."WEBP".</summary>
    private static async Task<DetectedFormat?> DetectFormatAsync(Stream stream, CancellationToken ct)
    {
        var header = new byte[12];
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        return read < 12 ? null : DetectFormat(header);
    }

    private static DetectedFormat? DetectFormat(ReadOnlySpan<byte> header)
    {
        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return new DetectedFormat("image/jpeg", ".jpg", new JpegEncoder { Quality = 88 });

        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (header[..8].SequenceEqual(png))
            return new DetectedFormat("image/png", ".png", new PngEncoder());

        if (header[..4].SequenceEqual("RIFF"u8) && header.Slice(8, 4).SequenceEqual("WEBP"u8))
            return new DetectedFormat("image/webp", ".webp", new WebpEncoder { Quality = 88 });

        return null;
    }

    private static string SanitizeFileName(string? original, string extension)
    {
        var name = Path.GetFileNameWithoutExtension(original ?? string.Empty);
        var clean = new string(name.Where(c => char.IsLetterOrDigit(c) || c is '-' or '_' or ' ').ToArray()).Trim();
        if (clean.Length == 0) clean = "imagen";
        if (clean.Length > 80) clean = clean[..80];
        return clean + extension;
    }

    public static AttachmentDto ToDto(Attachment a) => new()
    {
        Id = a.Id,
        EntityType = a.EntityType.ToString(),
        EntityId = a.EntityId,
        Kind = a.Kind.ToString(),
        FileName = a.FileName,
        ContentType = a.ContentType,
        Size = a.Size,
        CreatedAt = a.CreatedAt
    };
}
