// ============================================================
// format-cop.ts — Pesos colombianos para la UI de clínica
//
//   formatCOP(520000)  → "$520.000"   (separador de miles, sin decimales)
// ============================================================
export function formatCOP(amount: number | null | undefined): string {
  return `$${(amount ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}
