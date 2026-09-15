using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Packages;

public class UpdatePackageRequest
{
    [MaxLength(200)]
    public string? Nombre { get; set; }

    [MaxLength(1000)]
    public string? Descripcion { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? PrecioTotal { get; set; }

    [Range(1, 1000)]
    public int? SesionesTotales { get; set; }

    [Range(1, 3650)]
    public int? VigenciaDias { get; set; }

    [Range(1, 365)]
    public int? DiasAlertaVencimiento { get; set; }

    public bool? Activo { get; set; }
}
