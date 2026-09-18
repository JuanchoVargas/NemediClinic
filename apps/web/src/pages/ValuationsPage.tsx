// ============================================================
// ValuationsPage.tsx — Valoraciones (/valoraciones)
//
// Lista con embudo del mes (total → aceptó / rechazó / pendiente) y tasa de
// conversión. Una valoración es de un paciente o de un prospecto. "Convertir"
// crea el paciente si hacía falta y le asigna el paquete cotizado.
// Diálogos en components/valuation/*.
// ============================================================

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRightLeft, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { CountUp } from "@/components/shared/motion";
import { MotionTableRow, staggerProps } from "@/components/shared/motion-elements";
import { ConvertValuationDialog } from "@/components/valuation/ConvertValuationDialog";
import { RejectValuationDialog } from "@/components/valuation/RejectValuationDialog";
import { ValuationFormDialog } from "@/components/valuation/ValuationFormDialog";
import { useDeleteValuation, useValuationStats, useValuations } from "@/api/valuations.api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { toLocalDate } from "@/lib/dates";
import { formatCop, formatPercent, formatShortDate } from "@/lib/format-platform";
import { useToastStore } from "@/stores/toast.store";
import { VALUATION_LABELS, type Valuation, type ValuationEstado, type ValuationStats } from "@/types/valuation";

const ALL = "all";
const ESTADO_BADGE: Record<ValuationEstado, "warning" | "success" | "secondary"> = {
  Pendiente: "warning",
  Acepto: "success",
  Rechazo: "secondary",
};

export function ValuationsPage() {
  const { can } = usePermissions();
  const [estado, setEstado] = useState<string>(ALL);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [mes] = useState(() => toLocalDate(new Date()).slice(0, 7));

  const { data: valuations, isLoading } = useValuations(estado === ALL ? undefined : (estado as ValuationEstado), search);
  const { data: stats } = useValuationStats(mes);

  const [formState, setFormState] = useState<{ open: boolean; editing?: Valuation }>({ open: false });
  const [converting, setConverting] = useState<Valuation | null>(null);
  const [rejecting, setRejecting] = useState<Valuation | null>(null);

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Valoraciones</h1>
          <p className="text-muted-foreground">Diagnóstico, cotización y cierre de cada valoración.</p>
        </div>
        {can("valuations.write") && (
          <Button onClick={() => setFormState({ open: true })}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva valoración
          </Button>
        )}
      </div>

      <Funnel stats={stats} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o cédula..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-44 bg-card" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendientes</SelectItem>
            <SelectItem value="Acepto">Aceptó</SelectItem>
            <SelectItem value="Rechazo">Rechazó</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tratamiento sugerido</TableHead>
              <TableHead className="text-right">Cotizado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && valuations?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    illustration={search || estado !== ALL ? "search" : "generic"}
                    title={search || estado !== ALL ? "Sin valoraciones con esos filtros" : "Aún no hay valoraciones"}
                    description="Registra el diagnóstico y la cotización de cada persona que llega a valoración, sea o no paciente todavía."
                    action={
                      can("valuations.write") &&
                      !search &&
                      estado === ALL && (
                        <Button onClick={() => setFormState({ open: true })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nueva valoración
                        </Button>
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            )}

            {valuations?.map((v, i) => (
              <MotionTableRow key={v.id} {...staggerProps(i)}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {v.patientId ? (
                      <Link to="/patients/$id" params={{ id: v.patientId }} className="hover:text-primary hover:underline">
                        {v.nombre}
                      </Link>
                    ) : (
                      v.nombre
                    )}
                    {v.esProspecto && <Badge variant="outline">Prospecto</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.telefono} · {v.esteticista}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatShortDate(v.fecha)}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate">{v.paquete ?? (v.procedimientos.map((p) => p.nombre).join(", ") || "—")}</div>
                  <div className="truncate text-xs text-muted-foreground">{v.diagnostico}</div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatCop(v.precioCotizado)}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_BADGE[v.estado]}>{VALUATION_LABELS[v.estado]}</Badge>
                  {v.motivoRechazo && <div className="mt-0.5 max-w-40 truncate text-xs text-muted-foreground">{v.motivoRechazo}</div>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {v.estado !== "Acepto" && can("valuations.convert") && (
                      <Button size="sm" onClick={() => setConverting(v)} aria-label={`Convertir la valoración de ${v.nombre}`}>
                        <ArrowRightLeft className="mr-1 h-4 w-4" />
                        Convertir
                      </Button>
                    )}
                    {v.estado === "Pendiente" && can("valuations.write") && (
                      <Button variant="outline" size="sm" onClick={() => setRejecting(v)} aria-label={`Marcar como rechazada la valoración de ${v.nombre}`}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {v.estado !== "Acepto" && can("valuations.write") && (
                      <Button variant="outline" size="sm" onClick={() => setFormState({ open: true, editing: v })} aria-label={`Editar la valoración de ${v.nombre}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {can("valuations.delete") && <DeleteValuationButton valuation={v} />}
                  </div>
                </TableCell>
              </MotionTableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {formState.open && (
        <ValuationFormDialog
          key={formState.editing?.id ?? "new"}
          editing={formState.editing}
          onClose={() => setFormState({ open: false })}
        />
      )}
      {converting && <ConvertValuationDialog key={converting.id} valuation={converting} onClose={() => setConverting(null)} />}
      {rejecting && <RejectValuationDialog key={rejecting.id} valuation={rejecting} onClose={() => setRejecting(null)} />}
    </PageContainer>
  );
}

/** Embudo del mes: cada barra es proporcional al total de valoraciones. */
function Funnel({ stats }: { stats?: ValuationStats }) {
  const total = stats?.total ?? 0;
  const steps = [
    { label: "Valoraciones del mes", value: total, className: "bg-primary" },
    { label: "Aceptaron", value: stats?.aceptadas ?? 0, className: "bg-success" },
    { label: "Pendientes", value: stats?.pendientes ?? 0, className: "bg-sand" },
    { label: "Rechazaron", value: stats?.rechazadas ?? 0, className: "bg-muted-foreground/50" },
  ];

  return (
    <Card className="mb-6">
      <CardContent className="grid gap-6 md:grid-cols-[1fr_auto]">
        <ul className="space-y-3" aria-label="Embudo de valoraciones del mes">
          {steps.map((step) => (
            <li key={step.label} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-muted">
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out ${step.className}`}
                  style={{ width: total === 0 ? "0%" : `${Math.max(step.value > 0 ? 4 : 0, (step.value / total) * 100)}%` }}
                />
              </span>
              <span className="text-right font-heading font-semibold">{step.value}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col justify-center border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <p className="text-sm text-muted-foreground">Tasa de conversión</p>
          <p className="font-heading text-3xl font-bold">
            {stats ? <CountUp value={stats.tasaConversion * 100} format={(n) => formatPercent(Math.round(n) / 100)} /> : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCop(stats?.valorAceptado ?? 0)} aceptados de {formatCop(stats?.valorCotizado ?? 0)} cotizados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteValuationButton({ valuation }: { valuation: Valuation }) {
  const del = useDeleteValuation();
  const handleConfirm = async () => {
    try {
      await del.mutateAsync(valuation.id);
      useToastStore.success("Valoración eliminada", valuation.nombre);
    } catch {
      // toast global
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={del.isPending} aria-label={`Eliminar la valoración de ${valuation.nombre}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la valoración de {valuation.nombre}?</AlertDialogTitle>
          <AlertDialogDescription>Deja de contar en el embudo del mes. El paciente y sus paquetes no se tocan.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
