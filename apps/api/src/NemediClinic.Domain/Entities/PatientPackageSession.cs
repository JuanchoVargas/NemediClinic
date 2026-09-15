using NemediClinic.Domain.Enums;

namespace NemediClinic.Domain.Entities;

public class PatientPackageSession : BaseEntity
{
    public Guid PatientPackageId { get; set; }
    public Guid ProcedureId { get; set; }
    public int Numero { get; set; }
    public SessionStatus Estado { get; set; } = SessionStatus.Pendiente;
    public DateTime? FechaCompletada { get; set; }
    public Guid? ClinicalNoteId { get; set; }

    public PatientPackage PatientPackage { get; set; } = null!;
    public Procedure Procedure { get; set; } = null!;
}
