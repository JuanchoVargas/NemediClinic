using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.PatientPackages;

public class UpdatePackageStatusRequest
{
    [Required]
    public PackageStatus Estado { get; set; }
}
