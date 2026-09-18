using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.PatientPackages;

public class RegisterPaymentRequest
{
    [Range(0.01, double.MaxValue)]
    public decimal Monto { get; set; }

    [Required]
    public DateOnly FechaPago { get; set; }

    [Required]
    public PaymentMethod MetodoPago { get; set; }

    [MaxLength(500)]
    public string? Observacion { get; set; }

    /// <summary>Número de transferencia, voucher, recibo…</summary>
    [MaxLength(100)]
    public string? Referencia { get; set; }

    /// <summary>Adjunto subido antes como pendiente (POST /files, entityType Payment, kind Comprobante).</summary>
    public Guid? ComprobanteId { get; set; }
}

public class SetComprobanteRequest
{
    [Required]
    public Guid ComprobanteId { get; set; }
}
