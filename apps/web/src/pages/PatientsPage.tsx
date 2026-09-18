// ============================================================
// PatientsPage.tsx — Lista paginada de pacientes
//
// Patrón:
//   - Buscador con debounce 300ms (resetea a página 1 al cambiar)
//   - Tabla shadcn con skeleton durante load
//   - Paginación cliente: Prev/Next + indicador
//   - Botón "Nuevo paciente" → /patients/new
//   - Acción por fila → /patients/$id
//
// EQUIVALENTE A: pages/oap/index.vue de SINERGIA
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
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
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { MotionTableRow, staggerProps } from "@/components/shared/motion-elements";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { usePageReset } from "@/hooks/use-page-reset";
import { useDeletePatient, usePatients } from "@/api/patients.api";
import { useToastStore } from "@/stores/toast.store";
import type { PatientSummary } from "@/types/patient";

const PAGE_SIZE = 20;

export function PatientsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [page, setPage] = usePageReset(search);

  const { data, isLoading } = usePatients(page, PAGE_SIZE, search);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">
            Gestión de la base de pacientes de la clínica.
          </p>
        </div>
        {can("patients.create") && (
          <Button asChild>
            <Link to="/patients/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo paciente
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre, apellido o cédula..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre completo</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Paquete activo</TableHead>
              <TableHead className="w-[180px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    illustration={search ? "search" : "patients"}
                    title={search ? `Sin resultados para "${search}"` : "Aún no hay pacientes"}
                    description={
                      search
                        ? "Revisa el nombre o busca por número de cédula."
                        : "Registra el primer paciente para abrir su historia clínica y agendarle citas."
                    }
                    action={
                      !search &&
                      can("patients.create") && (
                        <Button asChild>
                          <Link to="/patients/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo paciente
                          </Link>
                        </Button>
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((p, i) => (
              <MotionTableRow key={p.id} {...staggerProps(i)}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <PatientAvatar nombre={p.nombre} apellido={p.apellido} imagenId={p.imagenId} className="h-9 w-9 text-xs" />
                    <span>
                      {p.nombre} {p.apellido}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{p.cedula}</TableCell>
                <TableCell>{p.telefono}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.paqueteActivo ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: "/patients/$id", params: { id: p.id } })}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Ver
                    </Button>
                    {can("patients.delete") && <DeletePatientButton patient={p} />}
                  </div>
                </TableCell>
              </MotionTableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {/* paginación abajo */}
      {data && data.totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.totalCount} pacientes
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Botón Eliminar con confirmación (AlertDialog)
// ────────────────────────────────────────────────────────────
function DeletePatientButton({ patient }: { patient: PatientSummary }) {
  const deleteMutation = useDeletePatient();

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(patient.id);
      useToastStore.success(
        "Paciente eliminado",
        `${patient.nombre} ${patient.apellido}`,
      );
    } catch {
      // queryClient global ya disparó el toast con el mensaje del backend.
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={deleteMutation.isPending}
          aria-label={`Eliminar a ${patient.nombre} ${patient.apellido}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar a {patient.nombre} {patient.apellido}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marca al paciente como eliminado (soft delete). Su historia
            clínica y paquetes asociados se mantienen en la base, pero no aparecerán
            en las listas. Esta acción no se puede deshacer desde la UI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
