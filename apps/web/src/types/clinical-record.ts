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

export interface ClinicalNote {
  id: string;
  appointmentId?: string | null;
  esteticistId: string;
  esteticistNombre?: string;
  procedimiento: string;
  observaciones?: string | null;
  productosUsados?: string | null;
  /** Fotos de la sesión (Antes primero). Se pintan con <SecureImage id>. */
  fotos: EvolutionPhoto[];
  fechaCreacion: string;
}

export interface CreateClinicalNoteRequest {
  esteticistId: string;
  procedimiento: string;
  observaciones: string;
  productosUsados?: string;
  appointmentId?: string;
  /** Ids de adjuntos subidos antes (pendientes) que la nota reclama al crearse. */
  adjuntoIds: string[];
}
