using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Procedures;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ProceduresController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProceduresController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PagedRequest request)
    {
        var query = _db.Procedures.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(p =>
                p.Nombre.ToLower().Contains(search) ||
                p.AreaCorporal.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var procedures = await query
            .OrderBy(p => p.Nombre)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new ProcedureDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                PrecioBase = p.PrecioBase,
                DuracionMinutos = p.DuracionMinutos,
                AreaCorporal = p.AreaCorporal,
                Activo = p.Activo,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResponse<ProcedureDto>
        {
            Items = procedures,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var procedure = await _db.Procedures
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProcedureDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                PrecioBase = p.PrecioBase,
                DuracionMinutos = p.DuracionMinutos,
                AreaCorporal = p.AreaCorporal,
                Activo = p.Activo,
                CreatedAt = p.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (procedure is null)
            return NotFound(new { error = "Procedimiento no encontrado." });

        return Ok(procedure);
    }

    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProcedureRequest request)
    {
        var procedure = new Procedure
        {
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            PrecioBase = request.PrecioBase,
            DuracionMinutos = request.DuracionMinutos,
            AreaCorporal = request.AreaCorporal
        };

        _db.Procedures.Add(procedure);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = procedure.Id }, new ProcedureDto
        {
            Id = procedure.Id,
            Nombre = procedure.Nombre,
            Descripcion = procedure.Descripcion,
            PrecioBase = procedure.PrecioBase,
            DuracionMinutos = procedure.DuracionMinutos,
            AreaCorporal = procedure.AreaCorporal,
            Activo = procedure.Activo,
            CreatedAt = procedure.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProcedureRequest request)
    {
        var procedure = await _db.Procedures.FindAsync(id);
        if (procedure is null)
            return NotFound(new { error = "Procedimiento no encontrado." });

        if (request.Nombre is not null) procedure.Nombre = request.Nombre;
        if (request.Descripcion is not null) procedure.Descripcion = request.Descripcion;
        if (request.PrecioBase.HasValue) procedure.PrecioBase = request.PrecioBase.Value;
        if (request.DuracionMinutos.HasValue) procedure.DuracionMinutos = request.DuracionMinutos.Value;
        if (request.AreaCorporal is not null) procedure.AreaCorporal = request.AreaCorporal;
        if (request.Activo.HasValue) procedure.Activo = request.Activo.Value;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var procedure = await _db.Procedures.FindAsync(id);
        if (procedure is null)
            return NotFound(new { error = "Procedimiento no encontrado." });

        procedure.IsDeleted = true;
        procedure.Activo = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
