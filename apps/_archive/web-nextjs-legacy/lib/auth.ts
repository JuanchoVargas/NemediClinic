const TOKEN_KEY = "nc_token";

type JwtPayload = {
  sub?: string;
  email?: string;
  rol?: string;
  tenant_id?: string;
  exp?: number;
  [key: string]: unknown;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; Max-Age=0; SameSite=Lax`;
}

export function getUser(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = typeof atob === "function" ? atob(padded) : "";
    if (!json) return null;
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const payload = getUser();
  if (!payload) return false;
  if (typeof payload.exp !== "number") return false;
  return payload.exp * 1000 > Date.now();
}
