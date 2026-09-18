// ============================================================
// DashboardPage.tsx — Resumen de la clínica
//
// Una sola llamada (GET /api/v1/dashboard): KPIs con sparkline, citas por día,
// top de procedimientos, agenda de hoy y alertas con enlace a donde se resuelven.
// La esteticista ve su agenda y no recibe datos financieros; el SuperAdmin
// puede filtrar las citas por sede.
// ============================================================

import { useState } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import {
  AlarmClock,
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  PackageSearch,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentsAreaChart, Sparkline, TopProceduresChart } from "@/components/dashboard/DashboardCharts";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { CountUp } from "@/components/shared/motion";
import { MotionDiv, MotionLi, staggerProps } from "@/components/shared/motion-elements";
import { useBranches } from "@/api/branches.api";
import { useDashboard } from "@/api/dashboard.api";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCop } from "@/lib/format-platform";
import { useAuthStore } from "@/stores/auth.store";
import { APPOINTMENT_LABELS, type AppointmentStatus } from "@/types/appointment";
import type { SerieDia } from "@/types/dashboard";

interface Kpi {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  to: NonNullable<LinkProps["to"]>;
  format?: (n: number) => string;
  spark?: SerieDia[];
  /** El acento arena marca un número que pide atención. */
  attention?: boolean;
}

const STATUS_BADGE: Record<AppointmentStatus, "success" | "secondary" | "warning" | "destructive" | "outline"> = {
  Agendada: "outline",
  Confirmada: "success",
  EnCurso: "warning",
  Completada: "secondary",
  Cancelada: "destructive",
  NoConfirmo: "warning",
};

const ALL_BRANCHES = "all";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { can, role } = usePermissions();
  const isSuperAdmin = role === "SuperAdmin";

  const [branch, setBranch] = useState(ALL_BRANCHES);
  const { data: branches } = useBranches(100, isSuperAdmin);
  const { data, isLoading } = useDashboard(branch === ALL_BRANCHES ? undefined : branch);

  const firstName = (user?.name ?? "").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  const today = data?.agendaHoy ?? [];
  const completedToday = today.filter((a) => a.estado === "Completada").length;
  const activeToday = today.filter((a) => a.estado !== "Cancelada").length;
  const dayProgress = activeToday === 0 ? 0 : Math.round((completedToday / activeToday) * 100);
  const own = data?.agendaPropia ?? false;
  const showFinance = data?.ingresosMes != null;

  const kpis: Kpi[] = [
    {
      label: own ? "Mis citas de hoy" : "Citas de hoy",
      value: data?.citasHoyTotal ?? 0,
      hint: `${completedToday} completadas`,
      icon: CalendarCheck,
      to: "/calendar/day-sheet",
      spark: data?.citasPorDia.map((d) => ({ fecha: d.fecha, valor: d.total })),
    },
    showFinance
      ? {
          label: "Ingresos del mes",
          value: data?.ingresosMes ?? 0,
          hint: `Saldo por cobrar ${formatCop(data?.saldoPendiente ?? 0)}`,
          icon: Wallet,
          to: "/patients",
          format: formatCop,
          spark: data?.ingresosPorDia ?? undefined,
        }
      : {
          label: "Citas de los últimos 14 días",
          value: data?.citasPorDia.reduce((sum, d) => sum + d.total, 0) ?? 0,
          hint: "Sin contar canceladas",
          icon: CalendarCheck,
          to: "/calendar",
        },
    {
      label: "Pacientes activos",
      value: data?.pacientesActivos ?? 0,
      hint: `${data?.pacientesNuevosPorDia.reduce((sum, d) => sum + d.valor, 0) ?? 0} nuevos en 14 días`,
      icon: UsersRound,
      to: "/patients",
      spark: data?.pacientesNuevosPorDia,
    },
    {
      label: "Productos en alerta",
      value: data?.stockEnAlerta.length ?? 0,
      hint: data?.stockEnAlerta.length ? "Bajo el stock mínimo" : "Inventario al día",
      icon: PackageSearch,
      to: "/inventory",
      attention: (data?.stockEnAlerta.length ?? 0) > 0,
    },
  ];

  const expiring = data?.paquetesPorVencer ?? [];
  const stock = data?.stockEnAlerta ?? [];
  const hasAlerts = expiring.length > 0 || stock.length > 0;

  return (
    <PageContainer>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {greeting()}
            {firstName && `, ${firstName}`}
          </h1>
          <p className="text-muted-foreground first-letter:uppercase">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de sede: afecta las citas (lo único con sede). Solo SuperAdmin. */}
          {isSuperAdmin && branches && branches.length > 1 && (
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-48 bg-card" aria-label="Sede">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>Todas las sedes</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {can("appointments.create") && (
            <Button asChild>
              <Link to="/calendar">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Agendar cita
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, to, format, spark, attention }, i) => (
          <MotionDiv key={label} {...staggerProps(i)}>
            <Link to={to} className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="card-lift h-full gap-2 pb-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <span
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      attention ? "bg-sand-soft text-sand-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </CardHeader>
                <CardContent className="pb-1">
                  {isLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    <CountUp value={value} format={format} className="font-heading text-3xl font-bold" />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </CardContent>
                <div className="mt-auto h-10" aria-hidden>
                  {spark && spark.length > 1 && (
                    <Sparkline data={spark} color={attention ? "var(--sand)" : "var(--primary)"} />
                  )}
                </div>
              </Card>
            </Link>
          </MotionDiv>
        ))}
      </div>

      {/* ── Gráficas ─────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{own ? "Mis citas por día" : "Citas por día"}</CardTitle>
            <CardDescription>Últimos 14 días · agendadas frente a completadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? <Skeleton className="h-[260px] w-full" /> : <AppointmentsAreaChart data={data.citasPorDia} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Procedimientos del mes</CardTitle>
            <CardDescription>Los 5 más agendados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-[220px] w-full" />
            ) : data.topProcedimientos.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Aún no hay citas este mes.</p>
            ) : (
              <TopProceduresChart data={data.topProcedimientos} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {/* ── Agenda de hoy ────────────────────────────── */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{own ? "Mi agenda de hoy" : "Agenda de hoy"}</CardTitle>
              <CardDescription>
                {activeToday === 0 ? "Sin citas programadas" : `${completedToday} de ${activeToday} citas completadas`}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/calendar/day-sheet">Hoja del día</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeToday > 0 && <Progress value={dayProgress} className="h-2" aria-label="Avance del día" />}
            {isLoading && <Skeleton className="h-32 w-full" />}

            {!isLoading && today.length === 0 && (
              <EmptyState
                illustration="calendar"
                title="No hay citas para hoy"
                description="Cuando agendes citas para hoy aparecerán aquí, en orden, con su estado."
                action={
                  can("appointments.create") && (
                    <Button asChild>
                      <Link to="/calendar">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Agendar cita
                      </Link>
                    </Button>
                  )
                }
              />
            )}

            {today.length > 0 && (
              <ul className="divide-y">
                {today.map((a, i) => (
                  <MotionLi key={a.id} className="flex items-center gap-4 py-3" {...staggerProps(i)}>
                    <span className="w-14 shrink-0 font-heading text-base font-semibold">{a.fechaInicio.slice(11, 16)}</span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/patients/$id"
                        params={{ id: a.patientId }}
                        className="truncate font-medium hover:text-primary hover:underline"
                      >
                        {a.paciente}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.procedimiento}
                        {!own && ` · ${a.esteticista}`}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[a.estado as AppointmentStatus] ?? "outline"}>
                      {APPOINTMENT_LABELS[a.estado as AppointmentStatus] ?? a.estado}
                    </Badge>
                  </MotionLi>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Alertas ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>Lo que conviene resolver pronto</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-32 w-full" />}
            {!isLoading && !hasAlerts && (
              <p className="py-8 text-center text-sm text-muted-foreground">Todo en orden: sin alertas pendientes.</p>
            )}
            <ul className="divide-y" aria-label="Alertas">
              {expiring.map((p) => (
                <li key={p.patientPackageId}>
                  <Link
                    to="/patients/$id"
                    params={{ id: p.patientId }}
                    className="group flex items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sand-soft text-sand-foreground">
                      <AlarmClock className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium group-hover:text-primary">
                        {p.paquete} · {p.paciente}
                      </span>
                      <span className="text-muted-foreground">
                        {p.diasRestantes === 0 ? "Vence hoy" : `Vence en ${p.diasRestantes} días`} · {p.sesionesCompletadas}/
                        {p.sesionesTotales} sesiones
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {stock.map((s) => (
                <li key={s.productId}>
                  <Link
                    to="/inventory"
                    className="group flex items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        s.semaforo === "Rojo" ? "bg-destructive/10 text-destructive" : "bg-sand-soft text-sand-foreground"
                      }`}
                    >
                      <PackageSearch className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium group-hover:text-primary">{s.nombre}</span>
                      <span className="text-muted-foreground">
                        Quedan {s.stockActual} {s.unidadMedida} · mínimo {s.stockMinimo}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
