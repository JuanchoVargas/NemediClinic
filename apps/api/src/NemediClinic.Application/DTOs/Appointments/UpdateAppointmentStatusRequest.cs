using System.ComponentModel.DataAnnotations;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Application.DTOs.Appointments;

public class UpdateAppointmentStatusRequest
{
    [Required]
    public AppointmentStatus Estado { get; set; }

    public string? Notas { get; set; }
}
