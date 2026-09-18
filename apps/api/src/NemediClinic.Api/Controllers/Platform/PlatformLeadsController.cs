using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Controllers.Platform;

[ApiController]
[Route("api/v1/platform/leads")]
[Authorize(Policy = "PlatformAdmin")]
public class PlatformLeadsController : ControllerBase
{
    private readonly LeadService _service;

    public PlatformLeadsController(LeadService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<LeadDto>>> List([FromQuery] Guid? channelId, [FromQuery] LeadEstado? estado) =>
        Ok(await _service.ListAsync(channelId, estado));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LeadDto>> Get(Guid id) => Ok(await _service.GetAsync(id));

    [HttpPost]
    public async Task<ActionResult<LeadDto>> Create([FromBody] CreateLeadRequest request)
    {
        var lead = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = lead.Id }, lead);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LeadDto>> Update(Guid id, [FromBody] UpdateLeadRequest request) =>
        Ok(await _service.UpdateAsync(id, request));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>Crea el tenant a partir del lead y lo marca Activado.</summary>
    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<PlatformTenantDto>> Activate(Guid id, [FromBody] ActivateLeadRequest request) =>
        Ok(await _service.ActivateAsync(id, request));
}
