// ============================================================
// PatientDetailPage.tsx — Detalle de paciente con tabs
//
// Tabs: Información, Historia Clínica, Paquetes, Pagos.
// Cada tab tiene su propio query independiente (lazy: solo cuando
// el usuario abre el tab, TanStack Query lo cachea por 5min).
// ============================================================

import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/shared/PageContainer";
import { usePermissions } from "@/hooks/use-permissions";

import { usePatient } from "@/api/patients.api";
import { useClinicalNotes, useClinicalRecord } from "@/api/clinical-records.api";
import {
  usePatientPackagePayments,
  usePatientPackagesByPatient,
  useRegisterPayment,
} from "@/api/patient-packages.api";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/lib/utils";
import type { PatientPackage } from "@/types/patient-package";

import { toLocalDate } from "@/lib/dates";

const todayISO = () => toLocalDate(new Date());

const NOTES_PAGE_SIZE = 10;

export function PatientDetailPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const { data: patient, isLoading } = usePatient(id);
  const { can } = usePermissions();
  const canReadPackages = can("patientPackages.read");

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Paciente no encontrado.
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link to="/patients"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    `${patient.nombre} ${patient.apellido}`,
  )}`;

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={avatarUrl}
            alt={`${patient.nombre} ${patient.apellido}`}
            className="h-16 w-16 rounded-full border bg-muted"
          />
          <div>
            <h1 className="text-3xl font-bold">
              {patient.nombre} {patient.apellido}
            </h1>
            <p className="text-muted-foreground">Cédula: {patient.cedula}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/patients"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
          {can("patients.update") && (
            <Button asChild>
              <Link
                to="/patients/$id/edit"
                params={{ id: patient.id }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      {/* Paquetes y pagos: PatientPackagesController es policy Admin → ocultos para Esteticista */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="clinical">Historia clínica</TabsTrigger>
          {canReadPackages && <TabsTrigger value="packages">Paquetes</TabsTrigger>}
          {canReadPackages && <TabsTrigger value="payments">Pagos</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <InfoTab patient={patient} />
        </TabsContent>
        <TabsContent value="clinical" className="mt-4">
          <ClinicalTab patientId={patient.id} />
        </TabsContent>
        {canReadPackages && (
          <TabsContent value="packages" className="mt-4">
            <PackagesTab patientId={patient.id} />
          </TabsContent>
        )}
        {canReadPackages && (
          <TabsContent value="payments" className="mt-4">
            <PaymentsTab patientId={patient.id} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Información
// ────────────────────────────────────────────────────────────
function InfoTab({ patient }: { patient: NonNullable<ReturnType<typeof usePatient>["data"]> }) {
  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("es-CO") : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Teléfono" value={patient.telefono} />
        <Field label="Email" value={patient.email ?? "—"} />
        <Field label="Fecha de nacimiento" value={formatDate(patient.fechaNacimiento)} />
        <Field label="Activo" value={patient.isActive ? "Sí" : "No"} />
        <Field label="Creado" value={formatDate(patient.createdAt)} />
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-muted-foreground mb-1">Notas generales</p>
          <p className="whitespace-pre-wrap text-sm">
            {patient.notasGenerales ?? "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Historia clínica
// ────────────────────────────────────────────────────────────
function ClinicalTab({ patientId }: { patientId: string }) {
  const { data: record, isLoading: loadingRecord } = useClinicalRecord(patientId);
  const [notesPage, setNotesPage] = useState(1);
  const { data: notes, isLoading: loadingNotes } = useClinicalNotes(
    patientId,
    notesPage,
    NOTES_PAGE_SIZE,
  );

  const notesTotalPages = notes
    ? Math.max(1, Math.ceil(notes.totalCount / NOTES_PAGE_SIZE))
    : 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen clínico</CardTitle>
          <CardDescription>Antecedentes y alergias del paciente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {loadingRecord ? (
            <Skeleton className="h-32 w-full" />
          ) : record ? (
            <>
              <Field label="Antecedentes médicos" value={record.antecedentesMedicos ?? "—"} />
              <Field label="Alergias" value={record.alergias ?? "—"} />
              <Field label="Medicamentos actuales" value={record.medicamentosActuales ?? "—"} />
              <Field label="Observaciones" value={record.observacionesGenerales ?? "—"} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin historia clínica registrada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas clínicas</CardTitle>
          <CardDescription>
            Registro de cada sesión / consulta. Más recientes primero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingNotes && <Skeleton className="h-24 w-full" />}
          {notes && notes.items.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay notas clínicas.</p>
          )}
          {notes && notes.items.length > 0 && (
            <ul className="space-y-3">
              {notes.items.map((n) => (
                <li key={n.id} className="border rounded-md p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{n.procedimiento}</span>
                    <span className="text-muted-foreground">
                      {new Date(n.fechaCreacion).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                  {n.esteticistNombre && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Por {n.esteticistNombre}
                    </p>
                  )}
                  {n.observaciones && (
                    <p className="text-sm whitespace-pre-wrap">{n.observaciones}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {notes && notes.totalCount > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Página {notes.page} de {notesTotalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                  disabled={notesPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotesPage((p) => Math.min(notesTotalPages, p + 1))}
                  disabled={notesPage >= notesTotalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Paquetes
// ────────────────────────────────────────────────────────────
function statusBadge(estado: string) {
  switch (estado) {
    case "Activo":
      return <Badge variant="success">Activo</Badge>;
    case "Pausado":
      return <Badge variant="warning">Pausado</Badge>;
    case "Completado":
      return <Badge variant="secondary">Completado</Badge>;
    case "Vencido":
      return <Badge variant="destructive">Vencido</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

function PackagesTab({ patientId }: { patientId: string }) {
  const { data: packages, isLoading } = usePatientPackagesByPatient(patientId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!packages || packages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Este paciente no tiene paquetes asignados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}

function PackageCard({ pkg }: { pkg: PatientPackage }) {
  const pct = pkg.sesionesTotales
    ? Math.min(100, (pkg.sesionesCompletadas / pkg.sesionesTotales) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{pkg.packageNombre}</CardTitle>
          {statusBadge(pkg.estado)}
        </div>
        <CardDescription>
          Inicio: {new Date(pkg.fechaInicio).toLocaleDateString("es-CO")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">
              {pkg.sesionesCompletadas} / {pkg.sesionesTotales} sesiones
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total pagado</p>
            <p className="font-medium">${pkg.totalPagado.toLocaleString("es-CO")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="font-medium">${pkg.saldoPendiente.toLocaleString("es-CO")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Pagos
// ────────────────────────────────────────────────────────────
function PaymentsTab({ patientId }: { patientId: string }) {
  const { data: packages, isLoading } = usePatientPackagesByPatient(patientId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!packages || packages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Sin paquetes activos para mostrar pagos.
        </CardContent>
      </Card>
    );
  }

  const activos = packages.filter((p) => p.estado === "Activo");
  if (activos.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No hay paquetes activos en este momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activos.map((pkg) => (
        <PackagePaymentsSection key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}

function PackagePaymentsSection({ pkg }: { pkg: PatientPackage }) {
  const { data: payments, isLoading } = usePatientPackagePayments(pkg.id);
  const { can } = usePermissions();
  const [registerOpen, setRegisterOpen] = useState(false);

  const saldoCero = pkg.saldoPendiente <= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{pkg.packageNombre}</CardTitle>
            <CardDescription>
              Fecha inicio: {new Date(pkg.fechaInicio).toLocaleDateString("es-CO")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(pkg.estado)}
            {can("payments.create") && (
              <Button size="sm" onClick={() => setRegisterOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Registrar pago
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen acordado / pagado / saldo */}
        <div
          className={cn(
            "rounded-md px-3 py-2 grid grid-cols-3 gap-2 text-sm",
            saldoCero
              ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-100"
              : "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-100",
          )}
        >
          <div>
            <p className="text-xs opacity-75">Total acordado</p>
            <p className="font-medium">
              ${pkg.precioAcordado.toLocaleString("es-CO")}
            </p>
          </div>
          <div>
            <p className="text-xs opacity-75">Total pagado</p>
            <p className="font-medium">
              ${pkg.totalPagado.toLocaleString("es-CO")}
            </p>
          </div>
          <div>
            <p className="text-xs opacity-75">Saldo pendiente</p>
            <p className="font-medium">
              ${pkg.saldoPendiente.toLocaleString("es-CO")}
            </p>
          </div>
        </div>

        {isLoading && <Skeleton className="h-16 w-full" />}
        {payments && payments.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
        )}
        {payments && payments.length > 0 && (
          <ul className="divide-y">
            {payments.map((pay) => (
              <li key={pay.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">${pay.monto.toLocaleString("es-CO")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pay.fechaPago).toLocaleDateString("es-CO")} · {pay.metodoPago}
                  </p>
                </div>
                {pay.observacion && (
                  <p className="text-xs text-muted-foreground italic max-w-xs text-right">
                    {pay.observacion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <RegisterPaymentSheet
        open={registerOpen}
        packageId={pkg.id}
        saldoPendiente={pkg.saldoPendiente}
        onClose={() => setRegisterOpen(false)}
      />
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet: registrar pago
// ────────────────────────────────────────────────────────────
const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"] as const;

const paymentSchema = z.object({
  monto: z.number().positive("Monto debe ser mayor a 0"),
  fechaPago: z.string().min(1, "Requerido"),
  metodoPago: z.enum(METODOS_PAGO),
  observacion: z.string().optional().or(z.literal("")),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function RegisterPaymentSheet({
  open,
  packageId,
  saldoPendiente,
  onClose,
}: {
  open: boolean;
  packageId: string;
  saldoPendiente: number;
  onClose: () => void;
}) {
  const register = useRegisterPayment(packageId);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      monto: 0,
      fechaPago: todayISO(),
      metodoPago: "Efectivo",
      observacion: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        monto: saldoPendiente > 0 ? saldoPendiente : 0,
        fechaPago: todayISO(),
        metodoPago: "Efectivo",
        observacion: "",
      });
    }
  }, [open, saldoPendiente, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      await register.mutateAsync({
        monto: values.monto,
        fechaPago: values.fechaPago,
        metodoPago: values.metodoPago,
        observacion: values.observacion || undefined,
      });
      useToastStore.success("Pago registrado");
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={<>Registrar pago</>}
      description={<>Registra un pago para este paquete. Saldo actual: $
            {saldoPendiente.toLocaleString("es-CO")}.</>}
      dirty={form.formState.isDirty}
      actions={
        <Button
            form="payment-form"
            type="submit"
            disabled={register.isPending}
          >
            {register.isPending ? "Guardando..." : "Registrar pago"}
          </Button>
      }
    >
        <div className="pt-1">
          <Form {...form}>
            <form
              id="payment-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaPago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de pago *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metodoPago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METODOS_PAGO.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observación</FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        </FormDialog>
  );
}
