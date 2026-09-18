using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Oportunidades por canal. Regla central: un NIT registrado por un canal queda protegido
/// 90 días; mientras no se libere, otro canal no lo puede registrar (409).
/// </summary>
public class LeadService
{
    private readonly AppDbContext _db;
    private readonly PlatformTenantService _tenants;

    public LeadService(AppDbContext db, PlatformTenantService tenants)
    {
        _db = db;
        _tenants = tenants;
    }

    public async Task<List<LeadDto>> ListAsync(Guid? channelId, LeadEstado? estado)
    {
        await ReleaseExpiredAsync();

        var query = _db.Leads.AsNoTracking().Include(l => l.Channel).AsQueryable();
        if (channelId.HasValue) query = query.Where(l => l.ChannelId == channelId.Value);
        if (estado.HasValue) query = query.Where(l => l.Estado == estado.Value);

        var leads = await query.OrderByDescending(l => l.FechaRegistro).ToListAsync();
        return leads.Select(ToDto).ToList();
    }

    public async Task<LeadDto> GetAsync(Guid id)
    {
        await ReleaseExpiredAsync();
        var lead = await _db.Leads.AsNoTracking().Include(l => l.Channel).FirstOrDefaultAsync(l => l.Id == id)
            ?? throw ApiException.NotFound("Oportunidad no encontrada.");
        return ToDto(lead);
    }

    public async Task<LeadDto> CreateAsync(CreateLeadRequest request)
    {
        await ReleaseExpiredAsync();

        var channel = await _db.Channels.FirstOrDefaultAsync(c => c.Id == request.ChannelId && c.Activo)
            ?? throw ApiException.BadRequest("El canal no existe o está inactivo.");

        var nit = NormalizeNit(request.NIT);

        // Vigente = Registrado (protegido) o Activado (ya es cliente). Liberado no bloquea.
        var vigente = await _db.Leads.Include(l => l.Channel)
            .Where(l => l.NIT == nit && l.Estado != LeadEstado.Liberado)
            .OrderByDescending(l => l.FechaRegistro)
            .FirstOrDefaultAsync();

        if (vigente is not null)
        {
            if (vigente.Estado == LeadEstado.Activado)
                throw ApiException.Conflict($"El NIT {nit} ya es cliente activo del canal {vigente.Channel.Nombre}.");

            throw ApiException.Conflict(vigente.ChannelId == channel.Id
                ? $"El NIT {nit} ya está registrado por este canal ({channel.Nombre}); protegido hasta el {vigente.FechaLiberacion:yyyy-MM-dd}."
                : $"El NIT {nit} ya está registrado por el canal {vigente.Channel.Nombre} y se libera el {vigente.FechaLiberacion:yyyy-MM-dd}.");
        }

        if (await _db.Tenants.AnyAsync(t => t.NIT == nit))
            throw ApiException.Conflict($"El NIT {nit} ya corresponde a un tenant existente.");

        var ahora = DateTime.Now;
        var lead = new Lead
        {
            Nombre = request.Nombre.Trim(),
            NIT = nit,
            Ciudad = request.Ciudad.Trim(),
            Contacto = request.Contacto.Trim(),
            ChannelId = channel.Id,
            FechaRegistro = ahora,
            FechaLiberacion = ahora.AddDays(Lead.DiasProteccion),
            Estado = LeadEstado.Registrado
        };
        _db.Leads.Add(lead);
        await _db.SaveChangesAsync();

        return await GetAsync(lead.Id);
    }

    public async Task<LeadDto> UpdateAsync(Guid id, UpdateLeadRequest request)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id)
            ?? throw ApiException.NotFound("Oportunidad no encontrada.");

        if (request.Nombre is not null) lead.Nombre = request.Nombre.Trim();
        if (request.Ciudad is not null) lead.Ciudad = request.Ciudad.Trim();
        if (request.Contacto is not null) lead.Contacto = request.Contacto.Trim();

        if (request.Liberar)
        {
            if (lead.Estado != LeadEstado.Registrado)
                throw ApiException.Conflict("Solo se puede liberar una oportunidad en estado Registrado.");
            lead.Estado = LeadEstado.Liberado;
            lead.FechaLiberacion = DateTime.Now;
        }

        await _db.SaveChangesAsync();
        return await GetAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id)
            ?? throw ApiException.NotFound("Oportunidad no encontrada.");

        if (lead.Estado == LeadEstado.Activado)
            throw ApiException.Conflict("No se puede eliminar una oportunidad activada: ya tiene un tenant asociado.");

        _db.Leads.Remove(lead);
        await _db.SaveChangesAsync();
    }

    /// <summary>Crea el tenant a partir del lead (canal, nombre y NIT salen del lead) y lo marca Activado.</summary>
    public async Task<PlatformTenantDto> ActivateAsync(Guid id, ActivateLeadRequest request)
    {
        await ReleaseExpiredAsync();

        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.Id == id)
            ?? throw ApiException.NotFound("Oportunidad no encontrada.");

        if (lead.Estado == LeadEstado.Activado)
            throw ApiException.Conflict("Esta oportunidad ya fue activada.");
        if (lead.Estado == LeadEstado.Liberado)
            throw ApiException.Conflict("La oportunidad está liberada (venció la protección). Regístrala de nuevo antes de activarla.");

        var tenant = await _tenants.CreateEntityAsync(
            lead.Nombre, lead.NIT, request.Telefono, request.Email, lead.ChannelId,
            request.Plan, request.SedesAdicionales, request.EsIps, TenantEstado.Activo, request.PorcentajeCanalOverride);

        lead.Estado = LeadEstado.Activado;
        lead.TenantId = tenant.Id;

        // Un solo SaveChanges = una sola transacción: tenant y lead quedan consistentes.
        await _db.SaveChangesAsync();
        return await _tenants.GetAsync(tenant.Id);
    }

    /// <summary>Liberación perezosa: al leer/escribir, los Registrado con protección vencida pasan a Liberado.</summary>
    private Task<int> ReleaseExpiredAsync()
    {
        var ahora = DateTime.Now;
        return _db.Leads
            .Where(l => l.Estado == LeadEstado.Registrado && l.FechaLiberacion <= ahora)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.Estado, LeadEstado.Liberado));
    }

    private static string NormalizeNit(string nit) => nit.Trim().Replace(".", string.Empty).Replace(" ", string.Empty);

    private static LeadDto ToDto(Lead l) => new()
    {
        Id = l.Id,
        Nombre = l.Nombre,
        NIT = l.NIT,
        Ciudad = l.Ciudad,
        Contacto = l.Contacto,
        ChannelId = l.ChannelId,
        Canal = l.Channel.Nombre,
        FechaRegistro = l.FechaRegistro,
        FechaLiberacion = l.FechaLiberacion,
        DiasProteccionRestantes = l.Estado == LeadEstado.Registrado
            ? Math.Max(0, (int)Math.Ceiling((l.FechaLiberacion - DateTime.Now).TotalDays))
            : 0,
        Estado = l.Estado.ToString(),
        TenantId = l.TenantId
    };
}
