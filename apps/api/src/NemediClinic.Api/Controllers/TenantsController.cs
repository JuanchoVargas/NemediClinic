using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Tenants;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "SuperAdmin")]
public class TenantsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TenantsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PagedRequest request)
    {
        var query = _db.Tenants.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(t =>
                t.Nombre.ToLower().Contains(search) ||
                t.NIT.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var tenants = await query
            .OrderBy(t => t.Nombre)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(t => new TenantDto
            {
                Id = t.Id,
                Nombre = t.Nombre,
                NIT = t.NIT,
                Telefono = t.Telefono,
                Email = t.Email,
                Logo = t.Logo,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResponse<TenantDto>
        {
            Items = tenants,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenant = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new TenantDto
            {
                Id = t.Id,
                Nombre = t.Nombre,
                NIT = t.NIT,
                Telefono = t.Telefono,
                Email = t.Email,
                Logo = t.Logo,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (tenant is null)
            return NotFound(new { error = "Tenant no encontrado." });

        return Ok(tenant);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest request)
    {
        var nitExists = await _db.Tenants.AnyAsync(t => t.NIT == request.NIT);
        if (nitExists)
            return Conflict(new { error = "Ya existe un tenant con ese NIT." });

        var tenant = new Tenant
        {
            Nombre = request.Nombre,
            NIT = request.NIT,
            Telefono = request.Telefono,
            Email = request.Email,
            TenantId = Guid.NewGuid() // self-referencing: TenantId == Id
        };
        tenant.TenantId = tenant.Id;

        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, new TenantDto
        {
            Id = tenant.Id,
            Nombre = tenant.Nombre,
            NIT = tenant.NIT,
            Telefono = tenant.Telefono,
            Email = tenant.Email,
            Logo = tenant.Logo,
            IsActive = tenant.IsActive,
            CreatedAt = tenant.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTenantRequest request)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant is null)
            return NotFound(new { error = "Tenant no encontrado." });

        if (request.NIT is not null && request.NIT != tenant.NIT)
        {
            var nitTaken = await _db.Tenants.AnyAsync(t => t.NIT == request.NIT && t.Id != id);
            if (nitTaken)
                return Conflict(new { error = "Ya existe un tenant con ese NIT." });
            tenant.NIT = request.NIT;
        }

        if (request.Nombre is not null) tenant.Nombre = request.Nombre;
        if (request.Telefono is not null) tenant.Telefono = request.Telefono;
        if (request.Email is not null) tenant.Email = request.Email;
        if (request.Logo is not null) tenant.Logo = request.Logo;
        if (request.IsActive.HasValue) tenant.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant is null)
            return NotFound(new { error = "Tenant no encontrado." });

        tenant.IsDeleted = true;
        tenant.IsActive = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
