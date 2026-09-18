// ============================================================
// procedure.ts — Tipos del catálogo de procedimientos
//
// Backend: ProceduresController.cs + DTOs/Procedures/*.cs
// Policy de mutación: Admin. GET ahora abierto a cualquier autenticado.
// ============================================================

export interface Procedure {
  /** La cita no pasa a "En curso" sin un consentimiento informado firmado. */
  requiereConsentimiento?: boolean;
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  areaCorporal: string;
  activo: boolean;
  createdAt?: string;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
}

export interface CreateProcedureRequest {
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  areaCorporal: string;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
  requiereConsentimiento?: boolean;
}

export interface UpdateProcedureRequest {
  nombre?: string;
  descripcion?: string;
  precioBase?: number;
  duracionMinutos?: number;
  areaCorporal?: string;
  activo?: boolean;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
  requiereConsentimiento?: boolean;
}
