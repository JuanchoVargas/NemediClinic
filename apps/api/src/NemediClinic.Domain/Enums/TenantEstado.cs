namespace NemediClinic.Domain.Enums;

/// <summary>Estado comercial del tenant. Suspendido = solo lectura (mora). Exento = no factura.</summary>
public enum TenantEstado
{
    Activo = 0,
    Suspendido = 1,
    Exento = 2
}
