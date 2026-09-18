using System.ComponentModel.DataAnnotations.Schema;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

/// <summary>
/// Un lote de un producto: la unidad real de existencia cuando hay que responderle a la Secretaría
/// de Salud "de qué lote salió lo que le pusieron a esta paciente".
///
/// Cada entrada de inventario crea un lote. El stock del producto es la suma de la cantidad
/// disponible de sus lotes no vencidos, y las salidas descuentan por FEFO (primero el que vence
/// antes), no por orden de llegada.
/// </summary>
public class ProductLot : BaseEntity
{
    public Guid ProductId { get; set; }

    /// <summary>Número impreso en la caja. Null en lo que no se maneja por lote (gasas, toallas).</summary>
    public string? NumeroLote { get; set; }
    /// <summary>Null = no vence (material que no caduca).</summary>
    public DateOnly? FechaVencimiento { get; set; }

    public decimal CantidadInicial { get; set; }
    /// <summary>Lo que queda del lote. Nunca baja de cero.</summary>
    public decimal CantidadDisponible { get; set; }

    public DateTime FechaIngreso { get; set; }
    public string? Proveedor { get; set; }
    public string? NumeroFactura { get; set; }
    /// <summary>
    /// Copia del registro INVIMA del producto al momento de ingresar el lote: si mañana el producto
    /// cambia de registro, lo ya reportado no debe cambiar.
    /// </summary>
    public string? RegistroSanitario { get; set; }

    public Product Product { get; set; } = null!;

    /// <summary>Semáforo de vencimiento. No se guarda: depende del día en que se pregunte.</summary>
    [NotMapped]
    public LotStatus Estado => EstadoAl(DateOnly.FromDateTime(DateTime.Now));

    public LotStatus EstadoAl(DateOnly hoy)
    {
        if (FechaVencimiento is not { } vence)
            return LotStatus.Vigente;

        var dias = vence.DayNumber - hoy.DayNumber;
        if (dias < 0) return LotStatus.Vencido;
        if (dias < 30) return LotStatus.Critico;
        if (dias <= 90) return LotStatus.PorVencer;
        return LotStatus.Vigente;
    }
}
