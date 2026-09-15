// ============================================================
// branches.api.ts — Hooks de sedes (Branches)
//
// Backend: /api/v1/Branches
// Policy: GET requiere Admin; POST requiere SuperAdmin; PUT/DELETE Admin.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  Branch,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "@/types/branch";

const BASE = "/api/v1/Branches";

/**
 * Lista plana (sin paginar) para selects — p. ej. asignar sede a un usuario.
 */
export function useBranches(pageSize = 100) {
  return useQuery({
    queryKey: ["branches", "list", { pageSize }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Branch>>(BASE, {
        params: { Page: 1, PageSize: pageSize },
      });
      return data.items;
    },
  });
}

/**
 * Listado paginado con búsqueda — para la tabla de BranchesPage.
 */
export function useBranchesPaged(
  page: number,
  pageSize: number,
  search?: string,
) {
  return useQuery({
    queryKey: ["branches", "paged", { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Branch>>(BASE, {
        params: { Page: page, PageSize: pageSize, Search: search || undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateBranchRequest) => {
      const { data } = await api.post<Branch>(BASE, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateBranchRequest }) => {
      await api.put(`${BASE}/${id}`, body);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
