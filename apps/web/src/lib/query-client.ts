// ============================================================
// query-client.ts — Configuración global de TanStack Query
//
// Responsabilidad:
//   1. Instancia única de QueryClient compartida por toda la app
//   2. Error handler GLOBAL que dispara toast automáticamente
//      (esto reemplaza el try/catch + storeAlerta.reportar() de Sinergia)
//   3. Defaults razonables (staleTime, retries, refetch policy)
//
// EQUIVALENTE A: el patrón de "errores centralizados" de SINERGIA,
// pero AUTOMÁTICO en vez de manual en cada action.
//
// PATTERNS.md sección: "HTTP / Server state"
// ============================================================

import { QueryClient, MutationCache, QueryCache } from "@tanstack/react-query";
import { useToastStore } from "@/stores/toast.store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min: cache idempotente automático
      gcTime: 10 * 60 * 1000, // 10 min antes de descartar de memoria
      retry: 1, // 1 reintento (no más para no agotar al user)
      refetchOnWindowFocus: false, // No refetch al volver a la pestaña
    },
    mutations: {
      retry: 0, // Mutations no se reintentan automáticamente
    },
  },

  // ─── Error global de queries (GETs) ────────────────────
  // Reemplaza el "try/catch { storeAlerta.reportar() }" de cada action
  // de Pinia. Aquí pasa automáticamente.
  queryCache: new QueryCache({
    onError: (error, query) => {
      // meta.silent: queries accesorias (branding, estado del tenant) que no deben molestar
      if (query.meta?.silent) return;
      useToastStore.report(error);
    },
  }),

  // ─── Error global de mutations (POST/PUT/DELETE) ───────
  mutationCache: new MutationCache({
    onError: (error) => {
      useToastStore.report(error);
    },
  }),
});
