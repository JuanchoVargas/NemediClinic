// ============================================================
// auth.store.ts — Sesión: token JWT, usuario actual, login/logout
//
// Responsabilidad: estado de autenticación persistido en localStorage.
// Lo consulta el interceptor de Axios y el ProtectedRoute.
//
// EQUIVALENTE A: stores/sesion.js (Pinia) en SINERGIA
// PATTERNS.md sección: "Estado global → Pinia vs Zustand"
//
// Persistencia: localStorage (sobrevive cierre de pestaña).
// Si quieres sessionStorage (se borra al cerrar), cambia `createJSONStorage`.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { decodeJwt } from "jose";
import type { User, JwtPayload } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: User | null;

  // Acciones
  setSession: (token: string, user: User) => void;
  clearSession: () => void;

  // Computed (en Pinia eran getters; aquí son métodos)
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setSession: (token, user) => {
        set({ token, user });
      },

      clearSession: () => {
        set({ token: null, user: null });
      },

      isAuthenticated: () => {
        const { token } = get();
        if (!token) return false;
        return !get().isTokenExpired();
      },

      isTokenExpired: () => {
        const { token } = get();
        if (!token) return true;
        try {
          const payload = decodeJwt(token) as JwtPayload;
          const now = Math.floor(Date.now() / 1000);
          return payload.exp < now;
        } catch {
          return true;
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Solo persistimos token y user, no las funciones
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
