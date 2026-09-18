using NemediClinic.Domain.Entities;

namespace NemediClinic.Api.Middleware;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var tenantClaim = context.User?.FindFirst("tenant_id");

        // El PlatformAdmin vive fuera de todo tenant: su JWT no lleva tenant_id.
        var isPlatformAdmin = context.User?.IsInRole(PlatformAdmin.RoleName) == true;

        // ...y por eso mismo solo entra a la plataforma. Algunos controllers de clínica usan
        // [Authorize] sin política de rol (p. ej. GET products): se cierra aquí, en un solo lugar.
        if (isPlatformAdmin && !IsPlatformPath(context.Request.Path))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "El administrador de plataforma no accede a datos de las clínicas." });
            return;
        }

        if (context.User?.Identity?.IsAuthenticated == true && tenantClaim is null && !isPlatformAdmin)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Missing tenant_id claim." });
            return;
        }

        await _next(context);
    }

    private static bool IsPlatformPath(PathString path) =>
        path.StartsWithSegments("/api/v1/platform")
        || path.StartsWithSegments("/api/v1/auth")
        || path.StartsWithSegments("/api/v1/branding")
        || path.StartsWithSegments("/api/health");
}
