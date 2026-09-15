using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Packages;

public class AddPackageProcedureRequest
{
    [Required]
    public Guid ProcedureId { get; set; }

    [Range(1, 100)]
    public int CantidadSesiones { get; set; }
}
