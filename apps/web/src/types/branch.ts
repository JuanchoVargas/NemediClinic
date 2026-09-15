// ============================================================
// branch.ts — Tipos de sedes (Branches)
//
// Backend: /api/v1/Branches. DTO con camelCase (ASP.NET default).
// ============================================================

export interface Branch {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  tenantId: string;
  createdAt: string;
}

export interface CreateBranchRequest {
  nombre: string;
  direccion: string;
  telefono: string;
}

export interface UpdateBranchRequest {
  nombre?: string;
  direccion?: string;
  telefono?: string;
}
