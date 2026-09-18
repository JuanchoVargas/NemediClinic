// ============================================================
// CalendarPage.tsx — Calendario de citas (FullCalendar + Sheet)
//
// Vistas: dayGridMonth, timeGridWeek, timeGridDay (07:00–20:00).
// Click en slot vacío → Sheet con form de creación.
// Click en cita → Sheet con detalle + acciones según estado.
//
// EQUIVALENTE A: pages/agenda.vue de SINERGIA (FullCalendar también
// existía allá). El patrón es idéntico — solo cambia la sintaxis JSX.
// ============================================================

import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { DateSelectArg, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { Link, useSearch } from "@tanstack/react-router";
import { Check, ChevronsUpDown, ListChecks, NotebookPen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/PageContainer";

import {
  useAppointment,
  useAppointments,
  useCreateAppointment,
  useUpdateAppointmentStatus,
} from "@/api/appointments.api";
import { useProcedures, type ProcedureDto } from "@/api/procedures.api";
import { useEsteticistas } from "@/api/users.api";
import { usePatient, usePatients } from "@/api/patients.api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClinicalNoteDialog } from "@/components/patient/ClinicalNoteDialog";
import { ConsentSignDialog } from "@/components/consent/ConsentSignDialog";
import { ApiError } from "@/types/api";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_LABELS,
  appointmentToCalendarEvent,
  AppointmentStatus,
  type AppointmentStatus as AppointmentStatusValue,
} from "@/types/appointment";
import type { PatientSummary } from "@/types/patient";
import { toLocalIso, toLocalDateTimeInput } from "@/lib/dates";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

// Helpers de fecha: hora local sin UTC, ver src/lib/dates.ts
function addMinutesISO(local: string, minutes: number) {
  const d = new Date(local);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

// ────────────────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────────────────
export function CalendarPage() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const { can } = usePermissions();
  const canFilter = can("appointments.filterByEsteticist");

  // En un teléfono la semana no cabe: se parte de la vista de día
  const isMobile = useIsMobile();
  const [view, setView] = useState<CalendarView>(() => (isMobile ? "timeGridDay" : "timeGridWeek"));
  const [title, setTitle] = useState("");
  const [range, setRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    return { start: toLocalIso(start), end: toLocalIso(end) };
  });
  const [esteticistFilter, setEsteticistFilter] = useState<string>("all");

  // Precarga desde la ficha del paciente (botón "Agendar" y "Agendar" de la próxima sesión
  // sugerida en Evolución): paciente, procedimiento y fecha. Sin ?fecha= se propone la próxima
  // hora en punto; con ella, las 9:00 de ese día, que es cuando abre la clínica.
  const {
    patientId: presetPatientId,
    procedureId: presetProcedureId,
    fecha: presetFecha,
    appointmentId: presetAppointmentId,
  } = useSearch({ strict: false }) as { patientId?: string; procedureId?: string; fecha?: string; appointmentId?: string };

  // Estado de diálogos. `seq` remonta el formulario de creación en cada apertura.
  const [createSheet, setCreateSheet] = useState<{
    open: boolean;
    defaultStart?: Date;
    defaultPatientId?: string;
    defaultProcedureId?: string;
    seq: number;
  }>(() => {
    if (!presetPatientId) return { open: false, seq: 0 };
    const inicio = presetFecha ? new Date(`${presetFecha}T09:00:00`) : new Date();
    if (!presetFecha) inicio.setHours(inicio.getHours() + 1, 0, 0, 0);
    return {
      open: true,
      defaultStart: inicio,
      defaultPatientId: presetPatientId,
      defaultProcedureId: presetProcedureId,
      seq: 0,
    };
  });
  const [detailSheetId, setDetailSheetId] = useState<string | undefined>(presetAppointmentId);

  const { data: appointments, isLoading } = useAppointments(
    range.start,
    range.end,
    esteticistFilter !== "all" ? esteticistFilter : undefined,
  );
  const { data: esteticistas } = useEsteticistas();

  const events = useMemo(
    () => (appointments ?? []).map(appointmentToCalendarEvent),
    [appointments],
  );

  const changeView = (v: CalendarView) => {
    setView(v);
    calendarRef.current?.getApi().changeView(v);
  };

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">{title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canFilter && (
            <Select value={esteticistFilter} onValueChange={setEsteticistFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Esteticista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los esteticistas</SelectItem>
                {esteticistas?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} {e.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button asChild variant="outline" size="sm">
            <Link to="/calendar/day-sheet">
              <ListChecks className="mr-2 h-4 w-4" />
              Hoja del día
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Toolbar custom ─────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().prev()}
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().today()}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().next()}
          >
            ›
          </Button>
        </div>

        <div className="flex gap-1">
          {(["timeGridDay", "timeGridWeek", "dayGridMonth"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              size="sm"
              onClick={() => changeView(v)}
            >
              {v === "timeGridDay" && "Día"}
              {v === "timeGridWeek" && "Semana"}
              {v === "dayGridMonth" && "Mes"}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Loading state ──────────────────────────────── */}
      {isLoading && <Skeleton className="h-[600px] w-full" />}

      {/* ── Calendario ─────────────────────────────────── */}
      <div className="rounded-md border bg-background p-2">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          locale={esLocale}
          headerToolbar={false}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          height="auto"
          selectable
          selectMirror
          events={events}
          datesSet={(arg: DatesSetArg) => {
            setRange({
              start: toLocalIso(arg.start),
              end: toLocalIso(arg.end),
            });
            setTitle(arg.view.title);
          }}
          select={(arg: DateSelectArg) => {
            if (!can("appointments.create")) return;
            setCreateSheet((s) => ({ open: true, defaultStart: arg.start, seq: s.seq + 1 }));
          }}
          eventClick={(arg: EventClickArg) => {
            setDetailSheetId(arg.event.id);
          }}
        />
      </div>

      {/* ── Sheets ─────────────────────────────────────── */}
      <CreateAppointmentSheet
        key={createSheet.seq}
        open={createSheet.open}
        defaultStart={createSheet.defaultStart}
        defaultPatientId={createSheet.defaultPatientId}
        defaultProcedureId={createSheet.defaultProcedureId}
        onClose={() => setCreateSheet((s) => ({ ...s, open: false }))}
      />
      <AppointmentDetailSheet
        id={detailSheetId}
        onClose={() => setDetailSheetId(undefined)}
      />
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet: crear cita
// ────────────────────────────────────────────────────────────
function CreateAppointmentSheet({
  open,
  defaultStart,
  defaultPatientId,
  defaultProcedureId,
  onClose,
}: {
  open: boolean;
  defaultStart?: Date;
  defaultPatientId?: string;
  defaultProcedureId?: string;
  onClose: () => void;
}) {
  const create = useCreateAppointment();
  // Solo procedimientos activos: uno inactivo no se puede agendar
  const { data: allProcedures } = useProcedures();
  const procedures = allProcedures?.filter((p) => p.activo);
  const { data: esteticistas } = useEsteticistas();

  // El rol Esteticista solo agenda citas propias (el backend permite más; la UI lo restringe)
  const { role, userId } = usePermissions();
  const lockedToSelf = role === "Esteticista" && !!userId;

  // Estado inicial por render: el padre remonta este componente (key) en cada apertura,
  // así no hace falta un useEffect para resetear.
  const initialFecha = defaultStart ? toLocalDateTimeInput(defaultStart) : "";
  // undefined = el usuario aún no tocó el selector → vale el paciente precargado por la URL
  const { data: presetPatient } = usePatient(defaultPatientId);
  const [pickedPatient, setPatient] = useState<PatientSummary | null | undefined>(undefined);
  const patient: PatientSummary | null = pickedPatient === undefined ? (presetPatient ?? null) : pickedPatient;
  const [procedureId, setProcedureId] = useState<string>(defaultProcedureId ?? "");
  const [esteticistId, setEsteticistId] = useState<string>(lockedToSelf ? userId : "");
  const [fechaInicio, setFechaInicio] = useState<string>(initialFecha);
  const [notas, setNotas] = useState<string>("");

  const createDirty =
    !!pickedPatient ||
    procedureId !== (defaultProcedureId ?? "") ||
    !!notas ||
    fechaInicio !== initialFecha ||
    (!lockedToSelf && !!esteticistId);

  const procedure: ProcedureDto | undefined = procedures?.find(
    (p) => p.id === procedureId,
  );
  const fechaFinPreview =
    fechaInicio && procedure
      ? addMinutesISO(fechaInicio, procedure.duracionMinutos)
      : null;

  // Tomamos branchId del esteticista seleccionado si lo tiene; sino del primer
  // esteticista. Es un atajo razonable para 2.5C; cuando exista BranchPicker
  // global lo cambiamos.
  const branchId = (() => {
    const fromEsteticist = esteticistas?.find((e) => e.id === esteticistId);
    return fromEsteticist?.branchId ?? esteticistas?.[0]?.branchId ?? undefined;
  })();

  const canSubmit =
    !!patient && !!procedureId && !!esteticistId && !!fechaInicio && !!branchId;

  const handleSubmit = async () => {
    if (!canSubmit || !patient || !branchId) return;
    try {
      await create.mutateAsync({
        patientId: patient.id,
        esteticistId,
        procedureId,
        branchId,
        fechaInicio: toLocalIso(new Date(fechaInicio)),
        notas: notas || undefined,
      });
      useToastStore.success("Cita creada");
      onClose();
    } catch {
      // toast global ya disparó
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={<>Nueva cita</>}
      description={<>Completa los datos. La hora de fin se calcula desde la duración del procedimiento.</>}
      dirty={createDirty}
      actions={
        <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Creando..." : "Crear cita"}
          </Button>
      }
    >
        <div className="pt-1 space-y-4">
          <PatientCombobox value={patient} onChange={setPatient} />

          <div className="space-y-1.5">
            <Label>Procedimiento</Label>
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {procedures?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.duracionMinutos} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Esteticista</Label>
            <Select value={esteticistId} onValueChange={setEsteticistId} disabled={lockedToSelf}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {esteticistas?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} {e.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha y hora de inicio</Label>
            <Input
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {fechaFinPreview && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Termina a las: </span>
              <span className="font-medium">
                {fechaFinPreview.toLocaleString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        </FormDialog>
  );
}

// ────────────────────────────────────────────────────────────
// Combobox de paciente con búsqueda server-side
// ────────────────────────────────────────────────────────────
function PatientCombobox({
  value,
  onChange,
}: {
  value: PatientSummary | null;
  onChange: (p: PatientSummary | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data } = usePatients(1, 20, debounced);

  return (
    <div className="space-y-1.5">
      <Label>Paciente</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span>
                {value.nombre} {value.apellido}{" "}
                <span className="text-muted-foreground">({value.cedula})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar paciente...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Nombre, apellido o cédula..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {data?.items.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      onChange(p);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>
                        {p.nombre} {p.apellido}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.cedula}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet: detalle de cita con acciones por estado
// ────────────────────────────────────────────────────────────
function AppointmentDetailSheet({
  id,
  onClose,
}: {
  id?: string;
  onClose: () => void;
}) {
  const open = !!id;
  const { data, isLoading } = useAppointment(id);
  const updateStatus = useUpdateAppointmentStatus();
  const { can, role, userId } = usePermissions();
  const [noteOpen, setNoteOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  // El backend deja cambiar estado a Admin/SuperAdmin sobre cualquier cita y
  // a Esteticista solo sobre las propias (403 en caso contrario).
  const canAct =
    can("appointments.updateStatus") &&
    (role !== "Esteticista" || (!!data && data.esteticistId === userId));

  const handleStatus = async (estado: AppointmentStatusValue) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, body: { estado } });
      useToastStore.success(`Cita marcada como ${APPOINTMENT_LABELS[estado]}`);
      onClose();
    } catch (error) {
      // 409 consent_required: el procedimiento exige consentimiento firmado → se abre la firma.
      // El toast global ya explicó el motivo.
      if (isConsentRequired(error)) setConsentOpen(true);
    }
  };

  // Acciones disponibles por estado actual
  const actions: { label: string; next: AppointmentStatusValue; variant?: "default" | "destructive" | "outline" }[] = (() => {
    if (!data) return [];
    switch (data.estado) {
      case AppointmentStatus.Agendada:
        return [
          { label: "Confirmar", next: AppointmentStatus.Confirmada },
          { label: "Cancelar", next: AppointmentStatus.Cancelada, variant: "destructive" },
        ];
      case AppointmentStatus.Confirmada:
        return [
          { label: "Iniciar", next: AppointmentStatus.EnCurso },
          { label: "Cancelar", next: AppointmentStatus.Cancelada, variant: "destructive" },
        ];
      case AppointmentStatus.EnCurso:
        return [{ label: "Completar", next: AppointmentStatus.Completada }];
      default:
        return [];
    }
  })();

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Detalle de la cita"
      cancelLabel="Cerrar"
      actions={
        canAct &&
        actions.map((a) => (
          <Button
            key={a.next}
            variant={a.variant ?? "default"}
            onClick={() => handleStatus(a.next)}
            disabled={updateStatus.isPending}
          >
            {a.label}
          </Button>
        ))
      }
    >
        <div className="space-y-3 pt-1">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {data && (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {APPOINTMENT_LABELS[data.estado as AppointmentStatusValue] ?? data.estado}
                </Badge>
                {data.whatsAppConfirmedAt && (
                  <Badge variant="success">WA confirmado</Badge>
                )}
              </div>

              <DetailRow label="Paciente" value={data.patientNombre} />
              <DetailRow label="Procedimiento" value={data.procedureNombre} />
              <DetailRow label="Esteticista" value={data.esteticistNombre} />
              <DetailRow
                label="Inicio"
                value={new Date(data.fechaInicio).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <DetailRow
                label="Fin"
                value={new Date(data.fechaFin).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              {data.notas && <DetailRow label="Notas" value={data.notas} />}
              {/* Cita atendida: la nota clínica nace con el procedimiento y la esteticista de la cita */}
              {data.estado === AppointmentStatus.Completada && can("clinical.note.create") && (
                <Button variant="outline" className="w-full" onClick={() => setNoteOpen(true)}>
                  <NotebookPen className="mr-2 h-4 w-4" />
                  Crear nota clínica de esta cita
                </Button>
              )}
              {!canAct && actions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Solo la esteticista asignada puede cambiar el estado de esta cita.
                </p>
              )}
            </>
          )}
        </div>
      {consentOpen && data && (
        <ConsentSignDialog
          patientId={data.patientId}
          procedureId={data.procedureId}
          appointmentId={data.id}
          onClose={() => setConsentOpen(false)}
          // Con el consentimiento firmado, la cita inicia sin otro clic
          onSigned={() => void handleStatus(AppointmentStatus.EnCurso)}
        />
      )}
      {noteOpen && data && (
        <ClinicalNoteDialog
          patientId={data.patientId}
          defaults={{
            procedimiento: data.procedureNombre,
            esteticistId: data.esteticistId,
            appointmentId: data.id,
          }}
          onClose={() => setNoteOpen(false)}
        />
      )}
    </FormDialog>
  );
}

/** ¿El backend rechazó el cambio de estado por falta de consentimiento informado? */
function isConsentRequired(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.codigoRespuesta !== 409) return false;
  const original = error.originalError as { response?: { data?: { code?: string } } } | undefined;
  return original?.response?.data?.code === "consent_required";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
