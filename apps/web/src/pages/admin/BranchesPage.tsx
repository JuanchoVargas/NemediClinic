// ============================================================
// BranchesPage.tsx — Gestión de sedes (/admin/branches)
//
// Tabla de sedes del tenant con alta/edición vía Sheet y soft delete.
// Solo visible para SuperAdmin (guard en el router).
// ============================================================

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer } from "@/components/shared/PageContainer";

import {
  useBranchesPaged,
  useCreateBranch,
  useDeleteBranch,
  useUpdateBranch,
} from "@/api/branches.api";
import { useDebounce } from "@/hooks/use-debounce";
import { useToastStore } from "@/stores/toast.store";
import type { Branch } from "@/types/branch";

const PAGE_SIZE = 20;

const branchSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  direccion: z.string().min(1, "Requerido"),
  telefono: z.string().min(1, "Requerido"),
});

type BranchFormValues = z.infer<typeof branchSchema>;

const EMPTY: BranchFormValues = { nombre: "", direccion: "", telefono: "" };

export function BranchesPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useBranchesPaged(page, PAGE_SIZE, search);

  const [sheetState, setSheetState] = useState<{ open: boolean; editing?: Branch }>({
    open: false,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">
            Sedes (sucursales) de la clínica.
          </p>
        </div>
        <Button onClick={() => setSheetState({ open: true })}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva sede
        </Button>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {search ? `Sin resultados para "${search}".` : "Aún no hay sedes registradas."}
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{b.direccion || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{b.telefono || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSheetState({ open: true, editing: b })}
                      aria-label={`Editar ${b.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteBranchButton branch={b} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.totalCount} sedes
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

      <BranchSheet
        open={sheetState.open}
        editing={sheetState.editing}
        onClose={() => setSheetState({ open: false })}
      />
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet con form (crear o editar)
// ────────────────────────────────────────────────────────────
function BranchSheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: Branch;
  onClose: () => void;
}) {
  const create = useCreateBranch();
  const update = useUpdateBranch();
  const isPending = create.isPending || update.isPending;
  const isEdit = !!editing;

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              nombre: editing.nombre,
              direccion: editing.direccion,
              telefono: editing.telefono,
            }
          : EMPTY,
      );
    }
  }, [open, editing, form]);

  const onSubmit = async (values: BranchFormValues) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, body: values });
        useToastStore.success("Sede actualizada");
      } else {
        await create.mutateAsync(values);
        useToastStore.success("Sede creada");
      }
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar sede" : "Nueva sede"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Modifica los datos de la sede." : "Da de alta una sede nueva."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <Form {...form}>
            <form id="branch-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="branch-form" type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ────────────────────────────────────────────────────────────
// Eliminar con confirmación
// ────────────────────────────────────────────────────────────
function DeleteBranchButton({ branch }: { branch: Branch }) {
  const del = useDeleteBranch();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(branch.id);
      useToastStore.success("Sede eliminada", branch.nombre);
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
          aria-label={`Eliminar ${branch.nombre}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{branch.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marca la sede como eliminada (soft delete). Los usuarios y
            citas que la referencien se mantienen.
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
