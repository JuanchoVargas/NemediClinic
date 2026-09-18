// ============================================================
// DocumentUpload.tsx — Adjuntar UN soporte (imagen o PDF) en un formulario
//
// Hermano de ImageUpload para documentos: sube el archivo como adjunto
// "pendiente" y entrega su id; el formulario lo envía al guardar
// (p. ej. comprobanteId en "Registrar pago"). Muestra el nombre del archivo,
// el progreso y el error junto al control.
// ============================================================
import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDeleteFile } from "@/api/files.api";
import { useImageUploader } from "@/hooks/use-image-uploader";
import { DOCUMENT_ACCEPT, PDF_TYPE } from "@/lib/compress-image";
import type { AttachmentEntityType, AttachmentKind } from "@/types/file";

interface DocumentUploadProps {
  entityType: AttachmentEntityType;
  kind: AttachmentKind;
  value: string | null | undefined;
  onChange: (attachmentId: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export function DocumentUpload({ entityType, kind, value, onChange, label = "Adjuntar archivo", disabled }: DocumentUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, error, isUploading } = useImageUploader();
  const deleteFile = useDeleteFile();
  const [file, setFile] = useState<{ name: string; isPdf: boolean } | null>(null);

  const handleFile = async (picked: File | undefined) => {
    if (!picked || disabled) return;
    const attachment = await upload(picked, { entityType, kind }, { allowPdf: true });
    if (!attachment) return;
    setFile({ name: picked.name, isPdf: picked.type === PDF_TYPE });
    onChange(attachment.id);
  };

  const remove = () => {
    // Pendiente y sin dueño: se borra ya (si falla, AttachmentCleanupService lo purga en 24 h)
    if (value) deleteFile.mutate(value);
    setFile(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value && file ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {file.isPdf ? <FileText className="h-4 w-4 shrink-0 text-destructive" aria-hidden /> : <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Quitar el archivo" onClick={remove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full justify-start gap-2" disabled={disabled || isUploading} onClick={() => inputRef.current?.click()}>
          <Paperclip className="h-4 w-4" aria-hidden />
          {isUploading ? "Subiendo…" : label}
        </Button>
      )}

      {isUploading && <Progress value={progress ?? 0} aria-label="Progreso de la subida" />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">PDF o imagen (JPG, PNG, WebP). Máximo 10 MB.</p>
    </div>
  );
}
