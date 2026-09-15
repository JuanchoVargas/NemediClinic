namespace NemediClinic.Application.DTOs.Appointments;

public class AppointmentDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientNombre { get; set; } = string.Empty;
    public Guid EsteticistId { get; set; }
    public string EsteticistNombre { get; set; } = string.Empty;
    public Guid ProcedureId { get; set; }
    public string ProcedureNombre { get; set; } = string.Empty;
    public Guid? PatientPackageSessionId { get; set; }
    public Guid BranchId { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? Notas { get; set; }
    public bool WhatsAppReminderSent { get; set; }
    public DateTime? WhatsAppConfirmedAt { get; set; }
}
