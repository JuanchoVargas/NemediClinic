using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Consents;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize(Policy = "Esteticista")]
public class ConsentsController : ControllerBase
{
    private readonly ConsentService _service;

    public ConsentsController(ConsentService service) => _service = service;

    // ── Plantillas (una por procedimiento; sin editar, se usa la del sistema) ──
    [HttpGet("consent-templates")]
    public async Task<ActionResult<List<ConsentTemplateDto>>> ListTemplates(CancellationToken ct) =>
        Ok(await _service.ListTemplatesAsync(ct));

    [HttpGet("consent-templates/procedure/{procedureId:guid}")]
    public async Task<ActionResult<ConsentTemplateDto>> GetTemplate(Guid procedureId, CancellationToken ct) =>
        Ok(await _service.GetTemplateAsync(procedureId, ct));

    [HttpPut("consent-templates/procedure/{procedureId:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<ConsentTemplateDto>> SaveTemplate(Guid procedureId, [FromBody] SaveConsentTemplateRequest request, CancellationToken ct) =>
        Ok(await _service.SaveTemplateAsync(procedureId, request, ct));

    // ── Firma ──
    /// <summary>Texto con las variables ya resueltas, tal como lo leerá el paciente antes de firmar.</summary>
    [HttpGet("consents/preview")]
    public async Task<ActionResult<ConsentPreviewDto>> Preview([FromQuery] Guid patientId, [FromQuery] Guid procedureId, CancellationToken ct) =>
        Ok(await _service.PreviewAsync(patientId, procedureId, ct));

    /// <summary>Guarda la firma, genera el PDF y lo deja en la ficha (Attachment Kind=Consentimiento).</summary>
    [HttpPost("consents")]
    public async Task<ActionResult<ConsentDto>> Sign([FromBody] SignConsentRequest request, CancellationToken ct)
    {
        var userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
        return Ok(await _service.SignAsync(request, userId, ct));
    }

    [HttpGet("patients/{patientId:guid}/consents")]
    public async Task<ActionResult<List<ConsentDto>>> ListByPatient(Guid patientId, CancellationToken ct) =>
        Ok(await _service.ListByPatientAsync(patientId, ct));
}
