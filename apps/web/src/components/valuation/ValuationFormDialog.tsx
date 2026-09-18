// ============================================================
// ValuationFormDialog.tsx — Crear / editar una valoración
//
// La persona valorada es un paciente existente (PatientCombobox) o un prospecto
// (nombre y teléfono, sin cédula). El tratamiento sugerido es un paquete del
// catálogo y/o procedimientos sueltos. Las fotos (Kind Antes) se suben como
// adjuntos pendientes y viajan como ids. Se monta solo al abrir.
// ============================================================
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/FormDialog";
import { PatientCombobox } from "@/components/shared/PatientCombobox";
import { PhotoListUpload } from "@/components/shared/PhotoListUpload";
import { usePackages } from "@/api/packages.api";
import { useProcedures } from "@/api/procedures.api";
import { useEsteticistas } from "@/api/users.api";
import { useSaveValuation } from "@/api/valuations.api";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast.store";
import type { PatientSummary } from "@/types/patient";
import type { Valuation } from "@/types/valuation";

const NO_PACKAGE = "none";

const schema = z.object({
  prospectoNombre: z.string().max(200),
  prospectoTelefono: z.string().max(50),
  esteticistId: z.string().min(1, "Elige quién hizo la valoración"),
  diagnostico: z.string().min(1, "Describe el diagnóstico").max(4000),
  tratamientoSugerido: z.string().max(2000),
  packageId: z.string(),
  procedureIds: z.array(z.string()),
  precioCotizado: z.number().min(0),
  fotos: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

export function ValuationFormDialog({ editing, onClose }: { editing?: Valuation; onClose: () => void }) {
  const { can, role, userId } = usePermissions();
  const lockedToSelf = role === "Esteticista";
  const save = useSaveValuation();
  const { data: esteticistas } = useEsteticistas();
  const { data: procedures } = useProcedures();
  // Los paquetes solo los puede leer Admin/SuperAdmin: la esteticista sugiere procedimientos
  const canReadPackages = can("packages.read");
  const { data: packages } = usePackages(1, 100, undefined, canReadPackages);

  // Paciente existente vs. prospecto: fuera de RHF porque el combobox maneja un objeto, no un id
  const [mode, setMode] = useState<"patient" | "prospect">(editing?.esProspecto === false || !editing ? "patient" : "prospect");
  const [patient, setPatient] = useState<PatientSummary | null>(
    editing?.patientId
      ? { id: editing.patientId, nombre: editing.nombre, apellido: "", cedula: "", telefono: editing.telefono }
      : null,
  );
  const [personError, setPersonError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      prospectoNombre: editing?.esProspecto ? editing.nombre : "",
      prospectoTelefono: editing?.esProspecto ? editing.telefono : "",
      esteticistId: editing?.esteticistId ?? (lockedToSelf ? (userId ?? "") : ""),
      diagnostico: editing?.diagnostico ?? "",
      tratamientoSugerido: editing?.tratamientoSugerido ?? "",
      packageId: editing?.packageId ?? NO_PACKAGE,
      procedureIds: editing?.procedimientos.map((p) => p.id) ?? [],
      precioCotizado: editing?.precioCotizado ?? 0,
      fotos: editing?.fotos.map((f) => f.id) ?? [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (mode === "patient" && !patient) return setPersonError("Elige un paciente");
    if (mode === "prospect" && (!values.prospectoNombre.trim() || !values.prospectoTelefono.trim()))
      return setPersonError("Escribe el nombre y el teléfono del prospecto");
    setPersonError(null);

    try {
      await save.mutateAsync({
        id: editing?.id,
        body: {
          patientId: mode === "patient" ? patient?.id : null,
          prospectoNombre: mode === "prospect" ? values.prospectoNombre : undefined,
          prospectoTelefono: mode === "prospect" ? values.prospectoTelefono : undefined,
          esteticistId: values.esteticistId,
          diagnostico: values.diagnostico,
          tratamientoSugerido: values.tratamientoSugerido || undefined,
          packageId: values.packageId === NO_PACKAGE ? null : values.packageId,
          procedureIds: values.procedureIds,
          precioCotizado: values.precioCotizado,
          adjuntoIds: values.fotos,
        },
      });
      useToastStore.success(editing ? "Valoración actualizada" : "Valoración registrada");
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={editing ? "Editar valoración" : "Nueva valoración"}
      description="Diagnóstico, tratamiento sugerido y precio cotizado."
      dirty={form.formState.isDirty || !!patient !== !!editing?.patientId}
      className="sm:max-w-2xl"
      actions={
        <Button form="valuation-form" type="submit" disabled={save.isPending}>
          {save.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Registrar valoración"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="valuation-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* ── Persona ── */}
          <div className="space-y-3 rounded-lg border p-3">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "patient" | "prospect"); setPersonError(null); }}>
              <TabsList>
                <TabsTrigger value="patient">Ya es paciente</TabsTrigger>
                <TabsTrigger value="prospect">Prospecto</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "patient" ? (
              <PatientCombobox value={patient} onChange={setPatient} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="prospectoNombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prospectoTelefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono *</FormLabel>
                      <FormControl><Input inputMode="tel" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Sin cédula todavía: se pide al convertirlo en paciente.
                </p>
              </div>
            )}
            {personError && <p className="text-sm text-destructive" role="alert">{personError}</p>}
          </div>

          {!lockedToSelf && (
            <FormField
              control={form.control}
              name="esteticistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Esteticista *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Quién hizo la valoración" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {esteticistas?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="diagnostico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diagnóstico *</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Estado de la piel, zonas a tratar, expectativas…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Tratamiento sugerido ── */}
          {canReadPackages && (
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paquete sugerido</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // El precio del catálogo es el punto de partida de la cotización
                      const pkg = packages?.items.find((p) => p.id === value);
                      if (pkg && form.getValues("precioCotizado") === 0) form.setValue("precioCotizado", pkg.precioTotal);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PACKAGE}>Sin paquete (solo procedimientos)</SelectItem>
                      {packages?.items.filter((p) => p.activo || p.id === editing?.packageId).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Es el que se asigna al paciente al convertir la valoración.</FormDescription>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="procedureIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Procedimientos sugeridos</FormLabel>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Procedimientos sugeridos">
                  {procedures?.filter((p) => p.activo || field.value.includes(p.id)).map((p) => {
                    const selected = field.value.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => field.onChange(selected ? field.value.filter((id) => id !== p.id) : [...field.value, p.id])}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                        )}
                      >
                        {p.nombre}
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="precioCotizado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio cotizado</FormLabel>
                  <FormControl><CurrencyInput value={field.value} onChange={field.onChange} placeholder="0" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tratamientoSugerido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas del tratamiento</FormLabel>
                  <FormControl><Input placeholder="Frecuencia, cuidados, observaciones" {...field} /></FormControl>
                </FormItem>
              )}
            />
          </div>

          <div>
            <Label className="sr-only">Fotos</Label>
            <FormField
              control={form.control}
              name="fotos"
              render={({ field }) => (
                <PhotoListUpload label="Fotos de la valoración" kind="Antes" entityType="Valuation" value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
