using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Platform;

namespace NemediClinic.Api.Middleware;

/// <summary>
/// Resuelve el branding por el Host de la request y lo deja en HttpContext.Items.
/// Detrás de Caddy el Host original llega por X-Forwarded-Host (UseForwardedHeaders lo aplica).
/// Solo en Development se acepta ?host= / X-Branding-Host para probar sin tocar el archivo hosts.
/// </summary>
public class BrandingMiddleware
{
    public const string ItemKey = "Branding";
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _env;

    public BrandingMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context, BrandingResolver resolver)
    {
        // Solo lo consume el endpoint público; evita una consulta en el resto de requests.
        if (context.Request.Path.StartsWithSegments("/api/v1/branding"))
        {
            var host = context.Request.Host.Host;
            if (_env.IsDevelopment())
            {
                var overrideHost = context.Request.Query["host"].FirstOrDefault()
                    ?? context.Request.Headers["X-Branding-Host"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(overrideHost))
                    host = overrideHost;
            }
            context.Items[ItemKey] = await resolver.ResolveAsync(host);
        }

        await _next(context);
    }
}

public static class BrandingHttpContextExtensions
{
    public static BrandingDto? GetBranding(this HttpContext context) =>
        context.Items.TryGetValue(BrandingMiddleware.ItemKey, out var value) ? value as BrandingDto : null;
}
