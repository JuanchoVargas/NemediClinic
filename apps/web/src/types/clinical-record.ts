// ============================================================
// clinical-record.ts — Historia clínica y notas
//
// Backend: ClinicalRecordsController.cs
//   GET    /api/v1/patients/{patientId}/clinical-record
//   PUT    /api/v1/patients/{patientId}/clinical-record
//   GET    /api/v1/patients/{patientId}/clinical-record/notes (paged)
//   POST   /api/v1/patients/{patientId}/clinical-record/notes
// ============================================================

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
  fotoEvolucionUrl?: string | null;
  fechaCreacion: string;
}
