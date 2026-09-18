// ============================================================
// ClinicalNoteDialog.tsx — Nueva nota clínica (una sesión) con fotos
//
// Las fotos se suben mientras se llena el formulario (adjuntos pendientes,
// etiquetados Antes / Después) y al guardar la nota viaja solo la lista de ids.
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/FormDialog";
import { PhotoListUpload } from "@/components/shared/PhotoListUpload";
import { useCreateClinicalNote } from "@/api/clinical-records.api";
import { useProcedures } from "@/api/procedures.api";
import { useEsteticistas } from "@/api/users.api";
import { usePermissions } from "@/hooks/use-permissions";
import { useToastStore } from "@/stores/toast.store";

const noteSchema = z.object({
  esteticistId: z.string().min(1, "Elige quién atendió la sesión"),
  procedimiento: z.string().min(1, "Requerido").max(200),
  observaciones: z.string().min(1, "Describe la sesión").max(4000),
  productosUsados: z.string().max(500),
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
      productosUsados: "",
      fotosAntes: [],
      fotosDespues: [],
    },
  });
  const procedimiento = useWatch({ control: form.control, name: "procedimiento" });

  const onSubmit = async (values: NoteFormValues) => {
    try {
      await createNote.mutateAsync({
        esteticistId: values.esteticistId,
        procedimiento: values.procedimiento,
        observaciones: values.observaciones,
        productosUsados: values.productosUsados || undefined,
        appointmentId: defaults?.appointmentId,
        adjuntoIds: [...values.fotosAntes, ...values.fotosDespues],
      });
      useToastStore.success("Nota clínica guardada", values.procedimiento);
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
            name="productosUsados"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Productos usados</FormLabel>
                <FormControl>
                  <Input placeholder="Separados por coma" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
