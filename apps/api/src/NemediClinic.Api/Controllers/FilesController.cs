using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Files;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/files")]
[Authorize(Policy = "Esteticista")]
public class FilesController : ControllerBase
{
    private readonly AttachmentService _service;

    public FilesController(AttachmentService service) => _service = service;

    /// <summary>multipart/form-data: file + entityType + kind (+ entityId si la entidad ya existe).</summary>
    [HttpPost]
    // Límite del framework holgado (25 MB): entre 10 y 25 MB responde el service con un 413 legible.
    [RequestSizeLimit(25 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25 * 1024 * 1024)]
    public async Task<ActionResult<AttachmentDto>> Upload(
        IFormFile? file, [FromForm] AttachmentEntityType entityType, [FromForm] AttachmentKind kind,
        [FromForm] Guid? entityId, CancellationToken ct)
    {
        var dto = await _service.UploadAsync(file, entityType, entityId, kind, GetUserId(), GetRole(), ct);
        return Created($"api/v1/files/{dto.Id}/url", dto);
    }

    [HttpGet("{id:guid}/url")]
    public async Task<ActionResult<SignedUrlDto>> GetUrl(Guid id, CancellationToken ct) =>
        Ok(await _service.GetSignedUrlAsync(id, ct));

    /// <summary>
    /// Anónimo a propósito: lo consume un &lt;img src&gt;. Lo autoriza el token firmado (?t=),
    /// que expira en 10 minutos y está atado al adjunto y a su tenant. Sin token válido → 404.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid id, [FromQuery] string? t, [FromQuery] string? size, CancellationToken ct)
    {
        var (content, contentType, fileName) = await _service.OpenAsync(id, t, thumbnail: size == "thumb", ct);

        Response.Headers.CacheControl = "private, max-age=600";
        Response.Headers.XContentTypeOptions = "nosniff";
        if (contentType == "image/svg+xml")
        {
            // Un SVG puede llevar scripts: aunque hoy solo los genera el seed, se sirve en sandbox.
            Response.Headers.ContentSecurityPolicy = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        }
        else if (contentType == "application/pdf")
        {
            // inline: el navegador lo abre en su visor; el nombre sirve si el usuario lo descarga
            Response.Headers.ContentDisposition = $"inline; filename=\"{fileName}\"";
        }
        return File(content, contentType);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, GetRole(), ct);
        return NoContent();
    }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string GetRole() => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
}
