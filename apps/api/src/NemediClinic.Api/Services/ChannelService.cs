using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

public class ChannelService
{
    private readonly AppDbContext _db;
    private readonly BrandingResolver _branding;

    public ChannelService(AppDbContext db, BrandingResolver branding)
    {
        _db = db;
        _branding = branding;
    }

    public async Task<List<ChannelDto>> ListAsync()
    {
        var channels = await _db.Channels.AsNoTracking().OrderBy(c => c.Nombre).ToListAsync();
        var counts = await _db.Tenants.AsNoTracking()
            .GroupBy(t => t.ChannelId)
            .Select(g => new { ChannelId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ChannelId, x => x.Count);

        return channels.Select(c => ToDto(c, counts.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<ChannelDto> GetAsync(Guid id)
    {
        var channel = await _db.Channels.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id)
            ?? throw ApiException.NotFound("Canal no encontrado.");
        var count = await _db.Tenants.CountAsync(t => t.ChannelId == id);
        return ToDto(channel, count);
    }

    public async Task<ChannelDto> CreateAsync(SaveChannelRequest request)
    {
        await EnsureUniqueAsync(request, null);

        var channel = new Channel();
        Apply(channel, request);
        _db.Channels.Add(channel);
        await _db.SaveChangesAsync();
        _branding.Invalidate();
        return ToDto(channel, 0);
    }

    public async Task<ChannelDto> UpdateAsync(Guid id, SaveChannelRequest request)
    {
        var channel = await _db.Channels.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw ApiException.NotFound("Canal no encontrado.");

        await EnsureUniqueAsync(request, id);
        Apply(channel, request);
        await _db.SaveChangesAsync();
        _branding.Invalidate();
        return await GetAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var channel = await _db.Channels.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw ApiException.NotFound("Canal no encontrado.");

        if (id == AppDbContext.NemediChannelId)
            throw ApiException.Conflict("El canal Nemedi es el canal por defecto y no se puede eliminar.");

        // IgnoreQueryFilters: un tenant eliminado (soft delete) sigue apuntando al canal por FK.
        if (await _db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.ChannelId == id)
            || await _db.Leads.AnyAsync(l => l.ChannelId == id))
            throw ApiException.Conflict("El canal tiene tenants u oportunidades asociados. Desactívalo en lugar de eliminarlo.");

        _db.Channels.Remove(channel);
        await _db.SaveChangesAsync();
        _branding.Invalidate();
    }

    private async Task EnsureUniqueAsync(SaveChannelRequest request, Guid? id)
    {
        var slug = request.Slug.Trim().ToLowerInvariant();
        var dominio = request.Dominio.Trim().ToLowerInvariant();

        if (await _db.Channels.AnyAsync(c => c.Slug == slug && c.Id != id))
            throw ApiException.Conflict($"Ya existe un canal con el slug {slug}.");
        if (await _db.Channels.AnyAsync(c => c.Dominio == dominio && c.Id != id))
            throw ApiException.Conflict($"Ya existe un canal con el dominio {dominio}.");
    }

    private static void Apply(Channel channel, SaveChannelRequest request)
    {
        channel.Nombre = request.Nombre.Trim();
        channel.Slug = request.Slug.Trim().ToLowerInvariant();
        channel.NombreComercial = request.NombreComercial.Trim();
        channel.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();
        channel.ColorPrimario = request.ColorPrimario;
        channel.ColorSecundario = request.ColorSecundario;
        channel.Dominio = request.Dominio.Trim().ToLowerInvariant();
        channel.PorcentajeCanal = request.PorcentajeCanal;
        channel.Activo = request.Activo;
    }

    private static ChannelDto ToDto(Channel c, int tenants) => new()
    {
        Id = c.Id,
        Nombre = c.Nombre,
        Slug = c.Slug,
        Branding = BrandingResolver.ToDto(c),
        PorcentajeCanal = c.PorcentajeCanal,
        Activo = c.Activo,
        Tenants = tenants,
        CreatedAt = c.CreatedAt
    };
}
