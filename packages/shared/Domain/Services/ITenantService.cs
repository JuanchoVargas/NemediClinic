namespace Nemedi.CRM.Domain.Services;

public interface ITenantService {
	string GetTenantId();
}

public class TenantService : ITenantService {
	private readonly IHttpContextAccessor _httpContextAccessor;

	/// <summary>
	/// Sentinel value returned when an HTTP request has no tenant context.
	/// Ensures global query filters match nothing instead of opening to all tenants.
	/// </summary>
	public const string NoTenantSentinel = "@@NO-TENANT@@";

	public TenantService(IHttpContextAccessor httpContextAccessor) {
		_httpContextAccessor = httpContextAccessor;
	}

	public string GetTenantId() {
		var httpContext = _httpContextAccessor.HttpContext;

		// No HTTP context (seeding, background jobs) → empty string matches nothing in strict filters
		// Use IgnoreQueryFilters() explicitly in seeding/background code that needs data access
		if (httpContext == null) return string.Empty;

		// 1. JWT claim "tenant_id" (primary source for authenticated users)
		var tenantId = httpContext.User?.FindFirst("tenant_id")?.Value;
		if (!string.IsNullOrEmpty(tenantId)) return tenantId;

		// 2. Fallback: X-Tenant-Id header (dev/seeding via HTTP)
		tenantId = httpContext.Request.Headers["X-Tenant-Id"].ToString();
		if (!string.IsNullOrEmpty(tenantId)) return tenantId;

		// 3. HTTP context exists but no tenant → hermetic mode
		// Return sentinel that won't match any real TenantId, so filters block all data
		return NoTenantSentinel;
	}
}