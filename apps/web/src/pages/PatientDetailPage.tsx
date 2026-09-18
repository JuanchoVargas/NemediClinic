// ============================================================
// PatientDetailPage.tsx — Detalle de paciente con tabs
//
// Cabecera (PatientHeader) con foto, badges y acciones rápidas.
// Tabs: Información, Historia Clínica, Evolución (fotos por sesión), Consentimientos, Paquetes, Pagos.
// Cada tab tiene su propio query independiente (lazy: solo cuando
// el usuario abre el tab, TanStack Query lo cachea por 5min).
// ============================================================

import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { AlarmClock, ArrowLeft, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { SecureImage } from "@/components/shared/SecureImage";
import { PackageStatusBadge } from "@/components/patient/PackageStatusBadge";
import { PaymentsTab } from "@/components/patient/PaymentsTab";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { EvolutionTab } from "@/components/patient/EvolutionTab";
import { ConsentsTab } from "@/components/patient/ConsentsTab";
import { ClinicalNoteDialog } from "@/components/patient/ClinicalNoteDialog";
import { ClinicalRecordDialog } from "@/components/patient/ClinicalRecordDialog";
import { formatShortDate } from "@/lib/format-platform";
import { usePermissions } from "@/hooks/use-permissions";

import { usePatient } from "@/api/patients.api";
import { useClinicalNotes, useClinicalRecord } from "@/api/clinical-records.api";
import { useDeletePatientPackage, usePatientPackagesByPatient } from "@/api/patient-packages.api";
import { useToastStore } from "@/stores/toast.store";
import type { PatientPackage } from "@/types/patient-package";

const NOTES_PAGE_SIZE = 10;

export function PatientDetailPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const { data: patient, isLoading } = usePatient(id);
  const { can } = usePermissions();
  const canReadPackages = can("patientPackages.read");
  const canCreateNote = can("clinical.note.create");
  // Tabs controlados: las acciones rápidas de la cabecera cambian de pestaña
  const [tab, setTab] = useState("info");
  const [noteOpen, setNoteOpen] = useState(false);

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

  return (
    <PageContainer>
      <PatientHeader
        patient={patient}
        onRegisterPayment={() => setTab("payments")}
        onNewNote={() => setNoteOpen(true)}
      />

      {/* ── Tabs ───────────────────────────────────────────── */}
      {/* Paquetes y pagos: PatientPackagesController es policy Admin → ocultos para Esteticista */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="clinical">Historia clínica</TabsTrigger>
          <TabsTrigger value="evolution">Evolución</TabsTrigger>
          <TabsTrigger value="consents">Consentimientos</TabsTrigger>
          {canReadPackages && <TabsTrigger value="packages">Paquetes</TabsTrigger>}
          {canReadPackages && <TabsTrigger value="payments">Pagos</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <InfoTab patient={patient} />
        </TabsContent>
        <TabsContent value="clinical" className="mt-4">
          <ClinicalTab patientId={patient.id} onNewNote={canCreateNote ? () => setNoteOpen(true) : undefined} />
        </TabsContent>
        <TabsContent value="evolution" className="mt-4">
          <EvolutionTab patientId={patient.id} onNewNote={canCreateNote ? () => setNoteOpen(true) : undefined} />
        </TabsContent>
        <TabsContent value="consents" className="mt-4">
          <ConsentsTab patientId={patient.id} />
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

      {noteOpen && <ClinicalNoteDialog patientId={patient.id} onClose={() => setNoteOpen(false)} />}
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
function ClinicalTab({ patientId, onNewNote }: { patientId: string; onNewNote?: () => void }) {
  const { data: record, isLoading: loadingRecord } = useClinicalRecord(patientId);
  const { can } = usePermissions();
  const [editingRecord, setEditingRecord] = useState(false);
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
      {editingRecord && record && (
        <ClinicalRecordDialog patientId={patientId} record={record} onClose={() => setEditingRecord(false)} />
      )}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Resumen clínico</CardTitle>
            <CardDescription>Antecedentes y alergias del paciente.</CardDescription>
          </div>
          {record && can("clinical.record.update") && (
            <Button variant="outline" size="sm" onClick={() => setEditingRecord(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar resumen
            </Button>
          )}
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Notas clínicas</CardTitle>
            <CardDescription>
              Registro de cada sesión / consulta. Más recientes primero.
            </CardDescription>
          </div>
          {onNewNote && (
            <Button size="sm" onClick={onNewNote}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva nota
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingNotes && <Skeleton className="h-24 w-full" />}
          {notes && notes.items.length === 0 && (
            <EmptyState
              illustration="generic"
              title="Aún no hay notas clínicas"
              description="Registra cada sesión con sus observaciones y fotos de antes y después."
              action={
                onNewNote && (
                  <Button onClick={onNewNote}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva nota
                  </Button>
                )
              }
            />
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
                  {n.fotos.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2" aria-label="Fotos de la nota">
                      {n.fotos.map((foto) => (
                        <li key={foto.id}>
                          <SecureImage
                            id={foto.id}
                            alt={foto.kind === "Antes" ? "Antes" : "Después"}
                            className="h-14 w-14 rounded-md border"
                          />
                        </li>
                      ))}
                    </ul>
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
  const { can } = usePermissions();
  const deletePackage = useDeletePatientPackage();
  const pct = pkg.sesionesTotales
    ? Math.min(100, (pkg.sesionesCompletadas / pkg.sesionesTotales) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{pkg.packageNombre}</CardTitle>
          <PackageStatusBadge estado={pkg.estado} />
        </div>
        <CardDescription>
          Inicio: {formatShortDate(pkg.fechaInicio)}
          {pkg.fechaVencimiento && ` · Vence: ${formatShortDate(pkg.fechaVencimiento)}`}
        </CardDescription>
        {pkg.porVencer && (
          <Badge variant="warning" className="mt-1 w-fit gap-1">
            <AlarmClock className="h-3 w-3" aria-hidden />
            {pkg.diasParaVencer === 0 ? "Vence hoy" : `Vence en ${pkg.diasParaVencer} días`}
          </Badge>
        )}
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
        {can("patientPackages.delete") && (
          <ConfirmDeleteButton
            label="Eliminar asignación"
            title={`¿Eliminar "${pkg.packageNombre}" de este paciente?`}
            description="Se eliminan también sus sesiones y pagos registrados. Las citas ya agendadas se conservan, sin vínculo al paquete."
            pending={deletePackage.isPending}
            onConfirm={async () => {
              await deletePackage.mutateAsync(pkg.id);
              useToastStore.success("Asignación eliminada", pkg.packageNombre);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
