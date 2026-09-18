using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>Resuelve el canal (marca blanca) por el Host de la request. Fallback: Nemedi.</summary>
public class BrandingResolver
{
    private const string CacheKey = "branding:channels";
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    private static readonly BrandingDto Fallback = new()
    {
        Canal = "nemedi",
        NombreComercial = "NemediClinic",
        ColorPrimario = "#171717",
        ColorSecundario = "#737373",
        Dominio = string.Empty
    };

    private readonly IMemoryCache _cache;
    private readonly AppDbContext _db;

    public BrandingResolver(IMemoryCache cache, AppDbContext db)
    {
        _cache = cache;
        _db = db;
    }

    public async Task<BrandingDto> ResolveAsync(string? host)
    {
        var channels = await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = Ttl;
            return await _db.Channels.AsNoTracking().Where(c => c.Activo).ToListAsync();
        }) ?? [];

        var normalized = (host ?? string.Empty).Trim().ToLowerInvariant();
        var channel = channels.FirstOrDefault(c => c.Dominio.ToLowerInvariant() == normalized)
            ?? channels.FirstOrDefault(c => c.Id == AppDbContext.NemediChannelId)
            ?? channels.FirstOrDefault();

        return channel is null ? Fallback : ToDto(channel);
    }

    public void Invalidate() => _cache.Remove(CacheKey);

    public static BrandingDto ToDto(Channel c) => new()
    {
        Canal = c.Slug,
        NombreComercial = c.NombreComercial,
        LogoUrl = c.LogoUrl,
        ColorPrimario = c.ColorPrimario,
        ColorSecundario = c.ColorSecundario,
        Dominio = c.Dominio
    };
}
