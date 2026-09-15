// ============================================================
// PackageDetailPage.tsx — Detalle del paquete + asignar a paciente
//
// Header con nombre/precio/estado; lista de procedimientos del paquete;
// Sheet lateral para asignar el paquete a un paciente (POST /patient-packages).
// ============================================================

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Pencil, UserPlus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/PageContainer";
import { PatientCombobox } from "@/components/shared/PatientCombobox";

import { usePackage } from "@/api/packages.api";
import { useAssignPackage } from "@/api/patient-packages.api";
import { useToastStore } from "@/stores/toast.store";
import type { PatientSummary } from "@/types/patient";

import { toLocalDate } from "@/lib/dates";

const todayISO = () => toLocalDate(new Date());

export function PackageDetailPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const { data: pkg, isLoading } = usePackage(id);
  const [assignOpen, setAssignOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-20 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!pkg) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Paquete no encontrado.
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link to="/packages"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{pkg.nombre}</h1>
            {pkg.activo ? (
              <Badge variant="success">Activo</Badge>
            ) : (
              <Badge variant="secondary">Inactivo</Badge>
            )}
          </div>
          <p className="text-2xl text-muted-foreground">
            ${pkg.precioTotal.toLocaleString("es-CO")}
          </p>
          {pkg.descripcion && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {pkg.descripcion}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/packages"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/packages/$id/edit" params={{ id: pkg.id }}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button onClick={() => setAssignOpen(true)} disabled={!pkg.activo}>
            <UserPlus className="mr-2 h-4 w-4" />
            Asignar a paciente
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Info card ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
            <CardDescription>Configuración general del paquete.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Sesiones totales" value={String(pkg.sesionesTotales)} />
            <Field label="Vigencia" value={`${pkg.vigenciaDias} días`} />
            <Field
              label="Alerta vencimiento"
              value={`${pkg.diasAlertaVencimiento} días antes`}
            />
            <Field
              label="Procedimientos"
              value={String(pkg.procedimientos?.length ?? 0)}
            />
          </CardContent>
        </Card>

        {/* ── Procedimientos ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Procedimientos incluidos</CardTitle>
            <CardDescription>
              Cantidad de sesiones por cada procedimiento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pkg.procedimientos || pkg.procedimientos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este paquete no tiene procedimientos asociados.
              </p>
            ) : (
              <ul className="divide-y">
                {pkg.procedimientos.map((p) => (
                  <li key={p.procedureId} className="py-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{p.procedureNombre}</span>
                    <span className="text-muted-foreground">
                      {p.cantidadSesiones} sesion{p.cantidadSesiones === 1 ? "" : "es"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AssignPackageSheet
        open={assignOpen}
        packageId={pkg.id}
        defaultPrice={pkg.precioTotal}
        onClose={() => setAssignOpen(false)}
      />
    </PageContainer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet: asignar paquete a paciente
// ────────────────────────────────────────────────────────────
function AssignPackageSheet({
  open,
  packageId,
  defaultPrice,
  onClose,
}: {
  open: boolean;
  packageId: string;
  defaultPrice: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const assign = useAssignPackage();

  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [precio, setPrecio] = useState<number>(defaultPrice);
  const [fechaInicio, setFechaInicio] = useState<string>(todayISO());

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setPatient(null);
      setPrecio(defaultPrice);
      setFechaInicio(todayISO());
    }
  }, [open, defaultPrice]);

  const canSubmit = !!patient && precio >= 0 && !!fechaInicio;

  const handleSubmit = async () => {
    if (!patient) return;
    try {
      await assign.mutateAsync({
        patientId: patient.id,
        packageId,
        precioAcordado: precio,
        fechaInicio,
      });
      useToastStore.success("Paquete asignado", `${patient.nombre} ${patient.apellido}`);
      onClose();
      navigate({ to: "/patients/$id", params: { id: patient.id } });
    } catch {
      // toast global
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Asignar paquete a paciente</SheetTitle>
          <SheetDescription>
            Las sesiones del paquete se generan automáticamente al asignar.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <PatientCombobox value={patient} onChange={setPatient} />

          <div className="space-y-1.5">
            <Label>Precio acordado</Label>
            <CurrencyInput
              value={precio}
              onChange={setPrecio}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Por defecto el precio del paquete (${defaultPrice.toLocaleString("es-CO")}).
              Podés ajustarlo si negociaste un descuento o sobreprecio.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de inicio</Label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || assign.isPending}
          >
            {assign.isPending ? "Asignando..." : "Asignar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
