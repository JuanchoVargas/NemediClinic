// ============================================================
// LoteBadge.tsx — Semáforo de vencimiento de un lote
//
// Hermano de SemaforoBadge (stock): el backend calcula el estado y aquí
// solo se pinta, siempre con la misma etiqueta y el mismo color en toda
// la app — Vigente, Por vencer, Crítico, Vencido.
// ============================================================
import { Badge } from "@/components/ui/badge";
import { LOT_STATUS_COLORS, LOT_STATUS_LABELS, type LotStatus } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface LoteBadgeProps {
  estado: LotStatus;
  /** Días que faltan; negativo si ya venció. Se muestra como apoyo cuando aporta. */
  diasParaVencer?: number | null;
  className?: string;
}

export function LoteBadge({ estado, diasParaVencer, className }: LoteBadgeProps) {
  const detalle =
    diasParaVencer == null || estado === "Vigente"
      ? null
      : diasParaVencer < 0
        ? `hace ${Math.abs(diasParaVencer)} d`
        : `en ${diasParaVencer} d`;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge variant={LOT_STATUS_COLORS[estado] ?? "outline"}>{LOT_STATUS_LABELS[estado] ?? estado}</Badge>
      {detalle && <span className="text-xs text-muted-foreground">{detalle}</span>}
    </span>
  );
}
