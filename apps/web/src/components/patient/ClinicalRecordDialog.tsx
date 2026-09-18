// ============================================================
// ClinicalRecordDialog.tsx — Editar el resumen clínico del paciente
//
// Antecedentes, alergias, medicamentos y observaciones generales
// (PUT /patients/{id}/clinical-record). Se monta solo al abrir: los valores
// iniciales salen de props, sin efectos de reset.
// ============================================================
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/FormDialog";
import { useUpdateClinicalRecord } from "@/api/clinical-records.api";
import { useToastStore } from "@/stores/toast.store";
import type { ClinicalRecord } from "@/types/clinical-record";

const recordSchema = z.object({
  antecedentesMedicos: z.string().max(2000),
  alergias: z.string().max(2000),
  medicamentosActuales: z.string().max(2000),
  observacionesGenerales: z.string().max(2000),
});
type RecordFormValues = z.infer<typeof recordSchema>;

const FIELDS: { name: keyof RecordFormValues; label: string; placeholder: string; hint?: string }[] = [
  { name: "antecedentesMedicos", label: "Antecedentes médicos", placeholder: "Enfermedades, cirugías, embarazo, condiciones de la piel…" },
  { name: "alergias", label: "Alergias", placeholder: "Medicamentos, látex, componentes cosméticos…", hint: "Se revisa antes de cada procedimiento." },
  { name: "medicamentosActuales", label: "Medicamentos actuales", placeholder: "Nombre y dosis" },
  { name: "observacionesGenerales", label: "Observaciones", placeholder: "Cualquier dato útil para la atención" },
];

export function ClinicalRecordDialog({
  patientId,
  record,
  onClose,
}: {
  patientId: string;
  record: ClinicalRecord;
  onClose: () => void;
}) {
  const update = useUpdateClinicalRecord(patientId);

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      antecedentesMedicos: record.antecedentesMedicos ?? "",
      alergias: record.alergias ?? "",
      medicamentosActuales: record.medicamentosActuales ?? "",
      observacionesGenerales: record.observacionesGenerales ?? "",
    },
  });

  const onSubmit = async (values: RecordFormValues) => {
    try {
      await update.mutateAsync(values);
      useToastStore.success("Historia clínica actualizada");
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Editar resumen clínico"
      description="Antecedentes y alergias del paciente. Deja un campo vacío si no aplica."
      dirty={form.formState.isDirty}
      className="sm:max-w-xl"
      actions={
        <Button form="clinical-record-form" type="submit" disabled={update.isPending}>
          {update.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="clinical-record-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {FIELDS.map(({ name, label, placeholder, hint }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={placeholder} {...field} />
                  </FormControl>
                  {hint && <FormDescription>{hint}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </form>
      </Form>
    </FormDialog>
  );
}
