// ============================================================
// files.api.ts — Adjuntos de imagen
//
// Backend: /api/v1/files
//   POST   /            multipart (file, entityType, kind, entityId?) → Attachment
//   GET    /{id}/url    → URL firmada (10 min) para usar en <img>
//   DELETE /{id}        soft delete (también limpia ImagenId de la entidad)
//
// Las imágenes NUNCA se piden con axios: un <img> no puede mandar el JWT, así
// que se pide la URL firmada y el navegador descarga con ella. Ver
// hooks/use-signed-image.ts y components/shared/SecureImage.tsx.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/axios";
import type {
  Attachment,
  AttachmentEntityType,
  AttachmentKind,
  EvolutionSession,
  SignedImage,
} from "@/types/file";

const BASE = "/api/v1/files";

export interface UploadFileInput {
  file: Blob;
  fileName: string;
  entityType: AttachmentEntityType;
  kind: AttachmentKind;
  /** Omitir si la entidad aún no existe: el adjunto queda pendiente y la entidad lo reclama al guardarse. */
  entityId?: string;
  onProgress?: (percent: number) => void;
}

export function useUploadFile() {
  return useMutation({
    // El error se muestra junto al control de subida (use-image-uploader), no como toast
    meta: { silent: true },
    mutationFn: async ({ file, fileName, entityType, kind, entityId, onProgress }: UploadFileInput) => {
      const form = new FormData();
      form.append("file", file, fileName);
      form.append("entityType", entityType);
      form.append("kind", kind);
      if (entityId) form.append("entityId", entityId);

      const { data } = await api.post<Attachment>(BASE, form, {
        // Sin Content-Type fijo: el navegador pone multipart/form-data con su boundary
        headers: { "Content-Type": undefined },
        onUploadProgress: (e) => {
          if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
      });
      return data;
    },
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return { id };
    },
    onSuccess: ({ id }) => {
      qc.removeQueries({ queryKey: ["files", "url", id] });
    },
  });
}

interface SignedUrlResponse {
  url: string;
  thumbUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export async function fetchSignedImage(id: string): Promise<SignedImage> {
  const { data } = await api.get<SignedUrlResponse>(`${BASE}/${id}/url`);
  return {
    url: API_BASE_URL + data.url,
    thumbUrl: API_BASE_URL + data.thumbUrl,
    expiresInSeconds: data.expiresInSeconds,
  };
}

/** Sesiones del paciente en orden cronológico, con sus fotos Antes/Después. */
export function usePatientEvolution(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "evolution"],
    queryFn: async () => {
      const { data } = await api.get<EvolutionSession[]>(`/api/v1/patients/${patientId}/evolution`);
      return data;
    },
    enabled: !!patientId,
  });
}
