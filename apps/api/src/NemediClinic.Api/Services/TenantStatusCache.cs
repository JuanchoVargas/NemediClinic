using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Estado comercial del tenant con caché corta (evita un SELECT por cada escritura).
/// Los endpoints de plataforma llaman Invalidate() al cambiar el estado, así la
/// suspensión aplica de inmediato en esta instancia.
/// </summary>
public class TenantStatusCache
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(60);
    private readonly IMemoryCache _cache;
    private readonly AppDbContext _db;

    public TenantStatusCache(IMemoryCache cache, AppDbContext db)
    {
        _cache = cache;
        _db = db;
    }

    private static string Key(Guid tenantId) => $"tenant-estado:{tenantId}";

    public async Task<TenantEstado?> GetEstadoAsync(Guid tenantId)
    {
        if (_cache.TryGetValue<TenantEstado?>(Key(tenantId), out var cached))
            return cached;

        var estado = await _db.Tenants.AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => (TenantEstado?)t.Estado)
            .FirstOrDefaultAsync();

        _cache.Set(Key(tenantId), estado, Ttl);
        return estado;
    }

    public void Invalidate(Guid tenantId) => _cache.Remove(Key(tenantId));
}
