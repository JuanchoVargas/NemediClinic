using System.Globalization;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Liquidación mensual por canal. Suma solo tenants en estado Activo y activados a más tardar
/// el último día del mes. Exento y Suspendido aparecen en el detalle con montos en 0.
/// porcentaje = Tenant.PorcentajeCanalOverride ?? Channel.PorcentajeCanal.
/// </summary>
public class LiquidacionService
{
    private readonly AppDbContext _db;
    private readonly PlatformPricing _pricing;

    public LiquidacionService(AppDbContext db, PlatformPricing pricing)
    {
        _db = db;
        _pricing = pricing;
    }

    public async Task<LiquidacionDto> GetAsync(string mes)
    {
        if (!DateTime.TryParseExact(mes, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var inicio))
            throw ApiException.BadRequest("El parámetro mes debe tener formato YYYY-MM.");

        var finExclusivo = inicio.AddMonths(1);

        var channels = await _db.Channels.AsNoTracking().OrderBy(c => c.Nombre).ToListAsync();
        var tenants = await _db.Tenants.AsNoTracking()
            .Where(t => t.FechaActivacion != null && t.FechaActivacion < finExclusivo)
            .OrderBy(t => t.Nombre)
            .ToListAsync();

        var result = new LiquidacionDto { Mes = mes };

        foreach (var channel in channels)
        {
            var canal = new LiquidacionCanalDto
            {
                ChannelId = channel.Id,
                Canal = channel.Nombre,
                PorcentajeCanal = channel.PorcentajeCanal
            };

            foreach (var t in tenants.Where(t => t.ChannelId == channel.Id))
            {
                var suma = t.Estado == TenantEstado.Activo;
                var precio = suma ? _pricing.PrecioMensual(t) : 0m;
                var porcentaje = t.PorcentajeCanalOverride ?? channel.PorcentajeCanal;
                var montoCanal = Math.Round(precio * porcentaje, 2, MidpointRounding.AwayFromZero);

                canal.Tenants.Add(new LiquidacionTenantDto
                {
                    TenantId = t.Id,
                    Nombre = t.Nombre,
                    NIT = t.NIT,
                    Plan = t.Plan.ToString(),
                    SedesAdicionales = t.SedesAdicionales,
                    EsIps = t.EsIps,
                    Estado = t.Estado.ToString(),
                    Suma = suma,
                    Precio = precio,
                    Porcentaje = porcentaje,
                    MontoCanal = montoCanal,
                    MontoNemedi = precio - montoCanal
                });
            }

            canal.TenantsActivos = canal.Tenants.Count(x => x.Suma);
            canal.TotalFacturado = canal.Tenants.Sum(x => x.Precio);
            canal.MontoCanal = canal.Tenants.Sum(x => x.MontoCanal);
            canal.MontoNemedi = canal.Tenants.Sum(x => x.MontoNemedi);
            result.Canales.Add(canal);
        }

        result.TotalFacturado = result.Canales.Sum(c => c.TotalFacturado);
        result.TotalCanales = result.Canales.Sum(c => c.MontoCanal);
        result.TotalNemedi = result.Canales.Sum(c => c.MontoNemedi);
        return result;
    }
}
