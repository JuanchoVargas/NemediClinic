using NemediClinic.Api.Services;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Middleware;

/// <summary>
/// Tenant Suspendido = solo lectura. Cualquier request de escritura (todo lo que no sea
/// GET/HEAD/OPTIONS) de un usuario de ese tenant responde 423. Las lecturas pasan.
/// </summary>
public class TenantStatusMiddleware
{
    private readonly RequestDelegate _next;

    public TenantStatusMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, TenantStatusCache statusCache)
    {
        var method = context.Request.Method;
        var isWrite = !(HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method));

        if (isWrite
            && context.User?.Identity?.IsAuthenticated == true
            && Guid.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId)
            && await statusCache.GetEstadoAsync(tenantId) == TenantEstado.Suspendido)
        {
            context.Response.StatusCode = StatusCodes.Status423Locked;
            await context.Response.WriteAsJsonAsync(new { error = "Cuenta suspendida por mora" });
            return;
        }

        await _next(context);
    }
}
