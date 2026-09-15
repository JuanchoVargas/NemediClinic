// ============================================================
// axios.ts — Instancia Axios + interceptor JWT + adaptador Nemedi
//
// Responsabilidad:
//   1. Inyectar Authorization: Bearer <token> en cada request
//   2. Adaptar el formato legacy de Nemedi ({ error: "..." }) → ApiError
//   3. Limpiar sesión automáticamente en 401
//
// NOTA: Este interceptor está ADAPTADO al backend .NET de Nemedi.
// Para proyectos nuevos con backend Node + contrato universal
// ({ codigoRespuesta, mensajeRespuesta, data }), usar la versión
// original de react-startup-base.
//
// EQUIVALENTE A: interceptor.js + utils/api.js en SINERGIA
// ============================================================

import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { ApiError } from "@/types/api";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5055";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request interceptor: inyecta JWT ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: adapta formato Nemedi → ApiError ───
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    // Nemedi devuelve { error: "..." } en errores
    if (error.response?.data?.error) {
      const codigo = error.response.status;
      const mensaje = error.response.data.error;
      return Promise.reject(new ApiError(codigo, mensaje, error));
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new ApiError(408, "La solicitud tardó demasiado tiempo", error),
      );
    }

    return Promise.reject(
      new ApiError(
        error.response?.status ?? 0,
        error.message || "Error de red",
        error,
      ),
    );
  },
);

// Si la sesión expira, limpiamos automáticamente.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
