// ============================================================
// SemaforoBadge.tsx — Semáforo de stock de un producto
//
// El backend calcula el estado (Verde / Amarillo / Rojo, ProductsController y
// DashboardService usan la MISMA regla) y aquí solo se pinta, siempre con la
// misma etiqueta y el mismo color: Óptimo, Bajo, Crítico.
// Lo usan Inventario (tabla, alertas) y el Dashboard (productos del mes).
// ============================================================
import { Badge } from "@/components/ui/badge";
import { STOCK_STATUS_COLORS, STOCK_STATUS_LABELS, type StockStatus } from "@/types/inventory";

export function SemaforoBadge({ estado, className }: { estado: StockStatus; className?: string }) {
  return (
    <Badge variant={STOCK_STATUS_COLORS[estado] ?? "outline"} className={className}>
      {STOCK_STATUS_LABELS[estado] ?? estado}
    </Badge>
  );
}
