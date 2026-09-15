// ============================================================
// patients.api.ts — Hooks de pacientes (TanStack Query)
//
// Backend: /api/v1/Patients
// Policy: Esteticista (todos los roles)
//
// EQUIVALENTE A: stores/usuario.js + acciones get... en SINERGIA
// PATTERNS.md sección: "HTTP / Server state"
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  CreatePatientRequest,
  Patient,
  PatientSummary,
  UpdatePatientRequest,
} from "@/types/patient";

const BASE = "/api/v1/Patients";

export function usePatients(page: number, pageSize: number, search?: string) {
  return useQuery({
    queryKey: ["patients", { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<PatientSummary>>(BASE, {
        params: { Page: page, PageSize: pageSize, Search: search || undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev, // mantiene la página anterior mientras llega la nueva
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: async () => {
      const { data } = await api.get<Patient>(`${BASE}/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePatientRequest) => {
      const { data } = await api.post<Patient>(BASE, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePatientRequest }) => {
      await api.put(`${BASE}/${id}`, body);
      return { id };
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patients", id] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
