// ============================================================
// clinical-records.api.ts — Historia clínica y notas
//
// Backend: /api/v1/patients/{patientId}/clinical-record(/notes)
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type { ClinicalNote, ClinicalRecord } from "@/types/clinical-record";

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
