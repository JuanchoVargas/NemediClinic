// ============================================================
// patient-package.ts — Paquetes asignados a pacientes
//
// Backend: PatientPackagesController.cs
//   GET /api/v1/patient-packages/patient/{patientId}  → PatientPackage[]
//   GET /api/v1/patient-packages/{id}                 → PatientPackage (full)
//   GET /api/v1/patient-packages/{id}/payments        → PatientPayment[]
// ============================================================

export type PackageEstado = "Activo" | "Pausado" | "Completado" | "Vencido";
export type PaymentState = "SinPagos" | "Parcial" | "Pagado";

export interface PatientPackage {
  id: string;
  patientId: string;
  patientNombre?: string;
  packageId: string;
  packageNombre: string;
  precioAcordado: number;
  fechaInicio: string;
  estado: string; // PackageEstado serializado
  sesionesCompletadas: number;
  sesionesTotales: number;
  totalPagado: number;
  saldoPendiente: number;
  /** 0–100, calculado por el backend. Solo es 100 cuando el saldo es 0. */
  porcentajePagado: number;
  estadoPago: PaymentState;
  /** Inicio + vigencia del paquete; null si no vence. */
  fechaVencimiento?: string | null;
  diasParaVencer?: number | null;
  /** Activo y dentro de la ventana de alerta del paquete. */
  porVencer?: boolean;
  sesiones?: PatientPackageSession[];
  pagos?: PatientPayment[];
}

export interface PatientPackageSession {
  id: string;
  procedureId: string;
  procedureNombre: string;
  numero: number;
  estado: string; // "Pendiente" | "Completada" | "Cancelada"
  fechaCompletada?: string | null;
  clinicalNoteId?: string | null;
}

export interface PatientPayment {
  id: string;
  monto: number;
  fechaPago: string;
  metodoPago: string; // enum serializado
  observacion?: string | null;
  /** Número de transferencia, voucher, recibo… */
  referencia?: string | null;
  /** Nombre de quien lo registró; null en pagos anteriores a la trazabilidad. */
  registradoPor?: string | null;
  comprobanteId?: string | null;
  /** image/* o application/pdf */
  comprobanteContentType?: string | null;
}
