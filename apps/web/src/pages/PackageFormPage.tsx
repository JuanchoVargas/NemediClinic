// ============================================================
// PackageFormPage.tsx — Crear / editar paquete
//
// Modos:
//   - Crear:  /packages/new          (sin :id en params)
//   - Editar: /packages/$id/edit     (con :id en params)
//
// Flujo de procedures:
//   - En crear: array local. Al submit useCreatePackage orquesta
//     POST /packages + N POST /packages/{id}/procedures.
//   - En editar: los procedures existentes (saved=true) se muestran
//     read-only — el backend NO tiene DELETE para PackageProcedure.
//     Los nuevos agregados en esta sesión (saved=false) son removibles
//     y se persisten al submit.
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/PageContainer";

import {
  useAddProcedureToPackage,
  useCreatePackage,
  usePackage,
  useUpdatePackage,
} from "@/api/packages.api";
import { useProcedures } from "@/api/procedures.api";
import { useToastStore } from "@/stores/toast.store";
import { cn } from "@/lib/utils";
import type { Procedure } from "@/types/procedure";

// Validaciones numéricas vía HTML input attrs (min/step) + manejo en
// onSubmit. Zod 4 cambia la INPUT type a `unknown` cuando se encadenan
// refinements numéricos, lo que rompe la inferencia de useForm.
const packageSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  descripcion: z.string().optional().or(z.literal("")),
  precioTotal: z.number(),
  sesionesTotales: z.number(),
  vigenciaDias: z.number(),
  diasAlertaVencimiento: z.number(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const EMPTY_FORM: PackageFormValues = {
  nombre: "",
  descripcion: "",
  precioTotal: 0,
  sesionesTotales: 1,
  vigenciaDias: 90,
  diasAlertaVencimiento: 15,
};

interface DraftProcedure {
  /** true = ya existe en backend; no removible en edit. */
  saved: boolean;
  procedureId: string;
  procedureNombre: string;
  cantidadSesiones: number;
}

export function PackageFormPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string };
  const isEdit = !!params.id;

  const { data: existing, isLoading } = usePackage(isEdit ? params.id : undefined);
  const create = useCreatePackage();
  const update = useUpdatePackage();
  const addProcedure = useAddProcedureToPackage(params.id ?? "");
  const isSubmitting = create.isPending || update.isPending || addProcedure.isPending;

  const [drafts, setDrafts] = useState<DraftProcedure[]>([]);
  // En edit mode arranca true (no auto-sobreescribir el precio guardado).
  // En create mode arranca false hasta que el usuario tipea en el campo.
  const [manualPrecio, setManualPrecio] = useState(false);

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: EMPTY_FORM,
  });

  // Sincroniza el estado local con el paquete cargado UNA vez por id (patrón
  // "ajustar estado durante el render", sin setState dentro de useEffect).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (existing && existing.id !== loadedId) {
    setLoadedId(existing.id);
    setDrafts(
      (existing.procedimientos ?? []).map((p) => ({
        saved: true,
        procedureId: p.procedureId,
        procedureNombre: p.procedureNombre,
        cantidadSesiones: p.cantidadSesiones,
      })),
    );
    setManualPrecio(true);
  }

  useEffect(() => {
    if (existing) {
      form.reset({
        nombre: existing.nombre,
        descripcion: existing.descripcion ?? "",
        precioTotal: existing.precioTotal,
        sesionesTotales: existing.sesionesTotales,
        vigenciaDias: existing.vigenciaDias,
        diasAlertaVencimiento: existing.diasAlertaVencimiento,
      });
    }
  }, [existing, form]);

  const { data: procedures } = useProcedures();

  const sumaSesionesProcedimientos = drafts.reduce((s, d) => s + d.cantidadSesiones, 0);

  // Precio sugerido = Σ (precioBase del procedure × cantidadSesiones del draft).
  // Resuelve precioBase desde useProcedures() — sirve también en edit mode,
  // donde los drafts cargados desde backend no traen precioBase.
  const precioSugerido = drafts.reduce((sum, d) => {
    const proc = procedures?.find((p) => p.id === d.procedureId);
    return sum + (proc?.precioBase ?? 0) * d.cantidadSesiones;
  }, 0);

  // Auto-llenar precioTotal con la referencia mientras el usuario no
  // haya tipeado un valor propio.
  useEffect(() => {
    if (!manualPrecio && precioSugerido > 0) {
      form.setValue("precioTotal", precioSugerido);
    }
  }, [precioSugerido, manualPrecio, form]);

  // sesionesTotales es derivado — siempre = suma de procedimientos.
  useEffect(() => {
    form.setValue("sesionesTotales", sumaSesionesProcedimientos);
  }, [sumaSesionesProcedimientos, form]);

  // useWatch (no form.watch): compatible con el compilador de React
  const precioForm = useWatch({ control: form.control, name: "precioTotal" });
  const descuento = precioSugerido - precioForm;
  const descuentoPct =
    precioSugerido > 0 ? Math.round((descuento / precioSugerido) * 100) : 0;

  const handleAddDraft = (p: Procedure, cantidad: number) => {
    if (drafts.some((d) => d.procedureId === p.id)) {
      useToastStore.error("Ese procedimiento ya está en el paquete");
      return;
    }
    setDrafts((curr) => [
      ...curr,
      {
        saved: false,
        procedureId: p.id,
        procedureNombre: p.nombre,
        cantidadSesiones: cantidad,
      },
    ]);
  };

  const handleRemoveDraft = (procedureId: string) => {
    setDrafts((curr) => curr.filter((d) => d.procedureId !== procedureId));
  };

  const onSubmit = async (values: PackageFormValues) => {
    const base = {
      nombre: values.nombre,
      descripcion: values.descripcion || "",
      precioTotal: values.precioTotal,
      sesionesTotales: values.sesionesTotales,
      vigenciaDias: values.vigenciaDias,
      diasAlertaVencimiento: values.diasAlertaVencimiento,
    };

    try {
      if (isEdit && params.id) {
        // 1. actualizar el paquete
        await update.mutateAsync({ id: params.id, body: base });
        // 2. agregar procedures nuevos (no saved)
        const nuevos = drafts.filter((d) => !d.saved);
        for (const d of nuevos) {
          await addProcedure.mutateAsync({
            procedureId: d.procedureId,
            cantidadSesiones: d.cantidadSesiones,
          });
        }
        useToastStore.success("Paquete actualizado");
        navigate({ to: "/packages/$id", params: { id: params.id } });
      } else {
        const created = await create.mutateAsync({
          ...base,
          procedures: drafts.map((d) => ({
            procedureId: d.procedureId,
            cantidadSesiones: d.cantidadSesiones,
          })),
        });
        useToastStore.success("Paquete creado");
        navigate({ to: "/packages/$id", params: { id: created.id } });
      }
    } catch {
      // toast global
    }
  };

  if (isEdit && isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full max-w-3xl" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6">
        <Form {...form}>
          <form
            id="package-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* ── Sección 1: Información básica ───────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {isEdit ? "Editar paquete" : "Nuevo paquete"}
                </CardTitle>
                <CardDescription>Información básica del paquete.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            {/* ── Sección 2: Procedimientos del paquete ──── */}
            <Card>
              <CardHeader>
                <CardTitle>Procedimientos del paquete</CardTitle>
                <CardDescription>
                  Agregá los procedimientos incluidos. Las sesiones totales y el
                  precio de referencia se calculan automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProcedurePicker
                  excludeIds={drafts.map((d) => d.procedureId)}
                  onAdd={handleAddDraft}
                />

                {drafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Aún no agregaste procedimientos al paquete.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y rounded-md border">
                      {drafts.map((d) => {
                        const proc = procedures?.find((p) => p.id === d.procedureId);
                        const precioUnit = proc?.precioBase ?? 0;
                        const subtotal = precioUnit * d.cantidadSesiones;
                        return (
                          <li
                            key={d.procedureId}
                            className="p-3 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2">
                                {d.procedureNombre}
                                {d.saved && <Badge variant="outline">Guardado</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {d.cantidadSesiones} sesion
                                {d.cantidadSesiones === 1 ? "" : "es"}
                                {" · $"}
                                {precioUnit.toLocaleString("es-CO")} c/u
                                {" · Subtotal: $"}
                                {subtotal.toLocaleString("es-CO")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDraft(d.procedureId)}
                              disabled={d.saved}
                              aria-label={`Quitar ${d.procedureNombre}`}
                              title={
                                d.saved
                                  ? "Los procedimientos ya guardados no pueden eliminarse desde la UI"
                                  : "Quitar"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center justify-between">
                      <span>
                        Total de sesiones:{" "}
                        <strong>{sumaSesionesProcedimientos}</strong>
                      </span>
                      <span>
                        Precio de referencia:{" "}
                        <strong>${precioSugerido.toLocaleString("es-CO")}</strong>
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Sección 3: Precio y condiciones ─────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Precio y condiciones</CardTitle>
                <CardDescription>
                  Precio final, vigencia y alertas de vencimiento.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="precioTotal"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Precio del paquete *</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            setManualPrecio(true);
                          }}
                          placeholder="0"
                        />
                      </FormControl>
                      {precioSugerido > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Precio de referencia: $
                          {precioSugerido.toLocaleString("es-CO")}
                        </p>
                      )}
                      {precioSugerido > 0 && precioForm < precioSugerido && (
                        <p
                          className={cn(
                            "text-xs mt-1 rounded-md px-2 py-1 inline-block",
                            "bg-sand-soft text-sand-foreground dark:text-sand",
                          )}
                        >
                          Este paquete tiene un descuento de $
                          {descuento.toLocaleString("es-CO")} ({descuentoPct}%)
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Sesiones totales</FormLabel>
                  <div className="flex items-center gap-2 h-8">
                    <Badge variant="secondary" className="text-sm">
                      {sumaSesionesProcedimientos}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Calculado desde los procedimientos
                    </span>
                  </div>
                </FormItem>

                <FormField
                  control={form.control}
                  name="vigenciaDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vigencia (días) *</FormLabel>
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
                <FormField
                  control={form.control}
                  name="diasAlertaVencimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días alerta vencimiento *</FormLabel>
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
              </CardContent>
            </Card>

            {/* ── Acciones ──────────────────────────────── */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/packages" })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Guardando..."
                  : isEdit
                    ? "Guardar cambios"
                    : "Crear paquete"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Picker para agregar un procedimiento + cantidad
// ────────────────────────────────────────────────────────────
function ProcedurePicker({
  excludeIds,
  onAdd,
}: {
  excludeIds: string[];
  onAdd: (p: Procedure, cantidad: number) => void;
}) {
  const { data: procedures } = useProcedures();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Procedure | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);

  const available = (procedures ?? []).filter(
    (p) => p.activo && !excludeIds.includes(p.id),
  );

  const handleAdd = () => {
    if (!selected || cantidad < 1) return;
    onAdd(selected, cantidad);
    setSelected(null);
    setCantidad(1);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label>Procedimiento</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            >
              {selected ? selected.nombre : (
                <span className="text-muted-foreground">Buscar procedimiento...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Buscar..." />
              <CommandList>
                <CommandEmpty>Sin resultados.</CommandEmpty>
                <CommandGroup>
                  {available.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.nombre} ${p.areaCorporal}`}
                      onSelect={() => {
                        setSelected(p);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected?.id === p.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{p.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.areaCorporal} · {p.duracionMinutos} min
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

      <div className="space-y-1.5">
        <Label>Sesiones</Label>
        <Input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
        />
      </div>

      <Button type="button" onClick={handleAdd} disabled={!selected || cantidad < 1}>
        <Plus className="mr-1 h-4 w-4" />
        Agregar
      </Button>
    </div>
  );
}
