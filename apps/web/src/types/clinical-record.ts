// ============================================================
// clinical-record.ts — Historia clínica y notas
//
// Backend: ClinicalRecordsController.cs
//   GET    /api/v1/patients/{patientId}/clinical-record
//   PUT    /api/v1/patients/{patientId}/clinical-record
//   GET    /api/v1/patients/{patientId}/clinical-record/notes (paged)
//   POST   /api/v1/patients/{patientId}/clinical-record/notes
// ============================================================

import type { EvolutionPhoto } from "@/types/file";

export interface ClinicalRecord {
  id: string;
  patientId: string;
  antecedentesMedicos?: string | null;
  alergias?: string | null;
  medicamentosActuales?: string | null;
  observacionesGenerales?: string | null;
  updatedAt: string;
}

/** Un producto consumido en la sesión (espejo de ClinicalNoteProductDto). */
export interface ClinicalNoteProduct {
  productId: string;
  nombre: string;
  unidadMedida: string;
  cantidad: number;
}

/** Lo que se envía al crear la nota. */
export interface ClinicalNoteProductInput {
  productId: string;
  cantidad: number;
}

/** Producto que quedó bajo el stock mínimo tras descontar (espejo de StockAlertaDto). */
export interface StockAlerta {
  productId: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  semaforo: string;
}

/** Respuesta de POST …/notes: la nota y lo que quedó bajo el mínimo. */
export interface CreateClinicalNoteResponse {
  nota: ClinicalNote;
  alertasStock: StockAlerta[];
}

/** Una línea del historial de consumo de cabina de un paciente. */
export interface PatientConsumption {
  clinicalNoteId: string;
  appointmentId: string | null;
  fecha: string;
  procedimiento: string;
  esteticista: string;
  productId: string;
  producto: string;
  unidadMedida: string;
  cantidad: number;
}

export interface ClinicalNote {
  id: string;
  appointmentId?: string | null;
  esteticistId: string;
  esteticistNombre?: string;
  procedimiento: string;
  observaciones?: string | null;
  /** Texto libre heredado: solo lo traen las notas anteriores al consumo de cabina. */
  productosUsados?: string | null;
  /** Consumo de cabina de la sesión. */
  productos: ClinicalNoteProduct[];
  /** Fotos de la sesión (Antes primero). Se pintan con <SecureImage id>. */
  fotos: EvolutionPhoto[];
  fechaCreacion: string;
}

export interface CreateClinicalNoteRequest {
  esteticistId: string;
  procedimiento: string;
  observaciones: string;
  productos: ClinicalNoteProductInput[];
  appointmentId?: string;
  /** Ids de adjuntos subidos antes (pendientes) que la nota reclama al crearse. */
  adjuntoIds: string[];
}
