// ============================================================
// appointments.api.ts — Hooks de citas
//
// Backend: /api/v1/Appointments
// Policy: Esteticista (todos los roles); Esteticista solo ve los suyos.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  AppointmentDto,
  CreateAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from "@/types/appointment";

const BASE = "/api/v1/Appointments";

export function useAppointments(
  start: string,
  end: string,
  esteticistId?: string,
  branchId?: string,
) {
  return useQuery({
    queryKey: ["appointments", { start, end, esteticistId, branchId }],
    queryFn: async () => {
      const { data } = await api.get<AppointmentDto[]>(BASE, {
        params: {
          start,
          end,
          esteticistId: esteticistId || undefined,
          branchId: branchId || undefined,
        },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: ["appointments", id],
    queryFn: async () => {
      const { data } = await api.get<AppointmentDto>(`${BASE}/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDaySheet(date: string, branchId?: string) {
  return useQuery({
    queryKey: ["appointments", "day-sheet", date, branchId],
    queryFn: async () => {
      const { data } = await api.get<AppointmentDto[]>(`${BASE}/day-sheet`, {
        params: { date, branchId: branchId || undefined },
      });
      return data;
    },
    enabled: !!date,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAppointmentRequest) => {
      const { data } = await api.post<{ id: string }>(BASE, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateAppointmentStatusRequest;
    }) => {
      await api.put(`${BASE}/${id}/status`, body);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
