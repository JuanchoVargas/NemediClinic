using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Packages;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = "Admin")]
public class PackagesController : ControllerBase
{
    private readonly AppDbContext _db;

    public PackagesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PagedRequest request)
    {
        var query = _db.Packages.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(p => p.Nombre.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var packages = await query
            .OrderBy(p => p.Nombre)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PackageDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                PrecioTotal = p.PrecioTotal,
                SesionesTotales = p.SesionesTotales,
                VigenciaDias = p.VigenciaDias,
                DiasAlertaVencimiento = p.DiasAlertaVencimiento,
                Activo = p.Activo,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResponse<PackageDto>
        {
            Items = packages,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var package = await _db.Packages
            .AsNoTracking()
            .Include(p => p.PackageProcedures)
                .ThenInclude(pp => pp.Procedure)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (package is null)
            return NotFound(new { error = "Paquete no encontrado." });

        return Ok(new PackageDto
        {
            Id = package.Id,
            Nombre = package.Nombre,
            Descripcion = package.Descripcion,
            PrecioTotal = package.PrecioTotal,
            SesionesTotales = package.SesionesTotales,
            VigenciaDias = package.VigenciaDias,
            DiasAlertaVencimiento = package.DiasAlertaVencimiento,
            Activo = package.Activo,
            CreatedAt = package.CreatedAt,
            Procedimientos = package.PackageProcedures.Select(pp => new PackageProcedureDto
            {
                ProcedureId = pp.ProcedureId,
                ProcedureNombre = pp.Procedure.Nombre,
                CantidadSesiones = pp.CantidadSesiones
            }).ToList()
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePackageRequest request)
    {
        var package = new Package
        {
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            PrecioTotal = request.PrecioTotal,
            SesionesTotales = request.SesionesTotales,
            VigenciaDias = request.VigenciaDias,
            DiasAlertaVencimiento = request.DiasAlertaVencimiento
        };

        _db.Packages.Add(package);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = package.Id }, new PackageDto
        {
            Id = package.Id,
            Nombre = package.Nombre,
            Descripcion = package.Descripcion,
            PrecioTotal = package.PrecioTotal,
            SesionesTotales = package.SesionesTotales,
            VigenciaDias = package.VigenciaDias,
            DiasAlertaVencimiento = package.DiasAlertaVencimiento,
            Activo = package.Activo,
            CreatedAt = package.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePackageRequest request)
    {
        var package = await _db.Packages.FindAsync(id);
        if (package is null)
            return NotFound(new { error = "Paquete no encontrado." });

        if (request.Nombre is not null) package.Nombre = request.Nombre;
        if (request.Descripcion is not null) package.Descripcion = request.Descripcion;
        if (request.PrecioTotal.HasValue) package.PrecioTotal = request.PrecioTotal.Value;
        if (request.SesionesTotales.HasValue) package.SesionesTotales = request.SesionesTotales.Value;
        if (request.VigenciaDias.HasValue) package.VigenciaDias = request.VigenciaDias.Value;
        if (request.DiasAlertaVencimiento.HasValue) package.DiasAlertaVencimiento = request.DiasAlertaVencimiento.Value;
        if (request.Activo.HasValue) package.Activo = request.Activo.Value;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var package = await _db.Packages.FindAsync(id);
        if (package is null)
            return NotFound(new { error = "Paquete no encontrado." });

        package.IsDeleted = true;
        package.Activo = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id:guid}/procedures")]
    public async Task<IActionResult> GetProcedures(Guid id)
    {
        var exists = await _db.Packages.AnyAsync(p => p.Id == id);
        if (!exists)
            return NotFound(new { error = "Paquete no encontrado." });

        var procedures = await _db.PackageProcedures
            .AsNoTracking()
            .Where(pp => pp.PackageId == id)
            .Select(pp => new PackageProcedureDto
            {
                ProcedureId = pp.ProcedureId,
                ProcedureNombre = pp.Procedure.Nombre,
                CantidadSesiones = pp.CantidadSesiones
            })
            .ToListAsync();

        return Ok(procedures);
    }

    [HttpPost("{id:guid}/procedures")]
    public async Task<IActionResult> AddProcedure(Guid id, [FromBody] AddPackageProcedureRequest request)
    {
        var package = await _db.Packages.AnyAsync(p => p.Id == id);
        if (!package)
            return NotFound(new { error = "Paquete no encontrado." });

        var procedureExists = await _db.Procedures.AnyAsync(p => p.Id == request.ProcedureId);
        if (!procedureExists)
            return BadRequest(new { error = "Procedimiento no encontrado." });

        var alreadyLinked = await _db.PackageProcedures
            .AnyAsync(pp => pp.PackageId == id && pp.ProcedureId == request.ProcedureId);
        if (alreadyLinked)
            return Conflict(new { error = "El procedimiento ya está asociado a este paquete." });

        var packageProcedure = new PackageProcedure
        {
            PackageId = id,
            ProcedureId = request.ProcedureId,
            CantidadSesiones = request.CantidadSesiones
        };

        _db.PackageProcedures.Add(packageProcedure);
        await _db.SaveChangesAsync();

        return Created($"api/v1/packages/{id}/procedures", new PackageProcedureDto
        {
            ProcedureId = request.ProcedureId,
            CantidadSesiones = request.CantidadSesiones
        });
    }
}
