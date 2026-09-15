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

        if (context.User?.Identity?.IsAuthenticated == true && tenantClaim is null)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Missing tenant_id claim." });
            return;
        }

        await _next(context);
    }
}
