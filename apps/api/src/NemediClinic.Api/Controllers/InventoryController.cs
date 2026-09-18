using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Inventory;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryController(AppDbContext db)
    {
        _db = db;
    }

    // ── POST /api/v1/inventory/entries ────────────────────────────────
    [HttpPost("entries")]
    public async Task<IActionResult> RegisterEntry([FromBody] RegisterEntryRequest request)
    {
        if (request.Cantidad <= 0m)
            return BadRequest(new { error = "La cantidad debe ser mayor a cero." });

        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId);
        if (product is null)
            return BadRequest(new { error = "Producto no encontrado." });

        var userId = GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { error = "Token sin user id válido." });

        var fecha = request.FechaEntrada ?? DateTime.Now;

        await using var tx = await _db.Database.BeginTransactionAsync();

        var entry = new InventoryEntry
        {
            ProductId = product.Id,
            Cantidad = request.Cantidad,
            MotivoEntrada = request.MotivoEntrada,
            Observacion = request.Observacion,
            UserId = userId,
            FechaEntrada = fecha
        };
        _db.InventoryEntries.Add(entry);

        // Stock actual sube
        product.StockActual += request.Cantidad;

        // Movimiento espejo (tipo Entrada)
        var movement = new InventoryMovement
        {
            ProductId = product.Id,
            Cantidad = request.Cantidad,
            TipoMovimiento = MovementType.Entrada,
            Referencia = $"Entrada manual #{entry.Id.ToString()[..8]}",
            AppointmentId = null,
            PatientId = null,
            UserId = userId,
            FechaMovimiento = fecha
        };
        _db.InventoryMovements.Add(movement);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return CreatedAtAction(nameof(GetEntries), new { }, new { id = entry.Id });
    }

    // ── GET /api/v1/inventory/entries?Page=&PageSize=&productId=&from=&to= ─
    [HttpGet("entries")]
    public async Task<IActionResult> GetEntries(
        [FromQuery] PagedRequest request,
        [FromQuery] Guid? productId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = _db.InventoryEntries.AsNoTracking();

        if (productId.HasValue)
            query = query.Where(e => e.ProductId == productId.Value);
        if (from.HasValue)
            query = query.Where(e => e.FechaEntrada >= from.Value);
        if (to.HasValue)
            query = query.Where(e => e.FechaEntrada <= to.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(e => e.FechaEntrada)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(e => new InventoryEntryDto
            {
                Id = e.Id,
                ProductId = e.ProductId,
                ProductoNombre = e.Product.Nombre,
                UnidadMedida = e.Product.UnidadMedida,
                Cantidad = e.Cantidad,
                MotivoEntrada = e.MotivoEntrada.ToString(),
                Observacion = e.Observacion,
                FechaEntrada = e.FechaEntrada,
                UserId = e.UserId,
                UsuarioNombre = e.Usuario.Nombre + " " + e.Usuario.Apellido
            })
            .ToListAsync();

        return Ok(new PagedResponse<InventoryEntryDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    // ── GET /api/v1/inventory/movements?Page=&PageSize= ───────────────
    [HttpGet("movements")]
    public async Task<IActionResult> GetMovements([FromQuery] PagedRequest request)
    {
        var query = _db.InventoryMovements.AsNoTracking();

        var totalCount = await query.CountAsync();

        // Include + mapeo en memoria: MapToDto lee m.Product y dentro de un Select traducido por EF
        // llegaba null (500), igual que en movements/product/{id}.
        var rows = await query
            .Include(m => m.Product)
            .OrderByDescending(m => m.FechaMovimiento)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();
        var items = await WithPatientsAsync(rows);

        return Ok(new PagedResponse<InventoryMovementDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    // ── GET /api/v1/inventory/movements/product/{productId} ───────────
    [HttpGet("movements/product/{productId:guid}")]
    public async Task<IActionResult> GetMovementsByProduct(Guid productId)
    {
        var rows = await _db.InventoryMovements
            .AsNoTracking()
            .Include(m => m.Product)
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.FechaMovimiento)
            .ToListAsync();

        // MapToDto lee m.Product: sin el Include era null y el endpoint respondía 500
        return Ok(await WithPatientsAsync(rows));
    }

    /// <summary>
    /// Añade el nombre del paciente a las salidas por consumo de cabina. Va en una consulta aparte
    /// porque InventoryMovement.PatientId no tiene navegación (el movimiento sobrevive al paciente).
    /// </summary>
    private async Task<List<InventoryMovementDto>> WithPatientsAsync(List<InventoryMovement> rows)
    {
        var items = rows.Select(MapToDto).ToList();

        var patientIds = rows.Where(m => m.PatientId.HasValue).Select(m => m.PatientId!.Value).Distinct().ToList();
        if (patientIds.Count == 0)
            return items;

        var nombres = await _db.Patients.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.TenantId == _db.CurrentTenantId && patientIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Nombre + " " + p.Apellido);

        foreach (var item in items.Where(i => i.PatientId.HasValue))
            item.PacienteNombre = nombres.GetValueOrDefault(item.PatientId!.Value);

        return items;
    }

    // ── Helpers ───────────────────────────────────────────────────────
    private static InventoryMovementDto MapToDto(InventoryMovement m) =>
        new()
        {
            Id = m.Id,
            ProductId = m.ProductId,
            ProductoNombre = m.Product.Nombre,
            UnidadMedida = m.Product.UnidadMedida,
            Cantidad = m.Cantidad,
            TipoMovimiento = m.TipoMovimiento.ToString(),
            Referencia = m.Referencia,
            AppointmentId = m.AppointmentId,
            PatientId = m.PatientId,
            FechaMovimiento = m.FechaMovimiento
        };

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return claim is not null && Guid.TryParse(claim, out var uid) ? uid : Guid.Empty;
    }
}
