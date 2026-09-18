namespace NemediClinic.Domain.Enums;

/// <summary>
/// Cómo clasifica el INVIMA lo que la clínica guarda. Determina qué exige la Secretaría de Salud:
/// un medicamento y un dispositivo médico se reportan con registro sanitario y lote; un insumo o un
/// cosmético, no necesariamente.
/// </summary>
public enum RegulatoryType
{
    Insumo = 0,
    Medicamento = 1,
    DispositivoMedico = 2,
    Cosmetico = 3
}

/// <summary>
/// Semáforo de vencimiento de un lote, con los mismos cortes que usa la clínica para decidir qué
/// sacar primero. Se calcula sobre la fecha de vencimiento, no se guarda.
/// </summary>
public enum LotStatus
{
    /// <summary>Vence en más de 90 días (o no vence).</summary>
    Vigente = 0,
    /// <summary>Entre 30 y 90 días.</summary>
    PorVencer = 1,
    /// <summary>Menos de 30 días.</summary>
    Critico = 2,
    Vencido = 3
}
