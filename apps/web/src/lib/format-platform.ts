// ============================================================
// format-platform.ts — Formato de cifras del nivel de plataforma
// ============================================================

/** 0.5 → "50 %", 0.125 → "12,5 %". */
export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;
}

/** 150000 → "$ 150.000". */
export function formatCop(amount: number): string {
  return `$ ${amount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

/** "2026-09-18T10:30:00" → "18/09/2026" (hora local, sin conversión UTC). */
export function formatShortDate(localIso: string | null | undefined): string {
  if (!localIso) return "—";
  const [year, month, day] = localIso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
