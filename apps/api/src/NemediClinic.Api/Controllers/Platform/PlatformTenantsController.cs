using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Controllers.Platform;

// Controllers delgados: reciben, llaman al service y responden. Los errores de negocio
// viajan como ApiException y ApiExceptionFilter los convierte en { error }.

[ApiController]
[Route("api/v1/platform/tenants")]
[Authorize(Policy = "PlatformAdmin")]
public class PlatformTenantsController : ControllerBase
{
    private readonly PlatformTenantService _service;

    public PlatformTenantsController(PlatformTenantService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<PlatformTenantDto>>> List(
        [FromQuery] Guid? channelId, [FromQuery] TenantEstado? estado, [FromQuery] string? search) =>
        Ok(await _service.ListAsync(channelId, estado, search));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PlatformTenantDto>> Get(Guid id) => Ok(await _service.GetAsync(id));

    [HttpPost]
    public async Task<ActionResult<PlatformTenantDto>> Create([FromBody] CreatePlatformTenantRequest request)
    {
        var tenant = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = tenant.Id }, tenant);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PlatformTenantDto>> Update(Guid id, [FromBody] UpdatePlatformTenantRequest request) =>
        Ok(await _service.UpdateAsync(id, request));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>Crea la Sede Principal (si falta) y el primer SuperAdmin. Devuelve la contraseña temporal una sola vez.</summary>
    [HttpPost("{id:guid}/bootstrap-admin")]
    public async Task<ActionResult<BootstrapAdminResponse>> BootstrapAdmin(Guid id, [FromBody] BootstrapAdminRequest request) =>
        Ok(await _service.BootstrapAdminAsync(id, request));
}
