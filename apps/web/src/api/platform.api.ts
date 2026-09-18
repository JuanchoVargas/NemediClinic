// ============================================================
// platform.api.ts — Hooks del nivel de plataforma
//
// Backend: /api/v1/platform/{tenants,channels,leads,liquidacion}
// Policy: PlatformAdmin en todo. Un SuperAdmin de clínica recibe 403.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  ActivateLeadRequest,
  BootstrapAdminRequest,
  BootstrapAdminResponse,
  Channel,
  CreateLeadRequest,
  CreatePlatformTenantRequest,
  Lead,
  Liquidacion,
  PlatformTenant,
  SaveChannelRequest,
  UpdatePlatformTenantRequest,
} from "@/types/platform";

const BASE = "/api/v1/platform";

// Crear/activar/editar un tenant mueve también los conteos por canal y la liquidación.
function useInvalidatePlatform() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["platform"] });
}

// ─── Tenants ───────────────────────────────────────────────
export function usePlatformTenants(search?: string) {
  return useQuery({
    queryKey: ["platform", "tenants", { search }],
    queryFn: async () => {
      const { data } = await api.get<PlatformTenant[]>(`${BASE}/tenants`, {
        params: { search: search || undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreatePlatformTenant() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async (body: CreatePlatformTenantRequest) => {
      const { data } = await api.post<PlatformTenant>(`${BASE}/tenants`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePlatformTenant() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePlatformTenantRequest }) => {
      const { data } = await api.put<PlatformTenant>(`${BASE}/tenants/${id}`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePlatformTenant() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/tenants/${id}`);
      return { id };
    },
    onSuccess: invalidate,
  });
}

export function useBootstrapAdmin() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: BootstrapAdminRequest }) => {
      const { data } = await api.post<BootstrapAdminResponse>(`${BASE}/tenants/${id}/bootstrap-admin`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

// ─── Canales ───────────────────────────────────────────────
export function useChannels() {
  return useQuery({
    queryKey: ["platform", "channels"],
    queryFn: async () => {
      const { data } = await api.get<Channel[]>(`${BASE}/channels`);
      return data;
    },
  });
}

export function useSaveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveChannelRequest }) => {
      const { data } = id
        ? await api.put<Channel>(`${BASE}/channels/${id}`, body)
        : await api.post<Channel>(`${BASE}/channels`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform"] });
      // El canal editado puede ser el del dominio actual
      qc.invalidateQueries({ queryKey: ["branding"] });
    },
  });
}

export function useDeleteChannel() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/channels/${id}`);
      return { id };
    },
    onSuccess: invalidate,
  });
}

// ─── Oportunidades (leads) ─────────────────────────────────
export function useLeads() {
  return useQuery({
    queryKey: ["platform", "leads"],
    queryFn: async () => {
      const { data } = await api.get<Lead[]>(`${BASE}/leads`);
      return data;
    },
  });
}

export function useCreateLead() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async (body: CreateLeadRequest) => {
      const { data } = await api.post<Lead>(`${BASE}/leads`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReleaseLead() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<Lead>(`${BASE}/leads/${id}`, { liberar: true });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLead() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/leads/${id}`);
      return { id };
    },
    onSuccess: invalidate,
  });
}

export function useActivateLead() {
  const invalidate = useInvalidatePlatform();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ActivateLeadRequest }) => {
      const { data } = await api.post<PlatformTenant>(`${BASE}/leads/${id}/activate`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

// ─── Liquidación ───────────────────────────────────────────
/** `mes` en formato YYYY-MM. */
export function useLiquidacion(mes: string) {
  return useQuery({
    queryKey: ["platform", "liquidacion", mes],
    queryFn: async () => {
      const { data } = await api.get<Liquidacion>(`${BASE}/liquidacion`, { params: { mes } });
      return data;
    },
    enabled: /^\d{4}-\d{2}$/.test(mes),
  });
}
