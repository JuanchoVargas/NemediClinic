// ============================================================
// PhotoListUpload.tsx — Varias fotos con una etiqueta (Antes / Después)
//
// Para la nota clínica: cada zona sube N fotos de un Kind. Las fotos se suben
// como adjuntos pendientes (sin entityId) y el formulario guarda solo sus ids;
// la nota los reclama al crearse. Quitar una foto la borra del servidor.
// ============================================================
import { useId, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SecureImage } from "@/components/shared/SecureImage";
import { useDeleteFile } from "@/api/files.api";
import { useImageUploader } from "@/hooks/use-image-uploader";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/compress-image";
import { cn } from "@/lib/utils";
import type { AttachmentKind } from "@/types/file";

interface PhotoListUploadProps {
  label: string;
  kind: Extract<AttachmentKind, "Antes" | "Despues">;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

export function PhotoListUpload({ label, kind, value, onChange, max = 6 }: PhotoListUploadProps) {
  const inputId = useId();
  const { upload, progress, error, isUploading } = useImageUploader();
  const deleteFile = useDeleteFile();
  const [dragging, setDragging] = useState(false);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    let ids = value;
    // En serie: una sola barra de progreso y el orden de las fotos se conserva
    for (const file of Array.from(files).slice(0, max - value.length)) {
      const attachment = await upload(file, { entityType: "ClinicalNote", kind });
      if (attachment) {
        ids = [...ids, attachment.id];
        onChange(ids);
      }
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteFile.mutateAsync(id);
      onChange(value.filter((x) => x !== id));
    } catch {
      // toast global
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  const full = value.length >= max;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {label} <span className="font-normal text-muted-foreground">({value.length})</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {value.map((id) => (
          <div key={id} className="group relative aspect-square overflow-hidden rounded-lg border">
            <SecureImage id={id} alt={`Foto ${label}`} className="h-full w-full" />
            <button
              type="button"
              onClick={() => void remove(id)}
              aria-label={`Quitar foto ${label}`}
              className="absolute top-1 right-1 rounded-full bg-foreground/70 p-1 text-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!full && (
          <label
            htmlFor={inputId}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-muted/40 text-center text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-muted",
              dragging && "border-primary bg-primary/5",
              isUploading && "pointer-events-none opacity-60",
            )}
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            Agregar
            <input
              id={inputId}
              type="file"
              multiple
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              aria-label={`Agregar fotos ${label}`}
              disabled={isUploading}
              onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
        )}
      </div>
      {isUploading && <Progress value={progress ?? 0} className="h-1.5" />}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
