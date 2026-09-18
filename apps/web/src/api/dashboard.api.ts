// ============================================================
// dashboard.api.ts — Números del Dashboard en una sola llamada
//
// Backend: GET /api/v1/dashboard?branchId=&desde=&hasta=  (cualquier rol de clínica)
// branchId filtra las citas; pagos, paquetes, pacientes y stock son del tenant.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Dashboard } from "@/types/dashboard";

export function useDashboard(branchId?: string) {
  return useQuery({
    queryKey: ["dashboard", { branchId }],
    queryFn: async () => {
      const { data } = await api.get<Dashboard>("/api/v1/dashboard", {
        params: { branchId: branchId || undefined },
      });
      return data;
    },
    // El resumen del día envejece rápido: 1 min y se refresca al volver a la pestaña
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
}
