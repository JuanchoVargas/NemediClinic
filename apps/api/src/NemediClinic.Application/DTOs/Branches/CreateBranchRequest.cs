using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Branches;

public class CreateBranchRequest
{
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Direccion { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Telefono { get; set; } = string.Empty;
}
