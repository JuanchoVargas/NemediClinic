// ============================================================
// dates.ts — Formateadores de fecha en HORA LOCAL (Bogotá)
//
// Regla del sistema: no se convierte a UTC en ninguna capa.
// El backend guarda y devuelve DateTime sin zona (sin sufijo "Z"),
// así que el frontend NUNCA debe usar toISOString() para fechas
// de negocio (citas, entradas de inventario, filtros de rango).
//
// EQUIVALENTE A: helpers de dayjs sin plugin utc en SINERGIA.
// ============================================================

const pad = (n: number) => String(n).padStart(2, "0");

/** "yyyy-MM-dd'T'HH:mm:ss" en hora local, sin sufijo Z. Para enviar al API. */
export function toLocalIso(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** "yyyy-MM-dd" en hora local. Para inputs type="date" y filtros por día. */
export function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "yyyy-MM-dd'T'HH:mm" en hora local. Para inputs type="datetime-local". */
export function toLocalDateTimeInput(date: Date): string {
  return `${toLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Suma días a una fecha "yyyy-MM-dd" y devuelve "yyyy-MM-dd" (local). */
export function addDaysToLocalDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}
