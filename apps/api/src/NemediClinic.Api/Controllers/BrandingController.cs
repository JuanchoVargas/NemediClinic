using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Middleware;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Platform;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/branding")]
[AllowAnonymous]
public class BrandingController : ControllerBase
{
    private readonly BrandingResolver _resolver;

    public BrandingController(BrandingResolver resolver)
    {
        _resolver = resolver;
    }

    /// <summary>Branding del canal cuyo dominio coincide con el Host. Fallback: Nemedi.</summary>
    [HttpGet]
    public async Task<ActionResult<BrandingDto>> Get()
    {
        var branding = HttpContext.GetBranding() ?? await _resolver.ResolveAsync(Request.Host.Host);
        return Ok(branding);
    }
}
