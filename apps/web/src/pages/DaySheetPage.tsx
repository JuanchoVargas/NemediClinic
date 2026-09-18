// ============================================================
// DaySheetPage.tsx — Hoja del día
//
// Lista cronológica de citas de un día específico.
// Vista pensada para uso operativo (recepción / esteticista),
// imprimible.
// Pensada para tablet: dos columnas entre 768 y 1279 px y controles de 44 px para el dedo.
// ============================================================

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDaySheet } from "@/api/appointments.api";
import {
  APPOINTMENT_LABELS,
  type AppointmentDto,
  type AppointmentStatus,
} from "@/types/appointment";

import { toLocalDate, addDaysToLocalDate } from "@/lib/dates";

const todayISO = () => toLocalDate(new Date());
const addDays = addDaysToLocalDate;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationMinutes(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / 60000);
}

function statusBadge(estado: string) {
  const label = APPOINTMENT_LABELS[estado as AppointmentStatus] ?? estado;
  switch (estado) {
    case "Agendada":
      return <Badge variant="info">{label}</Badge>;
    case "Confirmada":
      return <Badge variant="success">{label}</Badge>;
    case "EnCurso":
      return <Badge variant="warning">{label}</Badge>;
    case "Completada":
      return <Badge variant="secondary">{label}</Badge>;
    case "Cancelada":
      return <Badge variant="destructive">{label}</Badge>;
    case "NoConfirmo":
      return (
        <Badge variant="warning">
          {label}
        </Badge>
      );
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

export function DaySheetPage() {
  const [date, setDate] = useState(todayISO());
  const { data, isLoading } = useDaySheet(date);

  const fullDate = new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Hoja del día</h1>
          <p className="text-muted-foreground first-letter:uppercase">{fullDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="max-lg:size-11"
            aria-label="Día anterior"
            onClick={() => setDate(addDays(date, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Fecha"
            className="w-44 max-lg:h-11"
          />
          <Button
            variant="outline"
            size="sm"
            className="max-lg:size-11"
            aria-label="Día siguiente"
            onClick={() => setDate(addDays(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="max-lg:h-11 max-lg:px-4" onClick={() => setDate(todayISO())}>
            Hoy
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              illustration="calendar"
              title="No hay citas agendadas para este día"
              description="Usa las flechas para revisar otro día o agenda desde el calendario."
            />
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          {data.map((a) => (
            <AppointmentRow key={a.id} a={a} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function AppointmentRow({ a }: { a: AppointmentDto }) {
  const dur = durationMinutes(a.fechaInicio, a.fechaFin);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex flex-wrap items-center gap-x-2 text-base">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="whitespace-nowrap">{formatTime(a.fechaInicio)} – {formatTime(a.fechaFin)}</span>
            <span className="whitespace-nowrap text-sm font-normal text-muted-foreground">
              ({dur} min)
            </span>
          </CardTitle>
          {statusBadge(a.estado)}
        </div>
        <CardDescription>
          {a.patientNombre} · {a.procedureNombre}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="text-muted-foreground">
          Esteticista: <span className="text-foreground">{a.esteticistNombre}</span>
        </p>
        {a.notas && (
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap italic">
            "{a.notas}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}
