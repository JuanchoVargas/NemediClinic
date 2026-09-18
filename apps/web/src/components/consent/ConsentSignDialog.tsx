// ============================================================
// ConsentSignDialog.tsx — Firma del consentimiento informado
//
// Pensado para que el PACIENTE lo use en una tablet o un celular: el texto
// completo para leer, un recuadro grande para firmar con el dedo o un lápiz
// (signature_pad) y dos botones. En móvil ocupa toda la pantalla.
// Al firmar, el backend genera el PDF y lo deja en la ficha.
// ============================================================
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Eraser, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsentPreview, useSignConsent } from "@/api/consents.api";
import { useToastStore } from "@/stores/toast.store";
import type { Consent } from "@/types/consent";

interface ConsentSignDialogProps {
  patientId: string;
  procedureId: string;
  /** Cita que origina la firma: el PDF queda con la esteticista de esa cita. */
  appointmentId?: string;
  onClose: () => void;
  onSigned?: (consent: Consent) => void;
}

export function ConsentSignDialog({ patientId, procedureId, appointmentId, onClose, onSigned }: ConsentSignDialogProps) {
  const { data: preview, isLoading } = useConsentPreview(patientId, procedureId);
  const sign = useSignConsent();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // El canvas se dimensiona a su tamaño real en píxeles del dispositivo: sin esto, en pantallas
  // retina el trazo sale desplazado y borroso. Se vuelve a ajustar si gira la tablet.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;

    const pad = new SignaturePad(canvas, { penColor: "#1a1f26", backgroundColor: "rgb(255,255,255)", minWidth: 1, maxWidth: 2.6 });
    padRef.current = pad;
    const onEnd = () => setHasSignature(!pad.isEmpty());
    pad.addEventListener("endStroke", onEnd);

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      pad.fromData(data);
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      pad.removeEventListener("endStroke", onEnd);
      pad.off();
      padRef.current = null;
    };
  }, [preview]);

  const clear = () => {
    padRef.current?.clear();
    setHasSignature(false);
  };

  const handleSign = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    try {
      const consent = await sign.mutateAsync({
        patientId,
        procedureId,
        appointmentId,
        firmaPng: pad.toDataURL("image/png"),
      });
      useToastStore.success("Consentimiento firmado", "El PDF quedó guardado en la ficha del paciente");
      onSigned?.(consent);
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !sign.isPending && onClose()}>
      <DialogContent
        // Pantalla completa en móvil; en tablet/escritorio, un panel ancho y cómodo para leer y firmar
        className="flex h-dvh max-h-dvh w-full max-w-full flex-col gap-0 rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="text-xl">{preview?.titulo ?? "Consentimiento informado"}</DialogTitle>
          <DialogDescription>
            {preview ? `${preview.paciente} · C.C. ${preview.cedula}` : "Cargando el documento…"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isLoading || !preview ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <article className="space-y-3 text-base leading-relaxed" aria-label="Texto del consentimiento">
              {preview.texto.split("\n").filter(Boolean).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </article>
          )}

          <section aria-label="Firma">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <PenLine className="h-4 w-4" aria-hidden />
                Firma del paciente
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasSignature}>
                <Eraser className="mr-1.5 h-4 w-4" />
                Limpiar
              </Button>
            </div>
            <canvas
              ref={canvasRef}
              aria-label="Recuadro para firmar"
              // touch-none: el dedo dibuja en vez de hacer scroll de la página
              className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-input bg-white sm:h-56"
            />
            <p className="mt-1 text-xs text-muted-foreground">Firma con el dedo o con un lápiz dentro del recuadro.</p>
          </section>
        </div>

        <DialogFooter className="m-0 flex-row gap-2 border-t px-5 py-3 sm:justify-end">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={onClose} disabled={sign.isPending}>
            Cancelar
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={handleSign} disabled={!hasSignature || sign.isPending}>
            {sign.isPending ? "Guardando..." : "Firmar y guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
