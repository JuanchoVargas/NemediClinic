// ============================================================
// auth.ts — Tipos de autenticación
//
// Responsabilidad: shapes de User, JwtPayload, Login request/response.
//
// EQUIVALENTE A: AuthenticateRequest.cs, UserRegister.cs en SIRECEC
// ============================================================

export interface User {
  id: number | string;
  email: string;
  name: string;
  role?: string;
  tenantId?: string; // ← agregado para Nemedi multi-tenant
  /** true: clave temporal. El router solo deja ver /change-password hasta cambiarla. */
  mustChangePassword?: boolean;
}

export interface JwtPayload {
  sub: string; // subject (user id)
  email?: string;
  name?: string;
  role?: string;
  tenant_id?: string; // ← claim del backend Nemedi
  exp: number; // expiration timestamp (UNIX seconds)
  iat: number; // issued at
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
