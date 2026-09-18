using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Controllers.Platform;

[ApiController]
[Route("api/v1/platform/liquidacion")]
[Authorize(Policy = "PlatformAdmin")]
public class PlatformLiquidacionController : ControllerBase
{
    private readonly LiquidacionService _service;

    public PlatformLiquidacionController(LiquidacionService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<LiquidacionDto>> Get([FromQuery] string mes) => Ok(await _service.GetAsync(mes));
}
