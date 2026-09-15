using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Appointments;

public class CreateAppointmentRequest
{
    [Required]
    public Guid PatientId { get; set; }

    [Required]
    public Guid EsteticistId { get; set; }

    [Required]
    public Guid ProcedureId { get; set; }

    [Required]
    public Guid BranchId { get; set; }

    [Required]
    public DateTime FechaInicio { get; set; }

    /// <summary>
    /// Si la cita es parte de un paquete asignado al paciente, este es
    /// el id de la sesión específica del paquete que se va a consumir.
    /// </summary>
    public Guid? PatientPackageSessionId { get; set; }

    public string? Notas { get; set; }
}
