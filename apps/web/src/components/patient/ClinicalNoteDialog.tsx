// ============================================================
// ClinicalNoteDialog.tsx — Nueva nota clínica (una sesión) con fotos
//
// Las fotos se suben mientras se llena el formulario (adjuntos pendientes,
// etiquetados Antes / Después) y al guardar la nota viaja solo la lista de ids.
// "Productos usados" es una lista de (producto, cantidad): si la nota es de una
// cita Completada, esas cantidades salen del inventario y la respuesta avisa de
// lo que quedó bajo el mínimo.
// El detalle de la sesión (zona, parámetros, indicaciones, próxima sesión y cómo
// se sintió la paciente) va agrupado al final y es TODO opcional: lo único que
// se exige sigue siendo el procedimiento y las observaciones.
// Si el rol es Esteticista la nota queda a su nombre; Admin/SuperAdmin eligen.
// Se monta solo al abrir: el form nace limpio, sin efectos de reset.
// ============================================================
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/FormDialog";
import { PhotoListUpload } from "@/components/shared/PhotoListUpload";
import { ProductConsumptionField } from "@/components/patient/ProductConsumptionField";
import { useCreateClinicalNote } from "@/api/clinical-records.api";
import { useProcedures } from "@/api/procedures.api";
import { useEsteticistas } from "@/api/users.api";
import { usePermissions } from "@/hooks/use-permissions";
import { useToastStore } from "@/stores/toast.store";

/**
 * Cómo se sintió la paciente, de 1 a 5. Es un grupo de radio para que funcione con el
 * teclado; volver a pulsar el valor elegido lo desmarca (el campo es opcional).
 */
function SatisfactionPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Cómo se sintió la paciente" className="flex h-9 items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} de 5`}
          onClick={() => onChange(value === n ? null : n)}
          className={`h-7 w-7 rounded-full border text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
            value != null && n <= value ? "border-sand bg-sand text-sand-foreground" : "border-input text-muted-foreground hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
      {value != null && (
        <button type="button" onClick={() => onChange(null)} className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
          Quitar
        </button>
      )}
    </div>
  );
}

const noteSchema = z.object({
  esteticistId: z.string().min(1, "Elige quién atendió la sesión"),
  procedimiento: z.string().min(1, "Requerido").max(200),
  observaciones: z.string().min(1, "Describe la sesión").max(4000),
  zonaTratada: z.string().max(150),
  parametros: z.string().max(300),
  indicacionesPost: z.string().max(1000),
  proximaSesionSugerida: z.string(),
  evaluacionPaciente: z.number().int().min(1).max(5).nullable(),
  productos: z
    .array(z.object({ productId: z.string(), cantidad: z.number() }))
    .refine((rows) => rows.every((r) => r.productId !== ""), "Elige el producto de cada línea")
    .refine((rows) => rows.every((r) => r.cantidad > 0), "La cantidad debe ser mayor a cero"),
  fotosAntes: z.array(z.string()),
  fotosDespues: z.array(z.string()),
});
type NoteFormValues = z.infer<typeof noteSchema>;

export interface ClinicalNoteDefaults {
  procedimiento?: string;
  esteticistId?: string;
  /** Cita de la que nace la nota: si era una sesión de paquete, la sesión queda enlazada a la nota. */
  appointmentId?: string;
}

export function ClinicalNoteDialog({
  patientId,
  defaults,
  onClose,
}: {
  patientId: string;
  defaults?: ClinicalNoteDefaults;
  onClose: () => void;
}) {
  const { role, userId } = usePermissions();
  const lockedToSelf = role === "Esteticista";
  const { data: esteticistas } = useEsteticistas();
  const { data: procedures } = useProcedures();
  const createNote = useCreateClinicalNote(patientId);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      esteticistId: lockedToSelf ? (userId ?? "") : (defaults?.esteticistId ?? ""),
      procedimiento: defaults?.procedimiento ?? "",
      observaciones: "",
      zonaTratada: "",
      parametros: "",
      indicacionesPost: "",
      proximaSesionSugerida: "",
      evaluacionPaciente: null,
      productos: [],
      fotosAntes: [],
      fotosDespues: [],
    },
  });
  const procedimiento = useWatch({ control: form.control, name: "procedimiento" });

  const onSubmit = async (values: NoteFormValues) => {
    try {
      const { alertasStock } = await createNote.mutateAsync({
        esteticistId: values.esteticistId,
        procedimiento: values.procedimiento,
        observaciones: values.observaciones,
        zonaTratada: values.zonaTratada.trim() || undefined,
        parametros: values.parametros.trim() || undefined,
        indicacionesPost: values.indicacionesPost.trim() || undefined,
        proximaSesionSugerida: values.proximaSesionSugerida || undefined,
        evaluacionPaciente: values.evaluacionPaciente ?? undefined,
        productos: values.productos,
        appointmentId: defaults?.appointmentId,
        adjuntoIds: [...values.fotosAntes, ...values.fotosDespues],
      });
      useToastStore.success("Nota clínica guardada", values.procedimiento);
      // El descuento pudo dejar algún insumo bajo el mínimo: se avisa en el momento
      for (const alerta of alertasStock) {
        useToastStore.warning(
          `${alerta.nombre} quedó bajo el mínimo`,
          `Quedan ${alerta.stockActual} ${alerta.unidadMedida} (mínimo ${alerta.stockMinimo})`,
        );
      }
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nueva nota clínica"
      description="Registra la sesión y sus fotos de antes y después."
      dirty={form.formState.isDirty}
      className="sm:max-w-2xl"
      actions={
        <Button form="clinical-note-form" type="submit" disabled={createNote.isPending}>
          {createNote.isPending ? "Guardando..." : "Guardar nota"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="clinical-note-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="procedimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimiento *</FormLabel>
                  <Select value={procedimiento} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el procedimiento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {procedures
                        // activos, más el de la cita aunque hoy esté inactivo
                        ?.filter((p) => p.activo || p.nombre === defaults?.procedimiento)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.nombre}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!lockedToSelf && (
              <FormField
                control={form.control}
                name="esteticistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esteticista *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Quién atendió" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {esteticistas?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nombre} {e.apellido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones *</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Estado de la piel, tolerancia, indicaciones…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Productos usados</FormLabel>
                <ProductConsumptionField value={field.value} onChange={field.onChange} disabled={createNote.isPending} />
                <FormMessage />
              </FormItem>
            )}
          />

          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium text-muted-foreground">Detalle de la sesión (opcional)</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="zonaTratada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona tratada</FormLabel>
                    <FormControl>
                      <Input placeholder="Piernas completas, zona T…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parametros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parámetros</FormLabel>
                    <FormControl>
                      <Input placeholder="Intensidad, disparos, tiempo por zona…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="indicacionesPost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indicaciones para la paciente</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Cuidados en casa, qué evitar, cuándo volver…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="proximaSesionSugerida"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próxima sesión sugerida</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evaluacionPaciente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cómo se sintió la paciente</FormLabel>
                    <FormControl>
                      <SatisfactionPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fotosAntes"
              render={({ field }) => (
                <PhotoListUpload label="Antes" kind="Antes" value={field.value} onChange={field.onChange} />
              )}
            />
            <FormField
              control={form.control}
              name="fotosDespues"
              render={({ field }) => (
                <PhotoListUpload label="Después" kind="Despues" value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
