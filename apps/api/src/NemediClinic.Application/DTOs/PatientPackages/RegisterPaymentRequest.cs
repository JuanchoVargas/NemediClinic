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
}
