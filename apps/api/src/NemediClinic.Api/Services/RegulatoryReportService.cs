using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Inventory;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Reporte de inventario para la Secretaría de Salud: qué tiene la clínica, con qué registro INVIMA,
/// en qué lotes, cuándo vencen y cuánto se consumió en el periodo, agrupado por tipo regulatorio
/// (los medicamentos y los dispositivos médicos se reportan aparte de los insumos y los cosméticos).
/// </summary>
public class RegulatoryReportService
{
    private readonly AppDbContext _db;

    public RegulatoryReportService(AppDbContext db) => _db = db;

    public async Task<List<ProductLotDto>> GetLotsAsync(Guid productId, CancellationToken ct = default)
    {
        var lotes = await _db.ProductLots.AsNoTracking()
            .Where(l => l.ProductId == productId)
            .ToListAsync(ct);

        var hoy = DateOnly.FromDateTime(DateTime.Now);
        return lotes
            // FEFO también al mostrar: primero lo que hay que sacar antes
            .OrderBy(l => l.CantidadDisponible <= 0)
            .ThenBy(l => l.FechaVencimiento ?? DateOnly.MaxValue)
            .Select(l => ToDto(l, hoy))
            .ToList();
    }

    /// <summary>Lotes con existencia que vencen en 90 días o menos (o ya vencieron).</summary>
    public async Task<List<LotAlertaDto>> GetLotAlertsAsync(CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.Now);
        var limite = hoy.AddDays(90);

        var lotes = await _db.ProductLots.AsNoTracking()
            .Where(l => l.CantidadDisponible > 0 && l.FechaVencimiento != null && l.FechaVencimiento <= limite)
            .Select(l => new { Lot = l, l.Product.Nombre, l.Product.UnidadMedida, l.Product.TipoRegulatorio })
            .ToListAsync(ct);

        return lotes
            // Lo vencido primero, después lo que está más cerca de vencer
            .OrderBy(x => x.Lot.FechaVencimiento)
            .Select(x =>
            {
                var dto = ToDto(x.Lot, hoy);
                return new LotAlertaDto
                {
                    Id = dto.Id, ProductId = dto.ProductId, NumeroLote = dto.NumeroLote,
                    FechaVencimiento = dto.FechaVencimiento, DiasParaVencer = dto.DiasParaVencer,
                    Estado = dto.Estado, CantidadInicial = dto.CantidadInicial,
                    CantidadDisponible = dto.CantidadDisponible, FechaIngreso = dto.FechaIngreso,
                    Proveedor = dto.Proveedor, NumeroFactura = dto.NumeroFactura,
                    RegistroSanitario = dto.RegistroSanitario,
                    ProductoNombre = x.Nombre, UnidadMedida = x.UnidadMedida,
                    TipoRegulatorio = x.TipoRegulatorio.ToString()
                };
            })
            .ToList();
    }

    /// <summary>Por defecto, el mes en curso.</summary>
    public async Task<RegulatoryReportDto> BuildAsync(
        DateOnly? desde, DateOnly? hasta, RegulatoryType? tipo, CancellationToken ct = default)
    {
        var hoy = DateOnly.FromDateTime(DateTime.Now);
        var to = hasta ?? hoy;
        var from = desde ?? new DateOnly(to.Year, to.Month, 1);
        if (from > to)
            throw ApiException.BadRequest("El parámetro desde no puede ser posterior a hasta.");

        var productos = await _db.Products.AsNoTracking()
            .Where(p => p.Activo && (tipo == null || p.TipoRegulatorio == tipo))
            .OrderBy(p => p.TipoRegulatorio).ThenBy(p => p.Nombre)
            .ToListAsync(ct);
        var ids = productos.Select(p => p.Id).ToList();

        var lotes = await _db.ProductLots.AsNoTracking()
            .Where(l => ids.Contains(l.ProductId))
            .ToListAsync(ct);

        // Lo que salió en el periodo (consumo de cabina y cualquier otra salida)
        var inicio = from.ToDateTime(TimeOnly.MinValue);
        var fin = to.ToDateTime(TimeOnly.MinValue).AddDays(1);
        var consumo = await _db.InventoryMovements.AsNoTracking()
            .Where(m => ids.Contains(m.ProductId) && m.TipoMovimiento == MovementType.Salida
                && m.FechaMovimiento >= inicio && m.FechaMovimiento < fin)
            .GroupBy(m => m.ProductId)
            .Select(g => new { ProductId = g.Key, Total = g.Sum(m => m.Cantidad) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Total, ct);

        var dto = new RegulatoryReportDto { Desde = from, Hasta = to };

        foreach (var grupo in productos.GroupBy(p => p.TipoRegulatorio))
        {
            var salida = new RegulatoryGroupDto { TipoRegulatorio = grupo.Key.ToString() };
            foreach (var producto in grupo)
            {
                var suyos = lotes.Where(l => l.ProductId == producto.Id).ToList();
                salida.Productos.Add(new RegulatoryProductDto
                {
                    ProductId = producto.Id,
                    Nombre = producto.Nombre,
                    RegistroSanitarioInvima = producto.RegistroSanitarioInvima,
                    PrincipioActivo = producto.PrincipioActivo,
                    Concentracion = producto.Concentracion,
                    RequiereCadenaFrio = producto.RequiereCadenaFrio,
                    UnidadMedida = producto.UnidadMedida,
                    // Solo lo utilizable: un lote vencido no es existencia
                    CantidadDisponible = suyos.Where(l => l.EstadoAl(hoy) != LotStatus.Vencido).Sum(l => l.CantidadDisponible),
                    ConsumoPeriodo = consumo.GetValueOrDefault(producto.Id),
                    Lotes = suyos
                        .OrderBy(l => l.FechaVencimiento ?? DateOnly.MaxValue)
                        .Select(l => ToDto(l, hoy))
                        .ToList()
                });
            }
            dto.Grupos.Add(salida);
        }

        return dto;
    }

    /// <summary>Una hoja por tipo regulatorio, una fila por lote. Se abre igual en Excel y en Sheets.</summary>
    public static byte[] ToExcel(RegulatoryReportDto reporte, string clinica)
    {
        using var libro = new XLWorkbook();

        foreach (var grupo in reporte.Grupos)
        {
            // Excel no acepta más de 31 caracteres ni algunos símbolos en el nombre de la hoja
            var hoja = libro.Worksheets.Add(NombreHoja(grupo.TipoRegulatorio));

            hoja.Cell(1, 1).Value = $"{clinica} · inventario para la Secretaría de Salud";
            hoja.Cell(2, 1).Value = $"{Etiqueta(grupo.TipoRegulatorio)} · del {reporte.Desde:dd/MM/yyyy} al {reporte.Hasta:dd/MM/yyyy}";
            hoja.Range(1, 1, 1, 11).Merge().Style.Font.SetBold().Font.SetFontSize(13);
            hoja.Range(2, 1, 2, 11).Merge().Style.Font.SetItalic();

            string[] encabezados =
            [
                "Producto", "Registro INVIMA", "Principio activo", "Concentración", "Cadena de frío",
                "Lote", "Vencimiento", "Estado", "Disponible", "Unidad", "Consumo del periodo"
            ];
            for (var i = 0; i < encabezados.Length; i++)
                hoja.Cell(4, i + 1).Value = encabezados[i];
            hoja.Row(4).Style.Font.SetBold();
            hoja.SheetView.FreezeRows(4);

            var fila = 5;
            foreach (var producto in grupo.Productos)
            {
                // Un producto sin lotes igual se reporta: la fila queda sin datos de lote
                var filasLote = producto.Lotes.Count > 0 ? producto.Lotes : [null];
                foreach (var lote in filasLote)
                {
                    hoja.Cell(fila, 1).Value = producto.Nombre;
                    hoja.Cell(fila, 2).Value = producto.RegistroSanitarioInvima ?? "";
                    hoja.Cell(fila, 3).Value = producto.PrincipioActivo ?? "";
                    hoja.Cell(fila, 4).Value = producto.Concentracion ?? "";
                    hoja.Cell(fila, 5).Value = producto.RequiereCadenaFrio ? "Sí" : "No";
                    hoja.Cell(fila, 6).Value = lote?.NumeroLote ?? "";
                    if (lote?.FechaVencimiento is { } vence)
                    {
                        hoja.Cell(fila, 7).Value = vence.ToDateTime(TimeOnly.MinValue);
                        hoja.Cell(fila, 7).Style.DateFormat.Format = "dd/mm/yyyy";
                    }
                    hoja.Cell(fila, 8).Value = lote is null ? "" : EtiquetaEstado(lote.Estado);
                    hoja.Cell(fila, 9).Value = lote?.CantidadDisponible ?? producto.CantidadDisponible;
                    hoja.Cell(fila, 10).Value = producto.UnidadMedida;
                    hoja.Cell(fila, 11).Value = producto.ConsumoPeriodo;
                    fila++;
                }
            }

            hoja.Columns(1, 11).AdjustToContents();
        }

        if (!libro.Worksheets.Any())
            libro.Worksheets.Add("Sin datos").Cell(1, 1).Value = "No hay productos en el periodo seleccionado.";

        using var stream = new MemoryStream();
        libro.SaveAs(stream);
        return stream.ToArray();
    }

    private static ProductLotDto ToDto(ProductLot l, DateOnly hoy) => new()
    {
        Id = l.Id,
        ProductId = l.ProductId,
        NumeroLote = l.NumeroLote,
        FechaVencimiento = l.FechaVencimiento,
        DiasParaVencer = l.FechaVencimiento is { } v ? v.DayNumber - hoy.DayNumber : null,
        Estado = l.EstadoAl(hoy).ToString(),
        CantidadInicial = l.CantidadInicial,
        CantidadDisponible = l.CantidadDisponible,
        FechaIngreso = l.FechaIngreso,
        Proveedor = l.Proveedor,
        NumeroFactura = l.NumeroFactura,
        RegistroSanitario = l.RegistroSanitario
    };

    private static string NombreHoja(string tipo) => Etiqueta(tipo) switch
    {
        var e when e.Length <= 31 => e,
        var e => e[..31]
    };

    public static string Etiqueta(string tipo) => tipo switch
    {
        nameof(RegulatoryType.Medicamento) => "Medicamentos",
        nameof(RegulatoryType.DispositivoMedico) => "Dispositivos médicos",
        nameof(RegulatoryType.Cosmetico) => "Cosméticos",
        _ => "Insumos"
    };

    private static string EtiquetaEstado(string estado) => estado switch
    {
        nameof(LotStatus.Vencido) => "Vencido",
        nameof(LotStatus.Critico) => "Crítico",
        nameof(LotStatus.PorVencer) => "Por vencer",
        _ => "Vigente"
    };
}
