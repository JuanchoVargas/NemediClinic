using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Inventory;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Consumo de cabina: los productos que una nota clínica declara usados salen del inventario.
///
/// Reglas:
///   · Solo descuenta cuando la nota está ligada a una cita **Completada**. Una nota suelta o de una
///     cita que aún no terminó guarda la lista, pero no mueve inventario (se descuenta al completar).
///   · Por cada producto se crea un InventoryMovement de tipo Salida con la cita y el paciente, para
///     que el historial diga en qué sesión se gastó, y se resta de Product.StockActual.
///   · El stock puede quedar en cero pero nunca negativo: si no alcanza, se rechaza (400) — un
///     inventario negativo no significa nada y esconde el error de digitación.
///   · Devuelve los productos que quedaron bajo el mínimo para que la web avise en el momento.
/// </summary>
public class CabinConsumptionService
{
    private readonly AppDbContext _db;

    public CabinConsumptionService(AppDbContext db) => _db = db;

    /// <summary>
    /// Valida la lista, la enlaza a la nota y, si la cita está Completada, descuenta inventario.
    /// No guarda: quien llama hace un único SaveChanges con la nota.
    /// Devuelve los productos que quedan bajo el stock mínimo.
    /// </summary>
    public async Task<List<StockAlertaDto>> ApplyAsync(
        ClinicalNote note, IReadOnlyCollection<ClinicalNoteProductRequest> productos, Guid patientId, Guid userId, CancellationToken ct = default)
    {
        if (productos.Count == 0)
            return [];

        var agrupados = productos
            .GroupBy(p => p.ProductId)
            .Select(g => new { ProductId = g.Key, Cantidad = g.Sum(x => x.Cantidad) })
            .ToList();

        if (agrupados.Any(p => p.Cantidad <= 0m))
            throw ApiException.BadRequest("La cantidad de cada producto debe ser mayor a cero.");

        var ids = agrupados.Select(p => p.ProductId).ToList();
        var products = await _db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);
        if (products.Count != ids.Count)
            throw ApiException.BadRequest("Alguno de los productos indicados no existe.");

        // El descuento solo ocurre cuando la sesión terminó de verdad
        var descuenta = note.AppointmentId.HasValue
            && await _db.Appointments.AnyAsync(a => a.Id == note.AppointmentId.Value && a.Estado == AppointmentStatus.Completada, ct);

        var sinStock = agrupados
            .Where(p => descuenta && products[p.ProductId].StockActual < p.Cantidad)
            .Select(p => $"{products[p.ProductId].Nombre} (quedan {products[p.ProductId].StockActual:0.##})")
            .ToList();
        if (sinStock.Count > 0)
            throw ApiException.BadRequest($"No hay stock suficiente de: {string.Join(", ", sinStock)}.");

        var alertas = new List<StockAlertaDto>();
        foreach (var item in agrupados)
        {
            var product = products[item.ProductId];
            _db.ClinicalNoteProducts.Add(new ClinicalNoteProduct
            {
                ClinicalNoteId = note.Id,
                ProductId = product.Id,
                Cantidad = item.Cantidad
            });

            if (!descuenta)
                continue;

            product.StockActual -= item.Cantidad;
            _db.InventoryMovements.Add(new InventoryMovement
            {
                ProductId = product.Id,
                Cantidad = item.Cantidad,
                TipoMovimiento = MovementType.Salida,
                Referencia = $"Consumo de cabina · {note.Procedimiento}",
                AppointmentId = note.AppointmentId,
                PatientId = patientId,
                UserId = userId,
                FechaMovimiento = DateTime.Now
            });

            if (product.StockActual < product.StockMinimo)
            {
                alertas.Add(new StockAlertaDto
                {
                    ProductId = product.Id,
                    Nombre = product.Nombre,
                    UnidadMedida = product.UnidadMedida,
                    StockActual = product.StockActual,
                    StockMinimo = product.StockMinimo,
                    Semaforo = Semaforo(product.StockActual, product.StockMinimo)
                });
            }
        }

        return alertas;
    }

    /// <summary>Consumo de cabina de un paciente: qué se gastó en cada una de sus sesiones.</summary>
    public async Task<List<PatientConsumptionDto>> GetByPatientAsync(Guid patientId, CancellationToken ct = default)
    {
        return await _db.ClinicalNoteProducts.AsNoTracking()
            .Where(cnp => cnp.ClinicalNote.ClinicalRecord.PatientId == patientId)
            .OrderByDescending(cnp => cnp.ClinicalNote.FechaCreacion)
            .Select(cnp => new PatientConsumptionDto
            {
                ClinicalNoteId = cnp.ClinicalNoteId,
                AppointmentId = cnp.ClinicalNote.AppointmentId,
                Fecha = cnp.ClinicalNote.FechaCreacion,
                Procedimiento = cnp.ClinicalNote.Procedimiento,
                Esteticista = cnp.ClinicalNote.Esteticist.Nombre + " " + cnp.ClinicalNote.Esteticist.Apellido,
                ProductId = cnp.ProductId,
                Producto = cnp.Product.Nombre,
                UnidadMedida = cnp.Product.UnidadMedida,
                Cantidad = cnp.Cantidad
            })
            .ToListAsync(ct);
    }

    /// <summary>Misma regla que ProductsController y DashboardService.</summary>
    private static string Semaforo(decimal stockActual, decimal stockMinimo) =>
        stockActual == 0m || stockActual < stockMinimo * 0.5m ? "Rojo"
        : stockActual < stockMinimo ? "Amarillo"
        : "Verde";
}
