using NemediClinic.Application.Interfaces;

namespace NemediClinic.Api.Providers;

public class HttpTenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private Guid? _override;

    public HttpTenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid TenantId
    {
        get
        {
            if (_override.HasValue)
                return _override.Value;

            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id");
            return claim is not null && Guid.TryParse(claim.Value, out var tenantId)
                ? tenantId
                : Guid.Empty;
        }
    }

    public void SetTenant(Guid tenantId) => _override = tenantId;
}
