// ============================================================
// patient-package.ts — Paquetes asignados a pacientes
//
// Backend: PatientPackagesController.cs
//   GET /api/v1/patient-packages/patient/{patientId}  → PatientPackage[]
//   GET /api/v1/patient-packages/{id}                 → PatientPackage (full)
//   GET /api/v1/patient-packages/{id}/payments        → PatientPayment[]
// ============================================================

export type PackageEstado = "Activo" | "Pausado" | "Completado" | "Vencido";

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
}
