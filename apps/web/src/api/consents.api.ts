// ============================================================
// consents.api.ts — Consentimiento informado
//
// Backend: /api/v1/consent-templates (plantilla por procedimiento; editar = Admin)
//          /api/v1/consents (preview y firma), /api/v1/patients/{id}/consents
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Consent, ConsentPreview, ConsentTemplate, SignConsentRequest } from "@/types/consent";

export function useConsentTemplate(procedureId: string | undefined) {
  return useQuery({
    queryKey: ["consent-templates", procedureId],
    queryFn: async () => {
      const { data } = await api.get<ConsentTemplate>(`/api/v1/consent-templates/procedure/${procedureId}`);
      return data;
    },
    enabled: !!procedureId,
  });
}

export function useSaveConsentTemplate(procedureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { titulo: string; texto: string }) => {
      const { data } = await api.put<ConsentTemplate>(`/api/v1/consent-templates/procedure/${procedureId}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consent-templates"] });
      qc.invalidateQueries({ queryKey: ["consents", "preview"] });
    },
  });
}

/** Texto con las variables resueltas: lo que el paciente va a leer y firmar. */
export function useConsentPreview(patientId: string | undefined, procedureId: string | undefined) {
  return useQuery({
    queryKey: ["consents", "preview", patientId, procedureId],
    queryFn: async () => {
      const { data } = await api.get<ConsentPreview>("/api/v1/consents/preview", { params: { patientId, procedureId } });
      return data;
    },
    enabled: !!patientId && !!procedureId,
    staleTime: 0, // lleva la fecha de hoy y los datos actuales del paciente
  });
}

export function usePatientConsents(patientId: string | undefined) {
  return useQuery({
    queryKey: ["consents", "by-patient", patientId],
    queryFn: async () => {
      const { data } = await api.get<Consent[]>(`/api/v1/patients/${patientId}/consents`);
      return data;
    },
    enabled: !!patientId,
  });
}

export function useSignConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: SignConsentRequest) => {
      const { data } = await api.post<Consent>("/api/v1/consents", body);
      return data;
    },
    onSuccess: (consent) => {
      qc.invalidateQueries({ queryKey: ["consents", "by-patient", consent.patientId] });
    },
  });
}
