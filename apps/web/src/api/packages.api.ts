// ============================================================
// packages.api.ts — Hooks del catálogo de paquetes
//
// Backend: /api/v1/Packages
// Policy: Admin para todo (controller-level).
//
// IMPORTANTE: useCreatePackage orquesta DOS llamadas:
//   1. POST /packages (sin procedures)
//   2. N x POST /packages/{id}/procedures (uno por procedimiento)
// Si falla algún paso 2, el paquete queda creado pero incompleto;
// el callsite debe manejarlo (idealmente con UI que permita reintentar).
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  AddPackageProcedureRequest,
  CreatePackageRequest,
  Package,
  PackageDetail,
  UpdatePackageRequest,
} from "@/types/package";

const BASE = "/api/v1/Packages";

export function usePackages(page: number, pageSize: number, search?: string) {
  return useQuery({
    queryKey: ["packages", { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Package>>(BASE, {
        params: { Page: page, PageSize: pageSize, Search: search || undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function usePackage(id: string | undefined) {
  return useQuery({
    queryKey: ["packages", id],
    queryFn: async () => {
      const { data } = await api.get<PackageDetail>(`${BASE}/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePackageRequest) => {
      // Paso 1: crear el paquete base
      const { procedures, ...packageData } = body;
      const { data: created } = await api.post<Package>(BASE, packageData);

      // Paso 2: agregar procedimientos secuencialmente
      // (secuencial para que si falla uno, los anteriores ya están persistidos)
      for (const p of procedures) {
        await api.post(`${BASE}/${created.id}/procedures`, p);
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdatePackageRequest;
    }) => {
      await api.put(`${BASE}/${id}`, body);
      return { id };
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["packages"] });
      qc.invalidateQueries({ queryKey: ["packages", id] });
    },
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useAddProcedureToPackage(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AddPackageProcedureRequest) => {
      await api.post(`${BASE}/${packageId}/procedures`, body);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages", packageId] });
    },
  });
}
