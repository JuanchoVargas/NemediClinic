namespace NemediClinic.Domain.Entities;

/// <summary>
/// Un producto consumido en la sesión que registra una nota clínica (consumo de cabina).
/// Sustituye al texto libre <see cref="ClinicalNote.ProductosUsados"/>, que solo se conserva
/// para las notas anteriores a esta tabla.
/// </summary>
public class ClinicalNoteProduct : BaseEntity
{
    public Guid ClinicalNoteId { get; set; }
    public Guid ProductId { get; set; }
    /// <summary>Unidades consumidas. Siempre mayor que cero.</summary>
    public decimal Cantidad { get; set; }

    public ClinicalNote ClinicalNote { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
