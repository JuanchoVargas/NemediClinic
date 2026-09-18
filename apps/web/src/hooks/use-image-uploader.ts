// ============================================================
// use-image-uploader.ts — Flujo de subida de UNA imagen (o un PDF)
//
// validar → comprimir en el navegador (máx 1600 px) → POST /files con progreso.
// Con { allowPdf: true } (comprobantes) acepta además un PDF, que sube tal cual.
// Lo comparten ImageUpload (una imagen) y PhotoListUpload (varias).
// El error se expone como texto legible para pintarlo junto al control; por eso
// la mutation va con meta.silent (sin toast global duplicado).
// ============================================================
import { useCallback, useState } from "react";
import { useUploadFile } from "@/api/files.api";
import { compressImage, PDF_TYPE, validateDocumentFile, validateImageFile } from "@/lib/compress-image";
import type { Attachment, AttachmentEntityType, AttachmentKind } from "@/types/file";

interface UploadTarget {
  entityType: AttachmentEntityType;
  kind: AttachmentKind;
  entityId?: string;
}

export function useImageUploader() {
  const uploadFile = useUploadFile();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, target: UploadTarget, options?: { allowPdf?: boolean }): Promise<Attachment | null> => {
      const invalid = options?.allowPdf ? validateDocumentFile(file) : validateImageFile(file);
      if (invalid) {
        setError(invalid);
        return null;
      }

      setError(null);
      setProgress(0);
      try {
        const prepared = file.type === PDF_TYPE ? { blob: file, fileName: file.name } : await compressImage(file);
        return await uploadFile.mutateAsync({
          file: prepared.blob,
          fileName: prepared.fileName,
          ...target,
          onProgress: setProgress,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir el archivo");
        return null;
      } finally {
        setProgress(null);
      }
    },
    [uploadFile],
  );

  return { upload, progress, error, isUploading: progress !== null, clearError: () => setError(null) };
}
