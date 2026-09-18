// ============================================================
// DashboardCharts.tsx — Gráficas del Dashboard (Recharts)
//
//   Sparkline              mini área sin ejes, dentro de una tarjeta de KPI
//   AppointmentsAreaChart  citas por día (total vs completadas), últimos 14 días
//   MoneyChart             mismo rango: área de lo cobrado por día + línea del saldo pendiente acumulado
//   TopProceduresChart     barras horizontales: top 5 procedimientos del mes
//   TopProductsList        top 5 productos por unidades movidas, con su semáforo actual
//
// Los números llegan calculados del backend; aquí solo se dibujan.
//
// Los colores son los tokens (var(--primary), var(--sand)…): siguen el tema
// claro/oscuro y la marca del canal. Recharts pinta SVG, así que acepta var().
// ============================================================
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SemaforoBadge } from "@/components/shared/SemaforoBadge";
import { MotionLi, staggerProps } from "@/components/shared/motion-elements";
import { formatCOP } from "@/lib/format-cop";
import type { StockStatus } from "@/types/inventory";
import type { CitasDia, IngresoDia, ProductoMovido, SerieDia } from "@/types/dashboard";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "var(--shadow-2)",
};

/** "2026-09-18" → "18 sept" (sin pasar por Date: no hay conversión de zona horaria). */
function shortDay(fecha: string): string {
  const [, month, day] = fecha.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  return `${Number(day)} ${months[Number(month) - 1]}`;
}

export function Sparkline({ data, color = "var(--primary)" }: { data: SerieDia[]; color?: string }) {
  const gradientId = useId();
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="valor"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AppointmentsAreaChart({ data }: { data: CitasDia[] }) {
  const totalId = useId();
  const doneId = useId();
  const rows = data.map((d) => ({ ...d, dia: shortDay(d.fecha) }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={totalId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={doneId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="dia" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "var(--border)" }} />
        <Area type="monotone" dataKey="total" name="Citas" stroke="var(--primary)" strokeWidth={2} fill={`url(#${totalId})`} />
        <Area type="monotone" dataKey="completadas" name="Completadas" stroke="var(--success)" strokeWidth={2} fill={`url(#${doneId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** 1250000 → "$1,3 M" · 320000 → "$320 k": el eje no tiene espacio para la cifra completa. */
function compactCOP(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000).toLocaleString("es-CO")} k`;
  return `$${value}`;
}

/**
 * Dinero de los últimos 14 días. Dos ejes porque son dos escalas: lo cobrado en un día (izquierda,
 * área) y el saldo pendiente acumulado de toda la cartera (derecha, línea).
 */
export function MoneyChart({ data }: { data: IngresoDia[] }) {
  const paidId = useId();
  const rows = data.map((d) => ({ ...d, dia: shortDay(d.fecha) }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={paidId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="dia" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis yAxisId="cobrado" tick={{ ...AXIS, fill: "var(--success)" }} tickLine={false} axisLine={false} width={56} tickFormatter={compactCOP} />
        <YAxis yAxisId="saldo" orientation="right" tick={{ ...AXIS, fill: "var(--sand)" }} tickLine={false} axisLine={false} width={56} tickFormatter={compactCOP} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: "var(--border)" }}
          formatter={(value) => formatCOP(Number(value))}
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        <Area yAxisId="cobrado" type="monotone" dataKey="cobrado" name="Cobrado en el día" stroke="var(--success)" strokeWidth={2} fill={`url(#${paidId})`} />
        <Line yAxisId="saldo" type="monotone" dataKey="saldoAcumulado" name="Saldo pendiente acumulado" stroke="var(--sand)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Top 5 productos por unidades movidas. La barra es relativa al primero de la lista (solo dibujo). */
export function TopProductsList({ data }: { data: ProductoMovido[] }) {
  const max = Math.max(...data.map((p) => p.unidades), 1);
  return (
    <ol className="space-y-4" aria-label="Productos con más unidades movidas en el mes">
      {data.map((p, i) => (
          <MotionLi key={p.productId} {...staggerProps(i)} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm leading-tight">
              <span className="min-w-0 truncate font-medium">{p.nombre}</span>
              <SemaforoBadge estado={p.semaforo as StockStatus} className="shrink-0" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (p.unidades / max) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {p.unidades.toLocaleString("es-CO")} {p.unidadMedida} movidas · {p.entradas.toLocaleString("es-CO")} entraron, {p.salidas.toLocaleString("es-CO")} salieron · quedan {p.stockActual.toLocaleString("es-CO")}
            </p>
          </MotionLi>
      ))}
    </ol>
  );
}

export function TopProceduresChart({ data }: { data: { nombre: string; cantidad: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="nombre"
          width={150}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="cantidad" name="Citas" fill="var(--primary)" radius={[0, 6, 6, 0]} label={{ position: "right", ...AXIS }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
