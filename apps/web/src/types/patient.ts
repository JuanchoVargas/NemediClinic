// ============================================================
// patient.ts — Tipos del dominio Paciente
//
// Mirrors de las DTOs del backend .NET (ASP.NET serializa en camelCase).
// Backend: PatientsController.cs + DTOs/Patients/*.cs
// ============================================================

/**
 * Paciente completo (response de GET /api/v1/Patients/{id}).
 * En el form de creación/edición trabajamos sobre un subset.
 */
export interface Patient {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  email?: string | null;
  fechaNacimiento?: string | null; // ISO 8601
  fotoUrl?: string | null;
  /** Id del Attachment (Kind=Perfil) con la foto de perfil. */
  imagenId?: string | null;
  /** Próxima cita Agendada o Confirmada (hora local). */
  proximaCita?: string | null;
  notasGenerales?: string | null;
  isActive: boolean;
  createdAt: string;
  paquetesActivos?: PatientPackageSummary[];
}

/**
 * Item de listado de pacientes (response de GET /api/v1/Patients).
 * Más liviano que Patient.
 */
export interface PatientSummary {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  imagenId?: string | null;
  /** Nombre del paquete activo si existe; sino undefined. */
  paqueteActivo?: string | null;
  /** TODO: el backend aún no lo expone; queda como placeholder. */
  proximaCita?: string | null;
}

export interface PatientPackageSummary {
  id: string;
  packageNombre: string;
  estado: string; // "Activo" | "Pausado" | "Completado" | "Vencido"
  sesionesCompletadas: number;
  sesionesTotales: number;
}

/**
 * Body del POST /api/v1/Patients.
 */
export interface CreatePatientRequest {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  email?: string;
  fechaNacimiento?: string;
  fotoUrl?: string;
  notasGenerales?: string;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
}

/**
 * Body del PUT /api/v1/Patients/{id}. Todos los campos opcionales
 * (el backend actualiza solo los que vienen distintos de null).
 */
export interface UpdatePatientRequest {
  nombre?: string;
  apellido?: string;
  cedula?: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  fotoUrl?: string;
  notasGenerales?: string;
  isActive?: boolean;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
}
