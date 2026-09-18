// ============================================================
// PaymentProgress.tsx — Barra de "cuánto del paquete está pago"
//
// El porcentaje y el estado llegan calculados del backend (porcentajePagado,
// estadoPago): aquí solo se pintan. Pagado = verde con badge, Parcial = ámbar,
// SinPagos = gris. La barra entra animada con scaleX (un transform: se apaga
// sola con prefers-reduced-motion vía <MotionConfig>).
// ============================================================
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MotionDiv, EASE } from "@/components/shared/motion-elements";
import { formatCOP } from "@/lib/format-cop";
import { cn } from "@/lib/utils";
import type { PatientPackage, PaymentState } from "@/types/patient-package";

const BAR: Record<PaymentState, string> = {
  Pagado: "bg-success",
  Parcial: "bg-sand",
  SinPagos: "bg-muted-foreground/30",
};

export function PaymentProgress({ pkg }: { pkg: Pick<PatientPackage, "precioAcordado" | "totalPagado" | "porcentajePagado" | "estadoPago"> }) {
  const percent = Math.min(100, Math.max(0, pkg.porcentajePagado));

  return (
    <div className="space-y-1.5">
      <div
        role="progressbar"
        aria-label="Porcentaje pagado del paquete"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <MotionDiv
          className={cn("h-full origin-left rounded-full", BAR[pkg.estadoPago] ?? BAR.SinPagos)}
          style={{ width: `${percent}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className={cn(pkg.estadoPago === "SinPagos" && "text-muted-foreground")}>
          <span className="font-medium">{formatCOP(pkg.totalPagado)}</span> de {formatCOP(pkg.precioAcordado)} · {percent}%
        </p>
        {pkg.estadoPago === "Pagado" && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Pagado
          </Badge>
        )}
        {pkg.estadoPago === "SinPagos" && <Badge variant="outline">Sin pagos</Badge>}
      </div>
    </div>
  );
}
