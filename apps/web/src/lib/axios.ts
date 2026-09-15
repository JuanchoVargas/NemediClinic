// ============================================================
// axios.ts — Instancia Axios + interceptor JWT + errores legibles
//
// Responsabilidad:
//   1. Inyectar Authorization: Bearer <token> en cada request
//   2. Convertir TODO error HTTP en ApiError con un mensaje legible
//      (nunca "Request failed with status code N")
//   3. 401 → limpiar sesión, avisar y redirigir a /login
//
// Mapa de mensajes:
//   400  → mensaje del backend ({error}) o primer error de validación
//   401  → "Tu sesión expiró, ingresa de nuevo" + logout + redirect
//   403  → "No tienes permisos para esta acción"
//   404  → mensaje del backend o "No encontrado"
//   409  → mensaje del backend
//   5xx  → "Error del servidor, intenta de nuevo"
//   red  → "No hay conexión con el servidor"
//
// NOTA: adaptado al backend .NET de Nemedi, que responde { error }
// en vez del contrato universal { codigoRespuesta, mensajeRespuesta, data }.
//
// EQUIVALENTE A: interceptor.js + utils/api.js en SINERGIA
// ============================================================
import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
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

// ─── Cuerpos de error que devuelve el backend ─────────────────
interface NemediErrorBody {
  error?: string;
}
interface ProblemDetailsBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}
type ErrorBody = NemediErrorBody & ProblemDetailsBody;

const SESSION_EXPIRED = "Tu sesión expiró, ingresa de nuevo";
const FORBIDDEN = "No tienes permisos para esta acción";
const SERVER_ERROR = "Error del servidor, intenta de nuevo";
const NETWORK_ERROR = "No hay conexión con el servidor";
const TIMEOUT_ERROR = "La solicitud tardó demasiado tiempo";

/** Mensaje humano para un error HTTP según status y cuerpo. */
function messageFor(status: number, body: ErrorBody | undefined): string {
  const backendMessage = body?.error;
  if (status === 401) return SESSION_EXPIRED;
  if (status === 403) return FORBIDDEN;
  if (status >= 500) return SERVER_ERROR;
  if (backendMessage) return backendMessage;
  if (status === 400) {
    // ASP.NET ProblemDetails: { title, errors: { campo: ["msg"] } }
    const first = body?.errors ? Object.values(body.errors).flat()[0] : undefined;
    return first ?? body?.detail ?? "Los datos enviados no son válidos";
  }
  if (status === 404) return "No encontrado";
  if (status === 409) return "Conflicto con el estado actual";
  return body?.title ?? "No se pudo completar la solicitud";
}

let redirectingToLogin = false;

/** 401: cierra sesión una sola vez y manda a /login. */
function handleUnauthorized() {
  const store = useAuthStore.getState();
  if (!store.token || redirectingToLogin) return;
  redirectingToLogin = true;
  store.clearSession();
  useToastStore.warning(SESSION_EXPIRED);
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    // Navegación dura a propósito: axios.ts no puede importar el router (ciclo)
    window.setTimeout(() => {
      window.location.assign(`/login?redirect=${redirect}`);
    }, 300);
  } else {
    redirectingToLogin = false;
  }
}

// ─── Response interceptor: único punto que produce ApiError ───
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new ApiError(408, TIMEOUT_ERROR, error));
    }
    if (!error.response) {
      return Promise.reject(new ApiError(0, NETWORK_ERROR, error));
    }

    const status = error.response.status;
    if (status === 401) handleUnauthorized();

    return Promise.reject(new ApiError(status, messageFor(status, error.response.data), error));
  },
);
