namespace NemediClinic.Domain.Enums;

public enum AttachmentEntityType
{
    Patient = 0,
    ClinicalNote = 1,
    Product = 2,
    Procedure = 3,
    Tenant = 4,
    Valuation = 5
}

public enum AttachmentKind
{
    Perfil = 0,
    Antes = 1,
    Despues = 2,
    Producto = 3,
    Procedimiento = 4,
    Logo = 5,
    /// <summary>PDF del consentimiento informado firmado (lo genera el sistema, no se sube).</summary>
    Consentimiento = 6
}
