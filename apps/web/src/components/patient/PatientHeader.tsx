// ============================================================
// PatientHeader.tsx — Cabecera de la ficha del paciente
//
// Degradado sutil, foto (o iniciales), nombre, cédula, badges de estado
// (paquete activo, próxima cita) y las tres acciones más frecuentes:
// Agendar, Registrar pago y Nueva nota. Cada acción respeta los permisos.
// ============================================================
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, CalendarClock, NotebookPen, Package, Pencil, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { usePermissions } from "@/hooks/use-permissions";
import type { Patient } from "@/types/patient";

interface PatientHeaderProps {
  patient: Patient;
  onRegisterPayment: () => void;
  onNewNote: () => void;
}

function formatNextAppointment(localIso: string): string {
  const date = new Date(localIso);
  const day = date.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function PatientHeader({ patient, onRegisterPayment, onNewNote }: PatientHeaderProps) {
  const { can } = usePermissions();
  const activePackage = patient.paquetesActivos?.[0];

  return (
    <section
      aria-label="Resumen del paciente"
      className="relative mb-6 overflow-hidden rounded-2xl border bg-card shadow-soft"
    >
      {/* Degradado sutil con el primario y el arena de la marca */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-sand/15"
      />

      <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <PatientAvatar
            nombre={patient.nombre}
            apellido={patient.apellido}
            imagenId={patient.imagenId}
            className="h-14 w-14 text-lg ring-4 ring-card sm:h-20 sm:w-20 sm:text-2xl"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words md:text-3xl">
              {patient.nombre} {patient.apellido}
            </h1>
            <p className="text-sm text-muted-foreground">
              Cédula {patient.cedula} · {patient.telefono}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!patient.isActive && <Badge variant="secondary">Inactivo</Badge>}
              {activePackage ? (
                <Badge variant="success" className="h-auto max-w-full gap-1 whitespace-normal">
                  <Package className="h-3 w-3" aria-hidden />
                  {activePackage.packageNombre} · {activePackage.sesionesCompletadas}/{activePackage.sesionesTotales}
                  {activePackage.porcentajePagado != null && ` · ${activePackage.porcentajePagado}% pagado`}
                </Badge>
              ) : (
                <Badge variant="outline">Sin paquete activo</Badge>
              )}
              {patient.proximaCita ? (
                <Badge className="h-auto max-w-full gap-1 border-transparent bg-sand-soft text-left whitespace-normal text-sand-foreground">
                  <CalendarClock className="h-3 w-3" aria-hidden />
                  Próxima cita: {formatNextAppointment(patient.proximaCita)}
                </Badge>
              ) : (
                <Badge variant="outline">Sin cita programada</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {can("appointments.create") && (
            <Button asChild>
              <Link to="/calendar" search={{ patientId: patient.id }}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Agendar
              </Link>
            </Button>
          )}
          {can("payments.create") && (
            <Button variant="outline" onClick={onRegisterPayment}>
              <Wallet className="mr-2 h-4 w-4" />
              Registrar pago
            </Button>
          )}
          {can("clinical.note.create") && (
            <Button variant="outline" onClick={onNewNote}>
              <NotebookPen className="mr-2 h-4 w-4" />
              Nueva nota
            </Button>
          )}
          {can("patients.update") && (
            <Button asChild variant="outline">
              <Link to="/patients/$id/edit" params={{ id: patient.id }}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" aria-label="Volver a pacientes">
            <Link to="/patients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
