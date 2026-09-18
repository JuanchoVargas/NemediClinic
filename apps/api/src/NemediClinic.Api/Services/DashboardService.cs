using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Dashboard;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Números del Dashboard en una sola llamada. Todo pasa por el filtro global de tenant.
///   · desde/hasta acotan lo "del mes" (ingresos, top de procedimientos y de productos); por defecto, del día 1 a hoy.
///   · branchId filtra lo que tiene sede: las citas. Pagos, paquetes, pacientes y stock son del
///     tenant completo (esas entidades no tienen sede).
///   · Una esteticista ve su propia agenda y no recibe los campos financieros.
/// </summary>
public class DashboardService
{
    private const int DiasSerie = 14;
    private const int DiasPorVencer = 30;
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    public async Task<DashboardDto> GetAsync(Guid? branchId, DateOnly? desde, DateOnly? hasta, string role, Guid userId, CancellationToken ct)
    {
        var hoy = DateOnly.FromDateTime(DateTime.Now);
        var to = hasta ?? hoy;
        var from = desde ?? new DateOnly(to.Year, to.Month, 1);
        if (from > to)
            throw ApiException.BadRequest("El parámetro desde no puede ser posterior a hasta.");

        var soloPropias = role == "Esteticista";
        var verFinanzas = !soloPropias;

        var citas = _db.Appointments.AsNoTracking();
        if (branchId.HasValue) citas = citas.Where(a => a.BranchId == branchId.Value);
        if (soloPropias) citas = citas.Where(a => a.EsteticistId == userId);

        var dto = new DashboardDto { Desde = from, Hasta = to, AgendaPropia = soloPropias };

        // ── Citas de hoy ──
        var inicioHoy = hoy.ToDateTime(TimeOnly.MinValue);
        var finHoy = inicioHoy.AddDays(1);
        dto.AgendaHoy = await citas
            .Where(a => a.FechaInicio >= inicioHoy && a.FechaInicio < finHoy)
            .OrderBy(a => a.FechaInicio)
            .Select(a => new CitaHoyDto
            {
                Id = a.Id,
                PatientId = a.PatientId,
                Paciente = a.Patient.Nombre + " " + a.Patient.Apellido,
                Procedimiento = a.Procedure.Nombre,
                Esteticista = a.Esteticist.Nombre + " " + a.Esteticist.Apellido,
                FechaInicio = a.FechaInicio,
                Estado = a.Estado.ToString()
            })
            .ToListAsync(ct);
        dto.CitasHoyTotal = dto.AgendaHoy.Count(a => a.Estado != nameof(AppointmentStatus.Cancelada));
        dto.CitasHoyPorEstado = dto.AgendaHoy
            .GroupBy(a => a.Estado)
            .Select(g => new EstadoCantidadDto { Estado = g.Key, Cantidad = g.Count() })
            .OrderByDescending(x => x.Cantidad)
            .ToList();

        // ── Citas por día (últimos 14 días hasta `to`) ──
        var serieDesde = to.AddDays(-(DiasSerie - 1));
        var serieInicio = serieDesde.ToDateTime(TimeOnly.MinValue);
        var serieFin = to.ToDateTime(TimeOnly.MinValue).AddDays(1);
        var citasSerie = await citas
            .Where(a => a.FechaInicio >= serieInicio && a.FechaInicio < serieFin)
            .Select(a => new { a.FechaInicio, a.Estado })
            .ToListAsync(ct);
        dto.CitasPorDia = Dias(serieDesde, to).Select(d =>
        {
            var delDia = citasSerie.Where(c => DateOnly.FromDateTime(c.FechaInicio) == d).ToList();
            return new CitasDiaDto
            {
                Fecha = d,
                Total = delDia.Count(c => c.Estado != AppointmentStatus.Cancelada),
                Completadas = delDia.Count(c => c.Estado == AppointmentStatus.Completada),
                Canceladas = delDia.Count(c => c.Estado == AppointmentStatus.Cancelada)
            };
        }).ToList();

        // ── Top 5 procedimientos del periodo ──
        var periodoInicio = from.ToDateTime(TimeOnly.MinValue);
        var periodoFin = to.ToDateTime(TimeOnly.MinValue).AddDays(1);
        dto.TopProcedimientos = await citas
            .Where(a => a.FechaInicio >= periodoInicio && a.FechaInicio < periodoFin && a.Estado != AppointmentStatus.Cancelada)
            .GroupBy(a => new { a.ProcedureId, a.Procedure.Nombre })
            .Select(g => new TopProcedimientoDto { ProcedureId = g.Key.ProcedureId, Nombre = g.Key.Nombre, Cantidad = g.Count() })
            .OrderByDescending(x => x.Cantidad)
            .Take(5)
            .ToListAsync(ct);

        // ── Pacientes ──
        dto.PacientesActivos = await _db.Patients.CountAsync(p => p.IsActive, ct);
        // CreatedAt se guarda en UTC: se pasa a hora local antes de agrupar por día
        var altas = await _db.Patients.AsNoTracking()
            .Where(p => p.CreatedAt >= serieInicio.AddDays(-1))
            .Select(p => p.CreatedAt)
            .ToListAsync(ct);
        var altasLocales = altas.Select(c => DateOnly.FromDateTime(DateTime.SpecifyKind(c, DateTimeKind.Utc).ToLocalTime())).ToList();
        dto.PacientesNuevosPorDia = Dias(serieDesde, to)
            .Select(d => new SerieDiaDto { Fecha = d, Valor = altasLocales.Count(x => x == d) })
            .ToList();

        // ── Stock en alerta (misma regla que ProductsController: bajo el mínimo) ──
        dto.StockEnAlerta = await _db.Products.AsNoTracking()
            .Where(p => p.Activo && p.StockActual < p.StockMinimo)
            .OrderBy(p => p.StockActual - p.StockMinimo)
            .Select(p => new StockAlertaDto
            {
                ProductId = p.Id,
                Nombre = p.Nombre,
                UnidadMedida = p.UnidadMedida,
                StockActual = p.StockActual,
                StockMinimo = p.StockMinimo,
                Semaforo = p.StockActual == 0m || p.StockActual < p.StockMinimo * 0.5m ? "Rojo" : "Amarillo"
            })
            .ToListAsync(ct);

        // ── Top 5 productos del periodo por unidades movidas (InventoryMovement: entradas + salidas) ──
        var movimientos = await _db.InventoryMovements.AsNoTracking()
            .Where(m => m.FechaMovimiento >= periodoInicio && m.FechaMovimiento < periodoFin)
            .GroupBy(m => new { m.ProductId, m.Product.Nombre, m.Product.UnidadMedida, m.Product.StockActual, m.Product.StockMinimo })
            .Select(g => new ProductoMovidoDto
            {
                ProductId = g.Key.ProductId,
                Nombre = g.Key.Nombre,
                UnidadMedida = g.Key.UnidadMedida,
                Entradas = g.Sum(m => m.TipoMovimiento == MovementType.Entrada ? m.Cantidad : 0m),
                Salidas = g.Sum(m => m.TipoMovimiento == MovementType.Salida ? m.Cantidad : 0m),
                Unidades = g.Sum(m => m.Cantidad),
                StockActual = g.Key.StockActual,
                StockMinimo = g.Key.StockMinimo
            })
            .OrderByDescending(x => x.Unidades)
            .Take(5)
            .ToListAsync(ct);
        foreach (var producto in movimientos)
            producto.Semaforo = Semaforo(producto.StockActual, producto.StockMinimo);
        dto.ProductosDelMes = movimientos;

        if (!verFinanzas)
            return dto;

        // ── Dinero: todo sale de PatientPayment y de las asignaciones ──
        // Se cargan las asignaciones vivas (no Vencido) con sus pagos: la cartera de un día cualquiera es
        // Σ max(0, precio − pagado hasta ese día) de las asignaciones que ya existían ese día.
        var asignaciones = await _db.PatientPackages.AsNoTracking()
            .Where(pp => pp.Estado != PackageStatus.Vencido)
            .Select(pp => new
            {
                pp.FechaInicio,
                pp.PrecioAcordado,
                Pagos = pp.Payments.Select(p => new { p.FechaPago, p.Monto }).ToList()
            })
            .ToListAsync(ct);

        decimal CarteraAl(DateOnly dia) => asignaciones
            .Where(a => a.FechaInicio <= dia)
            .Sum(a => Math.Max(0m, a.PrecioAcordado - a.Pagos.Where(p => p.FechaPago <= dia).Sum(p => p.Monto)));

        // Lo cobrado incluye los pagos de asignaciones Vencidas: el dinero entró igual
        var pagos = await _db.PatientPayments.AsNoTracking()
            .Where(p => p.FechaPago >= (from < serieDesde ? from : serieDesde) && p.FechaPago <= to)
            .Select(p => new { p.FechaPago, p.Monto })
            .ToListAsync(ct);
        dto.IngresosMes = pagos.Where(p => p.FechaPago >= from).Sum(p => p.Monto);

        var carteraAnterior = CarteraAl(serieDesde.AddDays(-1));
        dto.IngresosPorDia = [];
        foreach (var dia in Dias(serieDesde, to))
        {
            var cartera = CarteraAl(dia);
            dto.IngresosPorDia.Add(new IngresoDiaDto
            {
                Fecha = dia,
                Cobrado = pagos.Where(p => p.FechaPago == dia).Sum(p => p.Monto),
                SaldoGenerado = cartera - carteraAnterior,
                SaldoAcumulado = cartera
            });
            carteraAnterior = cartera;
        }

        // ── Saldo pendiente total hoy: misma regla, con todos los pagos registrados ──
        dto.SaldoPendiente = asignaciones.Sum(a => Math.Max(0m, a.PrecioAcordado - a.Pagos.Sum(p => p.Monto)));

        // ── Paquetes por vencer en 30 días ──
        var activos = await _db.PatientPackages.AsNoTracking()
            .Where(pp => pp.Estado == PackageStatus.Activo && pp.Package.VigenciaDias > 0)
            .Select(pp => new
            {
                pp.Id,
                pp.PatientId,
                Paciente = pp.Patient.Nombre + " " + pp.Patient.Apellido,
                Paquete = pp.Package.Nombre,
                pp.FechaInicio,
                pp.Package.VigenciaDias,
                pp.SesionesCompletadas,
                pp.Package.SesionesTotales
            })
            .ToListAsync(ct);
        dto.PaquetesPorVencer = activos
            .Select(x => new PaquetePorVencerDto
            {
                PatientPackageId = x.Id,
                PatientId = x.PatientId,
                Paciente = x.Paciente,
                Paquete = x.Paquete,
                FechaVencimiento = PatientPackageService.FechaVencimiento(x.FechaInicio, x.VigenciaDias),
                SesionesCompletadas = x.SesionesCompletadas,
                SesionesTotales = x.SesionesTotales
            })
            .Select(x => { x.DiasRestantes = x.FechaVencimiento.DayNumber - hoy.DayNumber; return x; })
            .Where(x => x.DiasRestantes >= 0 && x.DiasRestantes <= DiasPorVencer)
            .OrderBy(x => x.DiasRestantes)
            .ToList();

        return dto;
    }

    /// <summary>Misma regla que ProductsController: Rojo en 0 o bajo la mitad del mínimo; Amarillo bajo el mínimo.</summary>
    private static string Semaforo(decimal stockActual, decimal stockMinimo) =>
        stockActual == 0m || stockActual < stockMinimo * 0.5m ? "Rojo"
        : stockActual < stockMinimo ? "Amarillo"
        : "Verde";

    private static IEnumerable<DateOnly> Dias(DateOnly desde, DateOnly hasta)
    {
        for (var d = desde; d <= hasta; d = d.AddDays(1))
            yield return d;
    }
}
