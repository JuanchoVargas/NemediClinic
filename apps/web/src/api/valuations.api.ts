// ============================================================
// valuations.api.ts — Valoraciones
//
// Backend: /api/v1/valuations  (crear/editar/rechazar: cualquier rol; convertir/eliminar: Admin)
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  ConvertValuationRequest,
  ConvertValuationResponse,
  SaveValuationRequest,
  Valuation,
  ValuationEstado,
  ValuationStats,
} from "@/types/valuation";

const BASE = "/api/v1/valuations";

export function useValuations(estado?: ValuationEstado, search?: string) {
  return useQuery({
    queryKey: ["valuations", "list", { estado, search }],
    queryFn: async () => {
      const { data } = await api.get<Valuation[]>(BASE, { params: { estado, search: search || undefined } });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

/** Embudo y tasa de conversión del mes (YYYY-MM). */
export function useValuationStats(mes: string) {
  return useQuery({
    queryKey: ["valuations", "stats", mes],
    queryFn: async () => {
      const { data } = await api.get<ValuationStats>(`${BASE}/stats`, { params: { mes } });
      return data;
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["valuations"] });
}

export function useSaveValuation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveValuationRequest }) => {
      const { data } = id ? await api.put<Valuation>(`${BASE}/${id}`, body) : await api.post<Valuation>(BASE, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRejectValuation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const { data } = await api.post<Valuation>(`${BASE}/${id}/reject`, { motivo });
      return data;
    },
    onSuccess: invalidate,
  });
}

/** Aceptó: crea el paciente si era prospecto y le asigna el paquete. */
export function useConvertValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ConvertValuationRequest }) => {
      const { data } = await api.post<ConvertValuationResponse>(`${BASE}/${id}/convert`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["valuations"] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient-packages"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteValuation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: invalidate,
  });
}
