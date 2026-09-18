namespace NemediClinic.Domain.Enums;

public enum AttachmentEntityType
{
    Patient = 0,
    ClinicalNote = 1,
    Product = 2,
    Procedure = 3,
    Tenant = 4,
    Valuation = 5,
    Payment = 6
}

public enum AttachmentKind
{
    Perfil = 0,
    Antes = 1,
    Despues = 2,
    Producto = 3,
    Procedimiento = 4,
    Logo = 5,
    /// <summary>
    /// Consentimiento informado. El firmado en pantalla lo genera el sistema (PDF de QuestPDF); uno
    /// firmado en papel se puede subir escaneado (PDF o imagen). En ambos casos no se puede eliminar.
    /// </summary>
    Consentimiento = 6,
    /// <summary>Soporte de un pago (foto del voucher, PDF de la transferencia).</summary>
    Comprobante = 7
}

/// <summary>Cuánto de un paquete asignado está pago. Lo calcula el backend (PatientPackageDto.EstadoPago).</summary>
public enum PaymentState
{
    SinPagos = 0,
    Parcial = 1,
    Pagado = 2
}
