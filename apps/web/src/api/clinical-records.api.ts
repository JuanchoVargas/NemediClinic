// ============================================================
// clinical-records.api.ts — Historia clínica y notas
//
// Backend: /api/v1/patients/{patientId}/clinical-record(/notes)
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  ClinicalNote,
  ClinicalRecord,
  CreateClinicalNoteRequest,
} from "@/types/clinical-record";

export function useClinicalRecord(patientId: string | undefined) {
  return useQuery({
    queryKey: ["clinical-record", patientId],
    queryFn: async () => {
      const { data } = await api.get<ClinicalRecord>(
        `/api/v1/patients/${patientId}/clinical-record`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function useClinicalNotes(
  patientId: string | undefined,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["clinical-notes", patientId, { page, pageSize }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<ClinicalNote>>(
        `/api/v1/patients/${patientId}/clinical-record/notes`,
        { params: { Page: page, PageSize: pageSize } },
      );
      return data;
    },
    enabled: !!patientId,
    placeholderData: (prev) => prev,
  });
}

/** Crea la nota de una sesión. Las fotos ya subidas viajan como adjuntoIds. */
export function useCreateClinicalNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateClinicalNoteRequest) => {
      const { data } = await api.post<ClinicalNote>(
        `/api/v1/patients/${patientId}/clinical-record/notes`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinical-notes", patientId] });
      qc.invalidateQueries({ queryKey: ["patients", patientId, "evolution"] });
    },
  });
}
