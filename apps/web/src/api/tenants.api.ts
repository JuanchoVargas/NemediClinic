// ============================================================
// tenants.api.ts — Hooks de tenants (clínicas)
//
// Backend: /api/v1/Tenants
// Policy: SuperAdmin para todo el controller.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  CreateTenantRequest,
  Tenant,
  UpdateTenantRequest,
} from "@/types/tenant";

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

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTenantRequest) => {
      const { data } = await api.post<Tenant>(BASE, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
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

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}
