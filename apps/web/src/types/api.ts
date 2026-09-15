// ============================================================
// api.ts — Tipos compartidos para respuestas del backend
//
// Responsabilidad: ApiResponse (contrato universal), PagedResponse
// (forma de listados paginados de Nemedi), ApiError.
//
// Nota: Nemedi NO sigue el contrato universal {codigoRespuesta,
// mensajeRespuesta, data}. Devuelve el payload directo en éxito y
// {error} en error. El interceptor de axios.ts adapta a ApiError.
// PATTERNS.md sección: "Contrato de respuesta API (UNIVERSAL)"
// ============================================================

/**
 * Contrato universal (para proyectos NUEVOS con backend Node).
 * Nemedi NO lo usa, pero queda definido por consistencia.
 */
export interface ApiResponse<T = unknown> {
  codigoRespuesta: number;
  mensajeRespuesta: string;
  data: T | null;
}

/**
 * Forma estándar de respuestas paginadas (PagedResponse<T> en .NET).
 * Endpoints como GET /api/v1/Patients la devuelven directamente.
 */
export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/**
 * Error normalizado. Lo lanza el interceptor cuando un response
 * tiene status != 2xx.
 */
export class ApiError extends Error {
  codigoRespuesta: number;
  mensajeRespuesta: string;
  originalError?: unknown;

  constructor(
    codigoRespuesta: number,
    mensajeRespuesta: string,
    originalError?: unknown,
  ) {
    super(mensajeRespuesta);
    this.name = "ApiError";
    this.codigoRespuesta = codigoRespuesta;
    this.mensajeRespuesta = mensajeRespuesta;
    this.originalError = originalError;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
