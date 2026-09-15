// Cliente HTTP mínimo para preparar y limpiar datos desde los tests de UI.
export const API = process.env.E2E_API_URL ?? "http://localhost:5055";

export const CREDS = {
  superadmin: { email: process.env.E2E_SUPERADMIN_EMAIL ?? "juandiegov2002@gmail.com", password: process.env.E2E_SUPERADMIN_PASSWORD ?? "Admin2026!" },
  admin: { email: "recepcion@nemedi.demo", password: "Demo2026!" },
  esteticista: { email: "laura.perez@nemedi.demo", password: "Demo2026!" },
  esteticista2: { email: "camila.ruiz@nemedi.demo", password: "Demo2026!" },
};

export interface Session {
  token: string;
  userInfo: { id: string; nombre: string; apellido: string; email: string; rol: string; tenantId: string; branchId: string | null };
}

export async function req<T = unknown>(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: T | null = null;
  try { data = text ? (JSON.parse(text) as T) : null; } catch { data = null; }
  return { status: res.status, data, text };
}

export async function apiLogin(email: string, password: string): Promise<Session> {
  const r = await req<Session>("POST", "/api/v1/auth/login", { body: { email, password } });
  if (r.status !== 200 || !r.data) throw new Error(`login ${email} → ${r.status} ${r.text}`);
  return r.data;
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localIso = (d: Date) => `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export function dayAt(offset: number, hour = 0, minute = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

interface Paged<T> { items: T[]; totalCount: number }
export async function findPatient(token: string, search: string) {
  const r = await req<Paged<{ id: string; nombre: string; apellido: string; cedula: string }>>("GET", `/api/v1/patients?search=${encodeURIComponent(search)}&page=1&pageSize=5`, { token });
  return r.data?.items[0] ?? null;
}
export async function listAll<T>(token: string, path: string) {
  const r = await req<Paged<T>>("GET", `${path}${path.includes("?") ? "&" : "?"}page=1&pageSize=200`, { token });
  return r.data?.items ?? [];
}

/** Elimina (soft) sin fallar si ya no existe. */
export async function safeDelete(token: string, path: string) {
  const r = await req("DELETE", path, { token });
  return r.status;
}
