// ============================================================
// appointment.ts — Tipos del dominio Citas
//
// Backend: AppointmentsController.cs + DTOs/Appointments/*.cs
// ASP.NET serializa el enum AppointmentStatus como string.
// ============================================================

export const AppointmentStatus = {
  Agendada: "Agendada",
  Confirmada: "Confirmada",
  EnCurso: "EnCurso",
  Completada: "Completada",
  Cancelada: "Cancelada",
  NoConfirmo: "NoConfirmo",
} as const;

export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

/**
 * Color por estado para FullCalendar + badges.
 * Mantener sincronizado con el spec visual de Nemedi.
 */
export const APPOINTMENT_COLORS: Record<AppointmentStatus, string> = {
  Agendada: "#3B82F6", // azul
  Confirmada: "#10B981", // verde
  EnCurso: "#F59E0B", // amarillo
  Completada: "#6B7280", // gris
  Cancelada: "#EF4444", // rojo
  NoConfirmo: "#F97316", // naranja
};

/**
 * Etiqueta humana del estado para mostrar en UI.
 */
export const APPOINTMENT_LABELS: Record<AppointmentStatus, string> = {
  Agendada: "Agendada",
  Confirmada: "Confirmada",
  EnCurso: "En curso",
  Completada: "Completada",
  Cancelada: "Cancelada",
  NoConfirmo: "No confirmó",
};

export interface AppointmentDto {
  id: string;
  patientId: string;
  patientNombre: string;
  esteticistId: string;
  esteticistNombre: string;
  procedureId: string;
  procedureNombre: string;
  patientPackageSessionId?: string | null;
  branchId: string;
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  estado: string; // AppointmentStatus serializado
  notas?: string | null;
  whatsAppReminderSent: boolean;
  whatsAppConfirmedAt?: string | null;
}

export interface CreateAppointmentRequest {
  patientId: string;
  esteticistId: string;
  procedureId: string;
  branchId: string;
  fechaInicio: string; // ISO
  patientPackageSessionId?: string | null;
  notas?: string;
}

export interface UpdateAppointmentStatusRequest {
  estado: AppointmentStatus;
  notas?: string;
}

/**
 * Forma compatible con FullCalendar (event-object).
 * El frontend lo arma a partir de AppointmentDto.
 */
export interface CalendarEventDto {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: Record<string, unknown>;
}

export function appointmentToCalendarEvent(a: AppointmentDto): CalendarEventDto {
  const estado = a.estado as AppointmentStatus;
  const color = APPOINTMENT_COLORS[estado] ?? "#6B7280";
  return {
    id: a.id,
    title: `${a.patientNombre} · ${a.procedureNombre}`,
    start: a.fechaInicio,
    end: a.fechaFin,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      estado: a.estado,
      esteticistNombre: a.esteticistNombre,
      patientId: a.patientId,
      notas: a.notas,
      raw: a,
    },
  };
}
