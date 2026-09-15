// ============================================================
// ProceduresPage.tsx — Catálogo de procedimientos
//
// Tabla con buscador/paginación, alta/edición vía Sheet lateral,
// soft delete con confirmación.
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Switch } from "@/components/ui/switch";
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
  useCreateProcedure,
  useDeleteProcedure,
  useProceduresPaged,
  useUpdateProcedure,
} from "@/api/procedures.api";
import { useDebounce } from "@/hooks/use-debounce";
import { useToastStore } from "@/stores/toast.store";
import type { Procedure } from "@/types/procedure";

const PAGE_SIZE = 20;

// Validaciones de no-negativo/entero vía HTML input attrs (min/step).
// Zod 4 cambia la INPUT type a `unknown` cuando se encadenan refinements,
// lo que rompe la inferencia de useForm.
const procedureSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  descripcion: z.string().optional().or(z.literal("")),
  precioBase: z.number(),
  duracionMinutos: z.number(),
  areaCorporal: z.string().min(1, "Requerido"),
  activo: z.boolean(),
});

type ProcedureFormValues = z.infer<typeof procedureSchema>;

const EMPTY: ProcedureFormValues = {
  nombre: "",
  descripcion: "",
  precioBase: 0,
  duracionMinutos: 30,
  areaCorporal: "",
  activo: true,
};

export function ProceduresPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useProceduresPaged(page, PAGE_SIZE, search);

  const [sheetState, setSheetState] = useState<{
    open: boolean;
    editing?: Procedure;
  }>({ open: false });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Procedimientos</h1>
          <p className="text-muted-foreground">
            Catálogo de procedimientos disponibles en la clínica.
          </p>
        </div>
        <Button onClick={() => setSheetState({ open: true })}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo procedimiento
        </Button>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre o área..."
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
              <TableHead>Área corporal</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Precio base</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
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
                    : "Aún no hay procedimientos registrados."}
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{p.areaCorporal}</TableCell>
                <TableCell>{p.duracionMinutos} min</TableCell>
                <TableCell>${p.precioBase.toLocaleString("es-CO")}</TableCell>
                <TableCell>
                  {p.activo ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSheetState({ open: true, editing: p })}
                      aria-label={`Editar ${p.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteProcedureButton procedure={p} />
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
            Página {data.page} de {totalPages} · {data.totalCount} procedimientos
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

      <ProcedureSheet
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
function ProcedureSheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: Procedure;
  onClose: () => void;
}) {
  const create = useCreateProcedure();
  const update = useUpdateProcedure();
  const isPending = create.isPending || update.isPending;
  const isEdit = !!editing;

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              nombre: editing.nombre,
              descripcion: editing.descripcion ?? "",
              precioBase: editing.precioBase,
              duracionMinutos: editing.duracionMinutos,
              areaCorporal: editing.areaCorporal,
              activo: editing.activo,
            }
          : EMPTY,
      );
    }
  }, [open, editing, form]);

  const onSubmit = async (values: ProcedureFormValues) => {
    const body = {
      nombre: values.nombre,
      descripcion: values.descripcion || "",
      precioBase: values.precioBase,
      duracionMinutos: values.duracionMinutos,
      areaCorporal: values.areaCorporal,
    };
    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          id: editing.id,
          body: { ...body, activo: values.activo },
        });
        useToastStore.success("Procedimiento actualizado");
      } else {
        await create.mutateAsync(body);
        useToastStore.success("Procedimiento creado");
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
          <SheetTitle>{isEdit ? "Editar procedimiento" : "Nuevo procedimiento"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del procedimiento."
              : "Da de alta un procedimiento nuevo del catálogo."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <Form {...form}>
            <form id="procedure-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precioBase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio base *</FormLabel>
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
                  name="duracionMinutos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (min) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={Number.isFinite(field.value) ? field.value : ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? 0 : e.target.valueAsNumber,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="areaCorporal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área corporal *</FormLabel>
                    <FormControl><Input placeholder="Ej. Rostro, Espalda..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Activo</Label>
                      <p className="text-xs text-muted-foreground">
                        Si está inactivo no aparece en selects al crear citas.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button form="procedure-form" type="submit" disabled={isPending}>
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
function DeleteProcedureButton({ procedure }: { procedure: Procedure }) {
  const del = useDeleteProcedure();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(procedure.id);
      useToastStore.success("Procedimiento eliminado", procedure.nombre);
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
          aria-label={`Eliminar ${procedure.nombre}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{procedure.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción marca el procedimiento como eliminado (soft delete).
            Los paquetes y citas existentes que lo referencien se mantienen,
            pero ya no aparecerá en los selects.
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
