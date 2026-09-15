// ============================================================
// toast.store.ts — Alertas globales (snackbars/toasts)
//
// Responsabilidad: API simple para disparar toasts desde cualquier
// parte de la app (componentes, hooks, interceptores, error handlers).
// Internamente usa Sonner (la librería instalada por shadcn).
//
// EQUIVALENTE A: stores/alerta.js (Pinia) en SINERGIA
// PATTERNS.md sección: "Estado global"
//
// Notas:
// - NO usamos Zustand aquí porque Sonner ya mantiene su propia cola.
//   Exponemos una API tipo store para mantener la misma "forma" mental.
// - Si en el futuro necesitas más control (persistencia, undo, etc.),
//   se puede migrar a Zustand sin cambiar la API pública.
// ============================================================

import { toast } from "sonner";

export const useToastStore = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },
  /**
   * Reporta un error de cualquier tipo. Detecta ApiError y muestra
   * mensajeRespuesta. Para otros errores, muestra el .message o un fallback.
   *
   * EQUIVALENTE A: useAlertaStore.reportar(error) en SINERGIA
   */
  report: (error: unknown) => {
    if (error instanceof Error) {
      // Si tiene mensajeRespuesta (ApiError), úsalo
      const apiMessage = (error as { mensajeRespuesta?: string }).mensajeRespuesta;
      toast.error(apiMessage || error.message);
    } else if (typeof error === "string") {
      toast.error(error);
    } else {
      toast.error("Ocurrió un error inesperado");
    }
  },
};
