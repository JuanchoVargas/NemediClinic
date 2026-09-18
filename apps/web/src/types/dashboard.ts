// ============================================================
// dashboard.ts — Respuesta de GET /api/v1/dashboard
//
// Espejo de NemediClinic.Application/DTOs/Dashboard/DashboardDto.cs.
// Los campos financieros llegan en null para el rol Esteticista.
// ============================================================

export interface SerieDia {
  fecha: string; // YYYY-MM-DD
  valor: number;
}

/** Dinero de un día, ya calculado por el backend (PatientPayment + asignaciones). */
export interface IngresoDia {
  fecha: string;
  /** Pagos recibidos ese día. */
  cobrado: number;
  /** Cambio de la cartera ese día (vendido a crédito − abonos a deuda); puede ser negativo. */
  saldoGenerado: number;
  /** Saldo pendiente total al cierre del día. */
  saldoAcumulado: number;
}

/** Top de productos del periodo por unidades movidas (entradas + salidas). */
export interface ProductoMovido {
  productId: string;
  nombre: string;
  unidadMedida: string;
  entradas: number;
  salidas: number;
  unidades: number;
  stockActual: number;
  stockMinimo: number;
  /** StockStatus de types/inventory.ts: "Verde" | "Amarillo" | "Rojo". */
  semaforo: string;
}

export interface CitasDia {
  fecha: string;
  total: number;
  completadas: number;
  canceladas: number;
}

export interface CitaHoy {
  id: string;
  patientId: string;
  paciente: string;
  procedimiento: string;
  esteticista: string;
  fechaInicio: string;
  estado: string;
}

export interface PaquetePorVencer {
  patientPackageId: string;
  patientId: string;
  paciente: string;
  paquete: string;
  fechaVencimiento: string;
  diasRestantes: number;
  sesionesCompletadas: number;
  sesionesTotales: number;
}

export interface StockAlerta {
  productId: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  semaforo: "Amarillo" | "Rojo";
}

export interface Dashboard {
  desde: string;
  hasta: string;
  agendaPropia: boolean;
  citasHoyTotal: number;
  citasHoyPorEstado: { estado: string; cantidad: number }[];
  agendaHoy: CitaHoy[];
  pacientesActivos: number;
  pacientesNuevosPorDia: SerieDia[];
  ingresosMes: number | null;
  ingresosPorDia: IngresoDia[] | null;
  saldoPendiente: number | null;
  paquetesPorVencer: PaquetePorVencer[] | null;
  stockEnAlerta: StockAlerta[];
  citasPorDia: CitasDia[];
  topProcedimientos: { procedureId: string; nombre: string; cantidad: number }[];
  productosDelMes: ProductoMovido[];
}
