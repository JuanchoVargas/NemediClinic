// ============================================================
// ImageUpload.tsx — Subir UNA imagen (perfil, producto, procedimiento)
//
// Arrastrar o clic, vista previa inmediata, compresión en el navegador,
// barra de progreso y error legible. `value` es el id del Attachment:
// el formulario solo guarda ese id (ImagenId) y lo envía al guardar.
//
// EQUIVALENTE A: un <FileInput v-model="imagenId"> de SINERGIA
// ============================================================
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SecureImage } from "@/components/shared/SecureImage";
import { useDeleteFile } from "@/api/files.api";
import { useImageUploader } from "@/hooks/use-image-uploader";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/compress-image";
import { cn } from "@/lib/utils";
import type { AttachmentEntityType, AttachmentKind } from "@/types/file";

interface ImageUploadProps {
  entityType: AttachmentEntityType;
  kind: AttachmentKind;
  /** Id de la entidad si ya existe; si no, el adjunto queda pendiente hasta guardar el formulario. */
  entityId?: string;
  value: string | null | undefined;
  onChange: (attachmentId: string | null) => void;
  shape?: "square" | "circle" | "wide";
  label?: string;
  disabled?: boolean;
}

const SHAPES = {
  square: "h-32 w-32 rounded-xl",
  circle: "h-28 w-28 rounded-full",
  wide: "aspect-video w-full rounded-xl",
};

export function ImageUpload({
  entityType,
  kind,
  entityId,
  value,
  onChange,
  shape = "square",
  label = "Imagen",
  disabled,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, error, isUploading } = useImageUploader();
  const deleteFile = useDeleteFile();
  const [dragging, setDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // La vista previa local es un object URL: se libera al reemplazarla o desmontar
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setLocalPreview(URL.createObjectURL(file));
    const attachment = await upload(file, { entityType, kind, entityId });
    if (attachment) onChange(attachment.id);
    setLocalPreview(null);
  };

  // Quitar borra el adjunto en el servidor (DELETE /files también limpia ImagenId de la entidad):
  // en los PUT del backend un ImagenId nulo significa "no cambiar", no "quitar".
  const handleRemove = async () => {
    if (!value) return;
    try {
      await deleteFile.mutateAsync(value);
      onChange(null);
    } catch {
      // toast global
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  };

  const hasImage = !!value || !!localPreview;

  return (
    <div className="space-y-2">
      <div className={cn("flex gap-4", shape === "wide" ? "flex-col" : "items-center")}>
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-dashed border-input bg-muted/40 text-muted-foreground transition-colors",
            "hover:border-primary hover:bg-muted focus-within:ring-2 focus-within:ring-ring",
            SHAPES[shape],
            dragging && "border-primary bg-primary/5",
            hasImage && "border-solid",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {localPreview ? (
            <img src={localPreview} alt="" className="h-full w-full object-cover opacity-70" />
          ) : value ? (
            <SecureImage id={value} alt={label} className="h-full w-full" />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-xs">
              <ImagePlus className="h-6 w-6" aria-hidden />
              {shape !== "circle" && "Arrastra o haz clic"}
            </span>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            disabled={disabled || isUploading}
            aria-label={label}
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
          />
        </label>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Se optimiza antes de subir.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="mr-1.5 h-4 w-4" />
              {value ? "Cambiar" : "Subir imagen"}
            </Button>
            {value && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || deleteFile.isPending}
                onClick={() => void handleRemove()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1" role="status">
          <Progress value={progress ?? 0} className="h-1.5" />
          <p className="text-xs text-muted-foreground">Subiendo… {progress ?? 0}%</p>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
