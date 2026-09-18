// ============================================================
// branding.api.ts — Marca blanca por dominio
//
// Backend: GET /api/v1/branding (público). Devuelve el canal cuyo dominio
// coincide con el Host de la request; si ninguno coincide, Nemedi.
//
// Para probar otra marca en local sin tocar el archivo hosts:
//   VITE_BRANDING_HOST=app.infotex.co en apps/web/.env.local
// (el API solo acepta ese parámetro en Development).
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Branding } from "@/types/platform";

export const DEFAULT_BRANDING: Branding = {
  canal: "nemedi",
  nombreComercial: import.meta.env.VITE_APP_NAME || "NemediClinic",
  logoUrl: null,
  colorPrimario: "#1F4E79",
  colorSecundario: "#D9A441",
  dominio: "",
};

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const host = import.meta.env.DEV ? import.meta.env.VITE_BRANDING_HOST : undefined;
      const { data } = await api.get<Branding>("/api/v1/branding", {
        params: { host: host || undefined },
      });
      return data;
    },
    // La marca no cambia durante la sesión: una sola request por carga.
    staleTime: Infinity,
    retry: 1,
    // Si el branding falla, la app sigue con la marca por defecto: sin toast.
    meta: { silent: true },
  });
}
