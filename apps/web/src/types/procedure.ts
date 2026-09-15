// ============================================================
// procedure.ts — Tipos del catálogo de procedimientos
//
// Backend: ProceduresController.cs + DTOs/Procedures/*.cs
// Policy de mutación: Admin. GET ahora abierto a cualquier autenticado.
// ============================================================

export interface Procedure {
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  areaCorporal: string;
  activo: boolean;
  createdAt?: string;
}

export interface CreateProcedureRequest {
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  areaCorporal: string;
}

export interface UpdateProcedureRequest {
  nombre?: string;
  descripcion?: string;
  precioBase?: number;
  duracionMinutos?: number;
  areaCorporal?: string;
  activo?: boolean;
}
