using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.PatientPackages;

public class AssignPackageRequest
{
    [Required]
    public Guid PatientId { get; set; }

    [Required]
    public Guid PackageId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal PrecioAcordado { get; set; }

    [Required]
    public DateOnly FechaInicio { get; set; }
}
