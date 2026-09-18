// ============================================================
// use-dashboard.ts — Datos del Dashboard a partir de endpoints existentes
//
// Aún no existe GET /api/v1/dashboard. Mientras tanto los KPI se arman con los
// mismos hooks de las pantallas (la cache de TanStack Query los comparte):
//   · citas de hoy y de la semana  → useAppointments
//   · total de pacientes           → usePatients (totalCount de una página mínima)
//   · productos en alerta de stock → useStockAlerts
// Todos son endpoints que cualquier rol de clínica puede leer.
// ============================================================
import { useMemo, useState } from "react";
import { useAppointments } from "@/api/appointments.api";
import { useStockAlerts } from "@/api/inventory.api";
import { usePatients } from "@/api/patients.api";
import { toLocalIso } from "@/lib/dates";
import { usePermissions } from "@/hooks/use-permissions";

function weekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Semana de lunes a domingo
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    weekStart: toLocalIso(monday),
    weekEnd: toLocalIso(nextMonday),
    todayStart: toLocalIso(today),
    todayEnd: toLocalIso(tomorrow),
  };
}

const ACTIVE = new Set(["Agendada", "Confirmada", "EnCurso", "NoConfirmo"]);

export function useDashboard() {
  const [range] = useState(weekRange);
  const { role, userId } = usePermissions();
  // La esteticista ve SU agenda; el resto, la de toda la clínica
  const esteticistId = role === "Esteticista" ? (userId ?? undefined) : undefined;

  const appointments = useAppointments(range.weekStart, range.weekEnd, esteticistId);
  const patients = usePatients(1, 1);
  const alerts = useStockAlerts();

  const derived = useMemo(() => {
    const week = (appointments.data ?? []).filter((a) => a.estado !== "Cancelada");
    const today = week
      .filter((a) => a.fechaInicio >= range.todayStart && a.fechaInicio < range.todayEnd)
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    const completedToday = today.filter((a) => a.estado === "Completada").length;
    return {
      today,
      pendingToday: today.filter((a) => ACTIVE.has(a.estado)),
      completedToday,
      weekCount: week.length,
      // Avance del día: citas completadas sobre el total de hoy
      dayProgress: today.length === 0 ? 0 : Math.round((completedToday / today.length) * 100),
    };
  }, [appointments.data, range.todayStart, range.todayEnd]);

  return {
    ...derived,
    patientCount: patients.data?.totalCount ?? 0,
    stockAlerts: alerts.data?.length ?? 0,
    isLoading: appointments.isLoading || patients.isLoading || alerts.isLoading,
    ownAgenda: !!esteticistId,
  };
}
