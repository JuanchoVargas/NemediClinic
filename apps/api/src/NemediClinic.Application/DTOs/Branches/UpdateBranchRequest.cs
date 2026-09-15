using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Branches;

public class UpdateBranchRequest
{
    [MaxLength(200)]
    public string? Nombre { get; set; }

    [MaxLength(300)]
    public string? Direccion { get; set; }

    [MaxLength(20)]
    public string? Telefono { get; set; }
}
