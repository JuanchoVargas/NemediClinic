// ============================================================
// DashboardCharts.tsx — Gráficas del Dashboard (Recharts)
//
//   Sparkline              mini área sin ejes, dentro de una tarjeta de KPI
//   AppointmentsAreaChart  citas por día (total vs completadas), últimos 14 días
//   TopProceduresChart     barras horizontales: top 5 procedimientos del mes
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CitasDia, SerieDia } from "@/types/dashboard";

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
