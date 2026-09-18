// ============================================================
// PackagesPage.tsx — Catálogo de paquetes
//
// Tabla con buscador/paginación + soft delete.
// El alta/edición van a /packages/new y /packages/$id/edit
// porque el form es más extenso (incluye procedures).
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, Plus, Search, Trash2 } from "lucide-react";

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
import { PageContainer } from "@/components/shared/PageContainer";

import { useDeletePackage, usePackages } from "@/api/packages.api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { usePageReset } from "@/hooks/use-page-reset";
import { useToastStore } from "@/stores/toast.store";
import type { Package } from "@/types/package";

const PAGE_SIZE = 20;

export function PackagesPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [page, setPage] = usePageReset(search);

  const { data, isLoading } = usePackages(page, PAGE_SIZE, search);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Paquetes</h1>
          <p className="text-muted-foreground">
            Catálogo de paquetes comerciales (combos de procedimientos).
          </p>
        </div>
        {can("packages.create") && (
          <Button asChild>
            <Link to="/packages/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo paquete
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Sesiones</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search
                    ? `Sin resultados para "${search}".`
                    : "Aún no hay paquetes registrados."}
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((pkg) => (
              <TableRow
                key={pkg.id}
                className="cursor-pointer"
                onClick={() => navigate({ to: "/packages/$id", params: { id: pkg.id } })}
              >
                <TableCell className="font-medium">{pkg.nombre}</TableCell>
                <TableCell>{pkg.sesionesTotales}</TableCell>
                <TableCell>${pkg.precioTotal.toLocaleString("es-CO")}</TableCell>
                <TableCell className="text-muted-foreground">{pkg.vigenciaDias} días</TableCell>
                <TableCell>
                  {pkg.activo ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: "/packages/$id", params: { id: pkg.id } })}
                      aria-label={`Ver ${pkg.nombre}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {can("packages.delete") && <DeletePackageButton pkg={pkg} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {data && data.totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.totalCount} paquetes
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function DeletePackageButton({ pkg }: { pkg: Package }) {
  const del = useDeletePackage();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(pkg.id);
      useToastStore.success("Paquete eliminado", pkg.nombre);
    } catch {
      // toast global
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={del.isPending}
          aria-label={`Eliminar ${pkg.nombre}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{pkg.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marca el paquete como eliminado (soft delete).
            Los paquetes ya asignados a pacientes se mantienen, pero no podrás
            asignar este paquete a nuevos pacientes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
