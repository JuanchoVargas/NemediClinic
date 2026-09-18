namespace NemediClinic.Application.DTOs.Dashboard;

/// <summary>
/// Respuesta de GET /api/v1/dashboard. Los campos financieros (IngresosMes, IngresosPorDia,
/// SaldoPendiente, PaquetesPorVencer) van en null para el rol Esteticista, que tampoco puede
/// leer paquetes ni pagos en el resto de la API; sus métricas de citas son las de SU agenda.
/// </summary>
public class DashboardDto
{
    public DateOnly Desde { get; set; }
    public DateOnly Hasta { get; set; }
    /// <summary>true si las métricas de citas son solo las de la esteticista que consulta.</summary>
    public bool AgendaPropia { get; set; }

    public int CitasHoyTotal { get; set; }
    public List<EstadoCantidadDto> CitasHoyPorEstado { get; set; } = [];
    public List<CitaHoyDto> AgendaHoy { get; set; } = [];

    public int PacientesActivos { get; set; }
    /// <summary>Pacientes creados por día en los últimos 14 días (sparkline).</summary>
    public List<SerieDiaDto> PacientesNuevosPorDia { get; set; } = [];

    public decimal? IngresosMes { get; set; }
    public List<SerieDiaDto>? IngresosPorDia { get; set; }
    public decimal? SaldoPendiente { get; set; }
    public List<PaquetePorVencerDto>? PaquetesPorVencer { get; set; }

    public List<StockAlertaDto> StockEnAlerta { get; set; } = [];
    /// <summary>Últimos 14 días terminando en Hasta.</summary>
    public List<CitasDiaDto> CitasPorDia { get; set; } = [];
    public List<TopProcedimientoDto> TopProcedimientos { get; set; } = [];
}

public class EstadoCantidadDto
{
    public string Estado { get; set; } = string.Empty;
    public int Cantidad { get; set; }
}

public class CitaHoyDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Paciente { get; set; } = string.Empty;
    public string Procedimiento { get; set; } = string.Empty;
    public string Esteticista { get; set; } = string.Empty;
    public DateTime FechaInicio { get; set; }
    public string Estado { get; set; } = string.Empty;
}

public class SerieDiaDto
{
    public DateOnly Fecha { get; set; }
    public decimal Valor { get; set; }
}

public class CitasDiaDto
{
    public DateOnly Fecha { get; set; }
    public int Total { get; set; }
    public int Completadas { get; set; }
    public int Canceladas { get; set; }
}

public class TopProcedimientoDto
{
    public Guid ProcedureId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Cantidad { get; set; }
}

public class PaquetePorVencerDto
{
    public Guid PatientPackageId { get; set; }
    public Guid PatientId { get; set; }
    public string Paciente { get; set; } = string.Empty;
    public string Paquete { get; set; } = string.Empty;
    public DateOnly FechaVencimiento { get; set; }
    public int DiasRestantes { get; set; }
    public int SesionesCompletadas { get; set; }
    public int SesionesTotales { get; set; }
}

public class StockAlertaDto
{
    public Guid ProductId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
    /// <summary>"Amarillo" | "Rojo"</summary>
    public string Semaforo { get; set; } = string.Empty;
}
