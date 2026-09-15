// ============================================================
// tenant.ts — Tipos de tenants (clínicas)
//
// Backend: /api/v1/Tenants (solo SuperAdmin). DTO con camelCase.
// Nota: la propiedad C# `NIT` se serializa como `nit` (la política
// camelCase de System.Text.Json baja toda la sigla a minúsculas).
// ============================================================

export interface Tenant {
  id: string;
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  logo?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTenantRequest {
  nombre: string;
  nit: string;
  email: string;
  telefono?: string;
}

export interface UpdateTenantRequest {
  nombre?: string;
  nit?: string;
  telefono?: string;
  email?: string;
  isActive?: boolean;
}
