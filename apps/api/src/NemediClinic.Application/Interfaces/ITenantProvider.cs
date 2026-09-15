namespace NemediClinic.Application.Interfaces;

public interface ITenantProvider
{
    Guid TenantId { get; }

    void SetTenant(Guid tenantId);
}
