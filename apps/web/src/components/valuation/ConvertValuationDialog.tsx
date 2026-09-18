// ============================================================
// ConvertValuationDialog.tsx — "Convertir": la persona aceptó
//
// Si era prospecto pide lo que falta para crearlo como paciente (cédula,
// nombre y apellido). Asigna el paquete sugerido (o el que se elija aquí) con
// el precio acordado, y lleva a la ficha del paciente.
// ============================================================
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { usePackages } from "@/api/packages.api";
import { useConvertValuation } from "@/api/valuations.api";
import { useToastStore } from "@/stores/toast.store";
import type { Valuation } from "@/types/valuation";

const NO_PACKAGE = "none";

const schema = z.object({
  nombre: z.string().max(100),
  apellido: z.string().max(100),
  cedula: z.string().max(20),
  packageId: z.string(),
  precioAcordado: z.number().min(0),
});
type FormValues = z.infer<typeof schema>;

export function ConvertValuationDialog({ valuation, onClose }: { valuation: Valuation; onClose: () => void }) {
  const navigate = useNavigate();
  const convert = useConvertValuation();
  const { data: packages } = usePackages(1, 100);

  const [firstName, ...rest] = valuation.nombre.split(" ");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: firstName ?? "",
      apellido: rest.join(" "),
      cedula: "",
      packageId: valuation.packageId ?? NO_PACKAGE,
      precioAcordado: valuation.precioCotizado,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (valuation.esProspecto && !values.cedula.trim()) {
      form.setError("cedula", { message: "La cédula es obligatoria para crear el paciente" });
      return;
    }
    try {
      const result = await convert.mutateAsync({
        id: valuation.id,
        body: {
          nombre: valuation.esProspecto ? values.nombre : undefined,
          apellido: valuation.esProspecto ? values.apellido : undefined,
          cedula: valuation.esProspecto ? values.cedula : undefined,
          packageId: values.packageId === NO_PACKAGE ? null : values.packageId,
          precioAcordado: values.precioAcordado,
        },
      });
      useToastStore.success(
        "Valoración convertida",
        result.pacienteCreado ? "Se creó el paciente y se asignó el paquete" : "Paquete asignado al paciente",
      );
      onClose();
      navigate({ to: "/patients/$id", params: { id: result.patientId } });
    } catch {
      // toast global (p. ej. cédula ya registrada)
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Convertir · ${valuation.nombre}`}
      description={
        valuation.esProspecto
          ? "Aceptó el tratamiento: completa sus datos para crearlo como paciente y asignarle el paquete."
          : "Aceptó el tratamiento: se le asigna el paquete con el precio acordado."
      }
      dirty={form.formState.isDirty}
      actions={
        <Button form="convert-valuation-form" type="submit" disabled={convert.isPending}>
          {convert.isPending ? "Convirtiendo..." : "Convertir"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="convert-valuation-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {valuation.esProspecto && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="cedula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula *</FormLabel>
                    <FormControl><Input inputMode="numeric" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="packageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paquete a asignar</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PACKAGE}>Ninguno (solo registrar que aceptó)</SelectItem>
                    {packages?.items.filter((p) => p.activo || p.id === valuation.packageId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Las sesiones del paquete se generan al convertir.</FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="precioAcordado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio acordado</FormLabel>
                <FormControl><CurrencyInput value={field.value} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}
