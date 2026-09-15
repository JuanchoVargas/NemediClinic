using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class Appointment : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid? PatientPackageSessionId { get; set; }
    public Guid EsteticistId { get; set; }
    public Guid ProcedureId { get; set; }
    public Guid BranchId { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public AppointmentStatus Estado { get; set; } = AppointmentStatus.Agendada;
    public string? Notas { get; set; }
    public bool WhatsAppReminderSent { get; set; } = false;
    public DateTime? WhatsAppConfirmedAt { get; set; }

    public Patient Patient { get; set; } = null!;
    public PatientPackageSession? PatientPackageSession { get; set; }
    public User Esteticist { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
