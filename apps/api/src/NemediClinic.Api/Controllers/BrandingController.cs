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
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public BrandingController(BrandingResolver resolver, IConfiguration config, IWebHostEnvironment env)
    {
        _resolver = resolver;
        _config = config;
        _env = env;
    }

    /// <summary>Branding del canal cuyo dominio coincide con el Host. Fallback: Nemedi.</summary>
    [HttpGet]
    public async Task<ActionResult<BrandingDto>> Get()
    {
        var branding = HttpContext.GetBranding() ?? await _resolver.ResolveAsync(Request.Host.Host);
        return Ok(branding);
    }

    /// <summary>
    /// Manifest de la PWA con el nombre y el color del canal: la app instalada se llama como la marca
    /// del dominio por el que se entró. En producción web y API comparten origen y las rutas son
    /// relativas; en desarrollo (Vite en otro puerto) la web manda ?origin= y, si es un origen
    /// permitido por CORS, start_url e iconos se resuelven contra él.
    /// </summary>
    [HttpGet("manifest.webmanifest")]
    public async Task<IActionResult> Manifest([FromQuery] string? origin)
    {
        var branding = HttpContext.GetBranding() ?? await _resolver.ResolveAsync(Request.Host.Host);
        var baseUrl = IsAllowedOrigin(origin) ? origin!.TrimEnd('/') : string.Empty;

        var manifest = new
        {
            name = branding.NombreComercial,
            // Bajo el icono caben ~12 caracteres: si el nombre es más largo, su primera palabra
            short_name = branding.NombreComercial.Length > 12 ? branding.NombreComercial.Split(' ')[0] : branding.NombreComercial,
            description = "Agenda, pacientes e historia clínica de la clínica.",
            lang = "es",
            start_url = baseUrl + "/dashboard",
            scope = baseUrl + "/",
            display = "standalone",
            orientation = "any",
            theme_color = branding.ColorPrimario,
            background_color = "#F7F6F3",
            icons = new object[]
            {
                new { src = baseUrl + "/icons/icon-192.png", sizes = "192x192", type = "image/png", purpose = "any" },
                new { src = baseUrl + "/icons/icon-512.png", sizes = "512x512", type = "image/png", purpose = "any" },
                new { src = baseUrl + "/icons/icon-maskable-512.png", sizes = "512x512", type = "image/png", purpose = "maskable" },
            },
        };

        Response.Headers.CacheControl = "public, max-age=3600";
        return new JsonResult(manifest) { ContentType = "application/manifest+json" };
    }

    private bool IsAllowedOrigin(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin) || !Uri.TryCreate(origin, UriKind.Absolute, out _))
            return false;

        var allowed = (_config["CORS_ORIGINS"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(o => o.TrimEnd('/'))
            .ToList();
        if (allowed.Count == 0 && _env.IsDevelopment())
            allowed = ["http://localhost:3000", "http://localhost:5173"];

        return allowed.Contains(origin.TrimEnd('/'), StringComparer.OrdinalIgnoreCase);
    }
}
