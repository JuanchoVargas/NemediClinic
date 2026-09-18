using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Inventory;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;

    public ProductsController(AppDbContext db, AttachmentService attachments)
    {
        _db = db;
        _attachments = attachments;
    }

    // ── GET /api/v1/products?Page=&PageSize=&Search=&tipo=&semaforo= ──
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] ProductType? tipo,
        [FromQuery] string? semaforo)
    {
        var query = _db.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(p =>
                p.Nombre.ToLower().Contains(search) ||
                (p.Referencia != null && p.Referencia.ToLower().Contains(search)));
        }

        if (tipo.HasValue)
            query = query.Where(p => p.TipoProducto == tipo.Value);

        query = ApplySemaforoFilter(query, semaforo);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(p => p.Nombre)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => ProjectToDto(p))
            .ToListAsync();

        return Ok(new PagedResponse<ProductDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    // ── GET /api/v1/products/alerts ───────────────────────────────────
    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts()
    {
        // Solo productos con stock < mínimo (Amarillo + Rojo).
        // Filtramos StockMinimo > 0 para evitar división por cero al ordenar.
        var items = await _db.Products
            .AsNoTracking()
            .Where(p => p.Activo && p.StockMinimo > 0 && p.StockActual < p.StockMinimo)
            .OrderBy(p => p.StockActual / p.StockMinimo) // más urgente primero
            .ThenBy(p => p.Nombre)
            .Select(p => ProjectToDto(p))
            .ToListAsync();

        return Ok(items);
    }

    // ── GET /api/v1/products/{id} ─────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var product = await _db.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => ProjectToDto(p))
            .FirstOrDefaultAsync();

        if (product is null)
            return NotFound(new { error = "Producto no encontrado." });

        return Ok(product);
    }

    // ── POST /api/v1/products ─────────────────────────────────────────
    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        var product = new Product
        {
            Nombre = request.Nombre,
            Descripcion = request.Descripcion ?? "",
            Referencia = request.Referencia,
            TipoProducto = request.TipoProducto,
            UnidadMedida = request.UnidadMedida,
            StockActual = 0m,
            StockMinimo = request.StockMinimo,
            StockMaximo = request.StockMaximo,
            ImagenId = request.ImagenId
        };

        _db.Products.Add(product);
        await _attachments.AssignImageAsync(AttachmentEntityType.Product, product.Id, request.ImagenId, null);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id },
            await BuildDtoAsync(product.Id));
    }

    // ── PUT /api/v1/products/{id} ─────────────────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest request)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null)
            return NotFound(new { error = "Producto no encontrado." });

        if (request.Nombre is not null) product.Nombre = request.Nombre;
        if (request.Descripcion is not null) product.Descripcion = request.Descripcion;
        if (request.Referencia is not null) product.Referencia = request.Referencia;
        if (request.TipoProducto.HasValue) product.TipoProducto = request.TipoProducto.Value;
        if (request.UnidadMedida is not null) product.UnidadMedida = request.UnidadMedida;
        if (request.StockMinimo.HasValue) product.StockMinimo = request.StockMinimo.Value;
        if (request.StockMaximo.HasValue) product.StockMaximo = request.StockMaximo;
        if (request.Activo.HasValue) product.Activo = request.Activo.Value;
        if (request.ImagenId.HasValue)
        {
            await _attachments.AssignImageAsync(AttachmentEntityType.Product, product.Id, request.ImagenId, product.ImagenId);
            product.ImagenId = request.ImagenId;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── DELETE /api/v1/products/{id} ──────────────────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null)
            return NotFound(new { error = "Producto no encontrado." });

        product.IsDeleted = true;
        product.Activo = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers privados ──────────────────────────────────────────────

    private static IQueryable<Product> ApplySemaforoFilter(IQueryable<Product> q, string? semaforo)
    {
        if (string.IsNullOrEmpty(semaforo)) return q;
        return semaforo switch
        {
            "Verde" => q.Where(p => p.StockActual >= p.StockMinimo),
            "Amarillo" => q.Where(p =>
                p.StockActual > 0
                && p.StockActual >= p.StockMinimo * 0.5m
                && p.StockActual < p.StockMinimo),
            "Rojo" => q.Where(p =>
                p.StockActual == 0m
                || p.StockActual < p.StockMinimo * 0.5m),
            _ => q
        };
    }

    /// <summary>
    /// Proyección a DTO con SemaforoStock calculado en SQL.
    /// Lógica: Rojo si stock==0 o stock < min/2; Amarillo si stock < min;
    /// Verde en otro caso.
    /// </summary>
    private static System.Linq.Expressions.Expression<System.Func<Product, ProductDto>> ProjectExpression()
    {
        return p => new ProductDto
        {
            Id = p.Id,
            Nombre = p.Nombre,
            Descripcion = p.Descripcion,
            Referencia = p.Referencia,
            TipoProducto = p.TipoProducto.ToString(),
            UnidadMedida = p.UnidadMedida,
            StockActual = p.StockActual,
            StockMinimo = p.StockMinimo,
            StockMaximo = p.StockMaximo,
            Activo = p.Activo,
            ImagenId = p.ImagenId,
            SemaforoStock =
                p.StockActual == 0m || p.StockActual < p.StockMinimo * 0.5m
                    ? "Rojo"
                    : p.StockActual < p.StockMinimo
                        ? "Amarillo"
                        : "Verde",
            CreatedAt = p.CreatedAt
        };
    }

    private static ProductDto ProjectToDto(Product p)
    {
        // Helper para uso dentro de .Select() — EF traduce a SQL.
        return new ProductDto
        {
            Id = p.Id,
            Nombre = p.Nombre,
            Descripcion = p.Descripcion,
            Referencia = p.Referencia,
            TipoProducto = p.TipoProducto.ToString(),
            UnidadMedida = p.UnidadMedida,
            StockActual = p.StockActual,
            StockMinimo = p.StockMinimo,
            StockMaximo = p.StockMaximo,
            Activo = p.Activo,
            ImagenId = p.ImagenId,
            SemaforoStock =
                p.StockActual == 0m || p.StockActual < p.StockMinimo * 0.5m
                    ? "Rojo"
                    : p.StockActual < p.StockMinimo
                        ? "Amarillo"
                        : "Verde",
            CreatedAt = p.CreatedAt
        };
    }

    private async Task<ProductDto?> BuildDtoAsync(Guid id)
    {
        return await _db.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => ProjectToDto(p))
            .FirstOrDefaultAsync();
    }
}
