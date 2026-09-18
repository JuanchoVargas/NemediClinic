using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Valuations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Controllers;

// Valorar (crear, editar, rechazar) lo hace cualquier rol de clínica; convertir y eliminar son de
// Admin, igual que asignar paquetes (PatientPackagesController).
[ApiController]
[Route("api/v1/valuations")]
[Authorize(Policy = "Esteticista")]
public class ValuationsController : ControllerBase
{
    private readonly ValuationService _service;

    public ValuationsController(ValuationService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<ValuationDto>>> List(
        [FromQuery] ValuationEstado? estado, [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta,
        [FromQuery] string? search, CancellationToken ct) =>
        Ok(await _service.ListAsync(estado, desde, hasta, search, ct));

    /// <summary>Embudo del mes (YYYY-MM; por defecto el mes en curso) y tasa de conversión.</summary>
    [HttpGet("stats")]
    public async Task<ActionResult<ValuationStatsDto>> Stats([FromQuery] string? mes, CancellationToken ct) =>
        Ok(await _service.GetStatsAsync(mes, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ValuationDto>> Get(Guid id, CancellationToken ct) => Ok(await _service.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<ValuationDto>> Create([FromBody] SaveValuationRequest request, CancellationToken ct)
    {
        var dto = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ValuationDto>> Update(Guid id, [FromBody] SaveValuationRequest request, CancellationToken ct) =>
        Ok(await _service.UpdateAsync(id, request, ct));

    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult<ValuationDto>> Reject(Guid id, [FromBody] RejectValuationRequest request, CancellationToken ct) =>
        Ok(await _service.RejectAsync(id, request.Motivo, ct));

    /// <summary>Aceptó: crea el paciente si era prospecto y le asigna el paquete cotizado.</summary>
    [HttpPost("{id:guid}/convert")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<ConvertValuationResponse>> Convert(Guid id, [FromBody] ConvertValuationRequest request, CancellationToken ct) =>
        Ok(await _service.ConvertAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}
