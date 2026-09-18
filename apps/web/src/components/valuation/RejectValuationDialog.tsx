// ============================================================
// RejectValuationDialog.tsx — La persona no aceptó el tratamiento
//
// El motivo es opcional, pero es lo que después explica la tasa de conversión
// (precio, tiempo, se fue con otra clínica…).
// ============================================================
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/FormDialog";
import { useRejectValuation } from "@/api/valuations.api";
import { useToastStore } from "@/stores/toast.store";
import type { Valuation } from "@/types/valuation";

export function RejectValuationDialog({ valuation, onClose }: { valuation: Valuation; onClose: () => void }) {
  const reject = useRejectValuation();
  const [motivo, setMotivo] = useState("");

  const handleReject = async () => {
    try {
      await reject.mutateAsync({ id: valuation.id, motivo: motivo.trim() || undefined });
      useToastStore.success("Valoración marcada como rechazada");
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${valuation.nombre} no aceptó`}
      description="La valoración queda como Rechazó y cuenta en el embudo del mes."
      dirty={motivo.length > 0}
      actions={
        <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>
          {reject.isPending ? "Guardando..." : "Marcar como rechazada"}
        </Button>
      }
    >
      <div className="space-y-2 pt-1">
        <Label htmlFor="motivo-rechazo">Motivo (opcional)</Label>
        <Textarea
          id="motivo-rechazo"
          rows={3}
          maxLength={500}
          placeholder="Precio, tiempo, lo va a pensar…"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>
    </FormDialog>
  );
}
