// ============================================================
// DashboardPage.tsx — Resumen del día de la clínica
//
// KPIs con contador animado, avance del día y la agenda de hoy. Los datos
// salen de use-dashboard.ts (endpoints existentes; aún no hay /dashboard).
// Cada tarjeta lleva a la pantalla donde se actúa sobre ese número.
// ============================================================

import { Link, type LinkProps } from "@tanstack/react-router";
import { CalendarCheck, CalendarDays, CalendarPlus, PackageSearch, UsersRound, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { CountUp } from "@/components/shared/motion";
import { MotionDiv, MotionLi, staggerProps } from "@/components/shared/motion-elements";
import { useDashboard } from "@/hooks/use-dashboard";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth.store";
import { APPOINTMENT_LABELS, type AppointmentStatus } from "@/types/appointment";

interface Kpi {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  to: NonNullable<LinkProps["to"]>;
  /** El acento arena marca un número que pide atención (alertas de stock). */
  attention?: boolean;
}

const STATUS_BADGE: Record<AppointmentStatus, "default" | "success" | "secondary" | "warning" | "destructive" | "outline"> = {
  Agendada: "outline",
  Confirmada: "success",
  EnCurso: "warning",
  Completada: "secondary",
  Cancelada: "destructive",
  NoConfirmo: "warning",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const { today, completedToday, dayProgress, weekCount, patientCount, stockAlerts, isLoading, ownAgenda } =
    useDashboard();

  const firstName = (user?.name ?? "").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  const kpis: Kpi[] = [
    { label: ownAgenda ? "Mis citas de hoy" : "Citas de hoy", value: today.length, hint: `${completedToday} completadas`, icon: CalendarCheck, to: "/calendar/day-sheet" },
    { label: ownAgenda ? "Mis citas de la semana" : "Citas de la semana", value: weekCount, hint: "Lunes a domingo", icon: CalendarDays, to: "/calendar" },
    { label: "Pacientes", value: patientCount, hint: "Registrados en la clínica", icon: UsersRound, to: "/patients" },
    { label: "Productos en alerta", value: stockAlerts, hint: stockAlerts === 0 ? "Inventario al día" : "Bajo el stock mínimo", icon: PackageSearch, to: "/inventory", attention: stockAlerts > 0 },
  ];

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
        {can("appointments.create") && (
          <Button asChild>
            <Link to="/calendar">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Agendar cita
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, to, attention }, i) => (
          <MotionDiv key={label} {...staggerProps(i)}>
            <Link to={to} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="card-lift h-full">
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
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <CountUp value={value} className="font-heading text-3xl font-bold" />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </CardContent>
              </Card>
            </Link>
          </MotionDiv>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{ownAgenda ? "Mi agenda de hoy" : "Agenda de hoy"}</CardTitle>
            <CardDescription>
              {today.length === 0 ? "Sin citas programadas" : `${completedToday} de ${today.length} citas completadas`}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/calendar/day-sheet">Hoja del día</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {today.length > 0 && <Progress value={dayProgress} className="h-2" aria-label="Avance del día" />}

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
                  <span className="w-14 shrink-0 font-heading text-base font-semibold tabular-nums">
                    {a.fechaInicio.slice(11, 16)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/patients/$id"
                      params={{ id: a.patientId }}
                      className="truncate font-medium hover:text-primary hover:underline"
                    >
                      {a.patientNombre}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.procedureNombre}
                      {!ownAgenda && ` · ${a.esteticistNombre}`}
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
    </PageContainer>
  );
}
