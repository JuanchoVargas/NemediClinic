using NemediClinic.Infrastructure.Services;

namespace NemediClinic.Api.Middleware;

/// <summary>
/// Mientras el JWT lleve el claim pwd_change (usuario recién creado o con la clave restablecida),
/// la API solo responde /api/v1/auth/* (change-password, refresh, login), branding y health.
/// El bloqueo de la web es comodidad; el que cuenta es este: una clave temporal filtrada no
/// sirve para leer datos.
/// </summary>
public class PasswordChangeMiddleware
{
    private readonly RequestDelegate _next;

    public PasswordChangeMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var mustChange = context.User?.Identity?.IsAuthenticated == true
            && context.User.HasClaim(c => c.Type == JwtService.PasswordChangeClaim);

        var path = context.Request.Path;
        var allowed = path.StartsWithSegments("/api/v1/auth")
            || path.StartsWithSegments("/api/v1/branding")
            || path.StartsWithSegments("/api/health");

        if (mustChange && !allowed)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Debes cambiar tu contraseña antes de continuar.", code = "password_change_required" });
            return;
        }

        await _next(context);
    }
}
