// ============================================================
// ComprobanteCell.tsx — Celda "Comprobante" de la tabla de pagos
//
//   · con comprobante imagen → miniatura; clic abre el lightbox
//   · con comprobante PDF    → icono; clic abre el PDF en otra pestaña (URL firmada)
//   · sin comprobante        → botón "Adjuntar": elige el archivo y lo sube desde
//                              la fila, sin abrir ningún diálogo (POST /files con el
//                              id del pago → PUT …/payments/{id}/comprobante)
//
// Solo quien puede registrar pagos (Admin+) ve "Adjuntar"; el resto ve "—".
// ============================================================
import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureImage } from "@/components/shared/SecureImage";
import { SignedLightbox } from "@/components/shared/SignedLightbox";
import { useSetPaymentComprobante } from "@/api/patient-packages.api";
import { useImageUploader } from "@/hooks/use-image-uploader";
import { DOCUMENT_ACCEPT, PDF_TYPE } from "@/lib/compress-image";
import { formatCOP } from "@/lib/format-cop";
import { openSignedFile } from "@/lib/open-signed-file";
import { useToastStore } from "@/stores/toast.store";
import type { PatientPayment } from "@/types/patient-package";

interface ComprobanteCellProps {
  packageId: string;
  payment: PatientPayment;
  canAttach: boolean;
}

export function ComprobanteCell({ packageId, payment, canAttach }: ComprobanteCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState(false);
  const { upload, progress, error, isUploading } = useImageUploader();
  const setComprobante = useSetPaymentComprobante(packageId);
  const label = `pago de ${formatCOP(payment.monto)}`;

  if (payment.comprobanteId) {
    if (payment.comprobanteContentType === PDF_TYPE) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          aria-label={`Abrir el comprobante en PDF del ${label}`}
          onClick={() => void openSignedFile(payment.comprobanteId!)}
        >
          <FileText className="h-4 w-4 text-destructive" aria-hidden />
          PDF
        </Button>
      );
    }
    return (
      <>
        <button
          type="button"
          aria-label={`Ver el comprobante del ${label}`}
          onClick={() => setLightbox(true)}
          className="block overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <SecureImage id={payment.comprobanteId} alt="" className="h-10 w-10 cursor-zoom-in" />
        </button>
        {lightbox && (
          <SignedLightbox
            items={[{ id: payment.comprobanteId, alt: `Comprobante del ${label}` }]}
            onClose={() => setLightbox(false)}
          />
        )}
      </>
    );
  }

  if (!canAttach) return <span className="text-muted-foreground">—</span>;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const attachment = await upload(file, { entityType: "Payment", kind: "Comprobante", entityId: payment.id }, { allowPdf: true });
    if (!attachment) return; // el error queda junto al botón
    await setComprobante.mutateAsync({ paymentId: payment.id, comprobanteId: attachment.id });
    useToastStore.success("Comprobante adjuntado");
  };

  const busy = isUploading || setComprobante.isPending;

  return (
    <div className="flex flex-col items-start gap-1 max-md:items-end">
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid={`comprobante-input-${payment.id}`}
        onChange={(e) => {
          // el toast global reporta el fallo del PUT; el de la subida se pinta abajo
          handleFile(e.target.files?.[0]).catch(() => undefined);
          e.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        disabled={busy}
        aria-label={`Adjuntar comprobante al ${label}`}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Paperclip className="h-4 w-4" aria-hidden />}
        {busy ? `${progress ?? 100}%` : "Adjuntar"}
      </Button>
      {error && <p role="alert" className="max-w-44 text-xs text-destructive">{error}</p>}
    </div>
  );
}
