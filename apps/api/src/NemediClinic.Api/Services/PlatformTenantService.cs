using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Tenants vistos desde la plataforma. Es un flujo cross-tenant legítimo: usa
/// IgnoreQueryFilters y fija el tenant con SetTenant antes de guardar, igual que auth/seed.
/// </summary>
public class PlatformTenantService
{
    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenantProvider;
    private readonly TenantStatusCache _statusCache;

    public PlatformTenantService(AppDbContext db, ITenantProvider tenantProvider, TenantStatusCache statusCache)
    {
        _db = db;
        _tenantProvider = tenantProvider;
        _statusCache = statusCache;
    }

    public async Task<List<PlatformTenantDto>> ListAsync(Guid? channelId, TenantEstado? estado, string? search)
    {
        var query = _db.Tenants.AsNoTracking().Include(t => t.Channel).AsQueryable();

        if (channelId.HasValue)
            query = query.Where(t => t.ChannelId == channelId.Value);
        if (estado.HasValue)
            query = query.Where(t => t.Estado == estado.Value);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Nombre.Contains(search) || t.NIT.Contains(search));

        var tenants = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        var conSuperAdmin = await TenantsConSuperAdminAsync(tenants.Select(t => t.Id).ToList());

        return tenants.Select(t => ToDto(t, conSuperAdmin.Contains(t.Id))).ToList();
    }

    public async Task<PlatformTenantDto> GetAsync(Guid id)
    {
        var tenant = await _db.Tenants.AsNoTracking().Include(t => t.Channel).FirstOrDefaultAsync(t => t.Id == id)
            ?? throw ApiException.NotFound("Tenant no encontrado.");
        var conSuperAdmin = await TenantsConSuperAdminAsync([id]);
        return ToDto(tenant, conSuperAdmin.Contains(id));
    }

    public async Task<PlatformTenantDto> CreateAsync(CreatePlatformTenantRequest request)
    {
        var tenant = await CreateEntityAsync(
            request.Nombre, request.NIT, request.Telefono, request.Email, request.ChannelId,
            request.Plan, request.SedesAdicionales, request.EsIps, request.Estado, request.PorcentajeCanalOverride);
        await _db.SaveChangesAsync();
        return await GetAsync(tenant.Id);
    }

    /// <summary>Agrega el tenant al contexto SIN guardar (lo reutiliza la activación de leads en su transacción).</summary>
    public async Task<Tenant> CreateEntityAsync(
        string nombre, string nit, string telefono, string email, Guid channelId,
        TenantPlan plan, int sedesAdicionales, bool esIps, TenantEstado estado, decimal? porcentajeOverride)
    {
        if (!await _db.Channels.AnyAsync(c => c.Id == channelId && c.Activo))
            throw ApiException.BadRequest("El canal no existe o está inactivo.");

        var nitNormalizado = nit.Trim();
        if (await _db.Tenants.AnyAsync(t => t.NIT == nitNormalizado))
            throw ApiException.Conflict($"Ya existe un tenant con el NIT {nitNormalizado}.");

        var tenant = new Tenant
        {
            Nombre = nombre.Trim(),
            NIT = nitNormalizado,
            Telefono = telefono.Trim(),
            Email = email.Trim(),
            ChannelId = channelId,
            Plan = plan,
            SedesAdicionales = sedesAdicionales,
            EsIps = esIps,
            Estado = estado,
            FechaActivacion = DateTime.Now,
            PorcentajeCanalOverride = porcentajeOverride
        };

        // SaveChangesAsync estampa TenantId con el del provider: el tenant es su propio TenantId.
        _tenantProvider.SetTenant(tenant.Id);
        _db.Tenants.Add(tenant);
        return tenant;
    }

    public async Task<PlatformTenantDto> UpdateAsync(Guid id, UpdatePlatformTenantRequest request)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw ApiException.NotFound("Tenant no encontrado.");

        if (request.ChannelId.HasValue && request.ChannelId != tenant.ChannelId)
        {
            if (!await _db.Channels.AnyAsync(c => c.Id == request.ChannelId.Value))
                throw ApiException.BadRequest("El canal no existe.");
            tenant.ChannelId = request.ChannelId.Value;
        }

        if (request.NIT is not null && request.NIT.Trim() != tenant.NIT)
        {
            var nit = request.NIT.Trim();
            if (await _db.Tenants.AnyAsync(t => t.NIT == nit && t.Id != id))
                throw ApiException.Conflict($"Ya existe un tenant con el NIT {nit}.");
            tenant.NIT = nit;
        }

        if (request.Nombre is not null) tenant.Nombre = request.Nombre.Trim();
        if (request.Telefono is not null) tenant.Telefono = request.Telefono.Trim();
        if (request.Email is not null) tenant.Email = request.Email.Trim();
        if (request.Plan.HasValue) tenant.Plan = request.Plan.Value;
        if (request.SedesAdicionales.HasValue) tenant.SedesAdicionales = request.SedesAdicionales.Value;
        if (request.EsIps.HasValue) tenant.EsIps = request.EsIps.Value;
        if (request.Estado.HasValue) tenant.Estado = request.Estado.Value;
        if (request.QuitarOverride) tenant.PorcentajeCanalOverride = null;
        else if (request.PorcentajeCanalOverride.HasValue) tenant.PorcentajeCanalOverride = request.PorcentajeCanalOverride;

        await _db.SaveChangesAsync();
        _statusCache.Invalidate(id);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw ApiException.NotFound("Tenant no encontrado.");

        tenant.IsDeleted = true;
        tenant.IsActive = false;
        await _db.SaveChangesAsync();
        _statusCache.Invalidate(id);
    }

    public async Task<BootstrapAdminResponse> BootstrapAdminAsync(Guid id, BootstrapAdminRequest request)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id)
            ?? throw ApiException.NotFound("Tenant no encontrado.");

        var yaTieneSuperAdmin = await _db.Users.IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == id && u.Rol == UserRole.SuperAdmin && !u.IsDeleted);
        if (yaTieneSuperAdmin)
            throw ApiException.Conflict("Este tenant ya tiene un SuperAdmin. Los demás usuarios se crean desde la clínica.");

        // El login busca por correo en TODOS los tenants: el correo debe ser único a nivel global.
        var email = request.AdminEmail.Trim();
        var emailEnUso = await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == email && !u.IsDeleted)
            || await _db.PlatformAdmins.AnyAsync(a => a.Email == email);
        if (emailEnUso)
            throw ApiException.Conflict($"El correo {email} ya está en uso.");

        _tenantProvider.SetTenant(tenant.Id);
        await using var tx = await _db.Database.BeginTransactionAsync();

        var branch = await _db.Branches.IgnoreQueryFilters()
            .Where(b => b.TenantId == id && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .FirstOrDefaultAsync();
        if (branch is null)
        {
            branch = new Branch { Nombre = "Sede Principal", TenantId = id };
            _db.Branches.Add(branch);
        }

        var passwordTemporal = PasswordPolicy.GenerateTemporary(); // MustChangePassword = true por defecto
        var admin = new User
        {
            Nombre = request.AdminNombre.Trim(),
            Apellido = request.AdminApellido.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(passwordTemporal),
            Rol = UserRole.SuperAdmin,
            TenantId = id,
            BranchId = branch.Id
        };
        _db.Users.Add(admin);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return new BootstrapAdminResponse
        {
            TenantId = id,
            BranchId = branch.Id,
            UserId = admin.Id,
            Email = admin.Email,
            PasswordTemporal = passwordTemporal
        };
    }

    private async Task<HashSet<Guid>> TenantsConSuperAdminAsync(List<Guid> tenantIds)
    {
        var ids = await _db.Users.IgnoreQueryFilters()
            .Where(u => tenantIds.Contains(u.TenantId) && u.Rol == UserRole.SuperAdmin && !u.IsDeleted)
            .Select(u => u.TenantId)
            .Distinct()
            .ToListAsync();
        return ids.ToHashSet();
    }

    private static PlatformTenantDto ToDto(Tenant t, bool tieneSuperAdmin) => new()
    {
        Id = t.Id,
        Nombre = t.Nombre,
        NIT = t.NIT,
        Telefono = t.Telefono,
        Email = t.Email,
        ChannelId = t.ChannelId,
        Canal = t.Channel.Nombre,
        Plan = t.Plan.ToString(),
        SedesAdicionales = t.SedesAdicionales,
        EsIps = t.EsIps,
        Estado = t.Estado.ToString(),
        FechaActivacion = t.FechaActivacion,
        PorcentajeCanalOverride = t.PorcentajeCanalOverride,
        PorcentajeCanalEfectivo = t.PorcentajeCanalOverride ?? t.Channel.PorcentajeCanal,
        TieneSuperAdmin = tieneSuperAdmin,
        CreatedAt = t.CreatedAt
    };
}
