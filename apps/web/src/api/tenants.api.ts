// ============================================================
// tenants.api.ts — Hooks de tenants (clínicas)
//
// Backend: /api/v1/Tenants
// Policy: SuperAdmin ve y edita SOLO su tenant; GET /current es para cualquier rol.
// Crear y eliminar tenants es del PlatformAdmin → platform.api.ts.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type { Tenant, UpdateTenantRequest } from "@/types/tenant";
import type { CurrentTenant } from "@/types/platform";

const BASE = "/api/v1/Tenants";

/**
 * Listado paginado con búsqueda — para la tabla de TenantsPage.
 */
export function useTenantsPaged(
  page: number,
  pageSize: number,
  search?: string,
) {
  return useQuery({
    queryKey: ["tenants", "paged", { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Tenant>>(BASE, {
        params: { Page: page, PageSize: pageSize, Search: search || undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTenantRequest }) => {
      await api.put(`${BASE}/${id}`, body);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

/**
 * Tenant de la sesión (plan y estado). Alimenta el aviso de "Cuenta suspendida".
 * `enabled` lo decide quien llama: solo tiene sentido con sesión de clínica.
 */
export function useCurrentTenant(enabled: boolean) {
  return useQuery({
    queryKey: ["tenants", "current"],
    queryFn: async () => {
      const { data } = await api.get<CurrentTenant>(`${BASE}/current`);
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
    meta: { silent: true },
  });
}
