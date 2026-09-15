using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Packages;

public class CreatePackageRequest
{
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Descripcion { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal PrecioTotal { get; set; }

    [Range(1, 1000)]
    public int SesionesTotales { get; set; }

    [Range(1, 3650)]
    public int VigenciaDias { get; set; }

    [Range(1, 365)]
    public int DiasAlertaVencimiento { get; set; } = 15;
}
