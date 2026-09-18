// ============================================================
// users.api.ts — Hooks de usuarios del sistema
//
// Backend: /api/v1/Users (lectura/edición/borrado, policy Admin) y
//          /api/v1/auth/register (alta de usuarios).
// Policy: Admin para mutaciones; SuperAdmin ve todos los tenants.
//
// Gotcha: el backend serializa el enum UserRole como ENTERO
// (SuperAdmin=0, Admin=1, Esteticista=2). Al crear/editar enviamos el
// número (ROLE_TO_INT); al leer, UserDto.rol ya viene como string.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";

const BASE = "/api/v1/Users";

export interface UserDto {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string; // "SuperAdmin" | "Admin" | "Esteticista"
  branchId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type RolName = "SuperAdmin" | "Admin" | "Esteticista";

/** Mapeo nombre→entero esperado por el enum UserRole del backend. */
export const ROLE_TO_INT: Record<RolName, number> = {
  SuperAdmin: 0,
  Admin: 1,
  Esteticista: 2,
};

export interface CreateUserRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: number; // UserRole int
  branchId?: string | null;
}

export interface UpdateUserRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: number; // UserRole int
  branchId?: string | null;
  isActive?: boolean;
}

export function useUsers(pageSize = 100) {
  return useQuery({
    queryKey: ["users", { pageSize }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<UserDto>>(BASE, {
        params: { Page: 1, PageSize: pageSize },
      });
      return data.items;
    },
  });
}

/**
 * Versión filtrada: solo usuarios con rol Esteticista (incluye también
 * Admin/SuperAdmin que pueden actuar como tales en la creación de citas).
 */
export function useEsteticistas() {
  const query = useUsers();
  const data = query.data?.filter(
    (u) => u.isActive && (u.rol === "Esteticista" || u.rol === "Admin" || u.rol === "SuperAdmin"),
  );
  return { ...query, data };
}

/**
 * Listado paginado con búsqueda — para la tabla de UsersPage.
 *
 * El backend solo filtra por `Search` (nombre/apellido/email). El filtro
 * por rol se aplica en cliente sobre la página recibida.
 */
export function useUsersPaged(
  page: number,
  pageSize: number,
  search?: string,
  rol?: RolName,
) {
  return useQuery({
    queryKey: ["users", "paged", { page, pageSize, search, rol }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<UserDto>>(BASE, {
        params: { Page: page, PageSize: pageSize, Search: search || undefined },
      });
      if (rol) {
        return { ...data, items: data.items.filter((u) => u.rol === rol) };
      }
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserRequest) => {
      // El alta de usuarios pasa por el endpoint de registro.
      const { data } = await api.post("/api/v1/auth/register", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateUserRequest }) => {
      await api.put(`${BASE}/${id}`, body);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export interface ResetPasswordResponse {
  userId: string;
  email: string;
  passwordTemporal: string;
  emailEnviado: boolean;
}

/** Clave temporal para un usuario del tenant (Admin/SuperAdmin). Se muestra una sola vez. */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ResetPasswordResponse>(`${BASE}/${id}/reset-password`);
      return data;
    },
  });
}
