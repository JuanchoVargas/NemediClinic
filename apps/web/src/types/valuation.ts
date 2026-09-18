// ============================================================
// valuation.ts — Valoraciones (diagnóstico + cotización)
//
// Backend: ValuationsController (/api/v1/valuations).
// Una valoración es de un paciente o de un prospecto (nombre y teléfono, sin cédula).
// ============================================================
import type { EvolutionPhoto } from "@/types/file";

export type ValuationEstado = "Pendiente" | "Acepto" | "Rechazo";

export const VALUATION_LABELS: Record<ValuationEstado, string> = {
  Pendiente: "Pendiente",
  Acepto: "Aceptó",
  Rechazo: "Rechazó",
};

export interface Valuation {
  id: string;
  patientId: string | null;
  nombre: string;
  telefono: string;
  esProspecto: boolean;
  esteticistId: string;
  esteticista: string;
  fecha: string;
  diagnostico: string;
  tratamientoSugerido: string | null;
  packageId: string | null;
  paquete: string | null;
  procedimientos: { id: string; nombre: string }[];
  precioCotizado: number;
  estado: ValuationEstado;
  motivoRechazo: string | null;
  fechaCierre: string | null;
  patientPackageId: string | null;
  fotos: EvolutionPhoto[];
}

export interface SaveValuationRequest {
  patientId?: string | null;
  prospectoNombre?: string;
  prospectoTelefono?: string;
  esteticistId: string;
  diagnostico: string;
  tratamientoSugerido?: string;
  packageId?: string | null;
  procedureIds: string[];
  precioCotizado: number;
  adjuntoIds: string[];
}

export interface ConvertValuationRequest {
  nombre?: string;
  apellido?: string;
  cedula?: string;
  email?: string;
  packageId?: string | null;
  precioAcordado?: number;
}

export interface ConvertValuationResponse {
  patientId: string;
  pacienteCreado: boolean;
  patientPackageId: string | null;
}

export interface ValuationStats {
  mes: string;
  total: number;
  pendientes: number;
  aceptadas: number;
  rechazadas: number;
  /** Aceptadas / total, entre 0 y 1. */
  tasaConversion: number;
  valorCotizado: number;
  valorAceptado: number;
}
