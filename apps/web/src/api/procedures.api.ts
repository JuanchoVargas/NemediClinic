// ============================================================
// procedures.api.ts — Hooks del catálogo de procedimientos
//
// Backend: /api/v1/Procedures
// Policy: GET cualquier autenticado, mutaciones requieren Admin.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  CreateProcedureRequest,
  Procedure,
  UpdateProcedureRequest,
} from "@/types/procedure";

const BASE = "/api/v1/Procedures";

// Re-export del tipo Procedure como ProcedureDto para compat retro
// (CalendarPage importa { ProcedureDto } desde este archivo).
export type ProcedureDto = Procedure;

/**
 * Lista plana (sin paginar) para selects/combobox. Trae hasta 100.
 */
export function useProcedures(pageSize = 100) {
  return useQuery({
    queryKey: ["procedures", "list", { pageSize }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Procedure>>(BASE, {
        params: { Page: 1, PageSize: pageSize },
      });
      return data.items;
    },
  });
}

/**
 * Listado paginado con búsqueda — para la tabla de ProceduresPage.
 */
export function useProceduresPaged(
  page: number,
  pageSize: number,
  search?: string,
) {
  return useQuery({
    queryKey: ["procedures", "paged", { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Procedure>>(BASE, {
        params: { Page: page, PageSize: pageSize, Search: search || undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateProcedureRequest) => {
      const { data } = await api.post<Procedure>(BASE, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedures"] });
    },
  });
}

export function useUpdateProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateProcedureRequest;
    }) => {
      await api.put(`${BASE}/${id}`, body);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedures"] });
    },
  });
}

export function useDeleteProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedures"] });
    },
  });
}
