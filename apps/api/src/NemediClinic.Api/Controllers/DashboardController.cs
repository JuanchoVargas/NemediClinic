using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Dashboard;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize(Policy = "Esteticista")]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _service;

    public DashboardController(DashboardService service) => _service = service;

    /// <summary>desde/hasta en formato YYYY-MM-DD (por defecto, del día 1 del mes a hoy). branchId filtra las citas.</summary>
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get(
        [FromQuery] Guid? branchId, [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, CancellationToken ct)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
        return Ok(await _service.GetAsync(branchId, desde, hasta, role, userId, ct));
    }
}
