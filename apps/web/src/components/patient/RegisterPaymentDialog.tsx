// ============================================================
// RegisterPaymentDialog.tsx — "Registrar pago" de un paquete asignado
//
// Monto (prellenado con el saldo y con tope en el saldo: lo valida Zod aquí y
// el backend responde 422 si alguien se lo salta), fecha, método, referencia
// y comprobante opcional (imagen o PDF, subido como adjunto pendiente).
//
// Se monta solo mientras está abierto ({open && <RegisterPaymentDialog/>}):
// los defaultValues salen de las props, sin efectos de reset.
// ============================================================
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentUpload } from "@/components/shared/DocumentUpload";
import { FormDialog } from "@/components/shared/FormDialog";
import { useRegisterPayment } from "@/api/patient-packages.api";
import { toLocalDate } from "@/lib/dates";
import { formatCOP } from "@/lib/format-cop";
import { useToastStore } from "@/stores/toast.store";

const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"] as const;

function buildSchema(saldo: number) {
  return z.object({
    monto: z
      .number({ message: "Escribe el monto" })
      .positive("El monto debe ser mayor a 0")
      .max(saldo, `El pago supera el saldo pendiente (${formatCOP(saldo)})`),
    fechaPago: z.string().min(1, "Requerido"),
    metodoPago: z.enum(METODOS_PAGO),
    referencia: z.string().max(100, "Máximo 100 caracteres"),
    observacion: z.string().max(500, "Máximo 500 caracteres"),
    comprobanteId: z.string().nullable(),
  });
}

type PaymentFormValues = z.infer<ReturnType<typeof buildSchema>>;

interface RegisterPaymentDialogProps {
  packageId: string;
  packageNombre: string;
  saldoPendiente: number;
  onClose: () => void;
}

export function RegisterPaymentDialog({ packageId, packageNombre, saldoPendiente, onClose }: RegisterPaymentDialogProps) {
  const register = useRegisterPayment(packageId);
  const schema = useMemo(() => buildSchema(saldoPendiente), [saldoPendiente]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      monto: saldoPendiente,
      fechaPago: toLocalDate(new Date()),
      metodoPago: "Efectivo",
      referencia: "",
      observacion: "",
      comprobanteId: null,
    },
  });

  const metodo = useWatch({ control: form.control, name: "metodoPago" });

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      await register.mutateAsync({
        monto: values.monto,
        fechaPago: values.fechaPago,
        metodoPago: values.metodoPago,
        referencia: values.referencia.trim() || undefined,
        observacion: values.observacion.trim() || undefined,
        comprobanteId: values.comprobanteId ?? undefined,
      });
      useToastStore.success("Pago registrado");
      onClose();
    } catch {
      // toast global (incluye el 422 del backend si el saldo cambió mientras tanto)
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={<>Registrar pago</>}
      description={<>{packageNombre} · saldo pendiente {formatCOP(saldoPendiente)}.</>}
      dirty={form.formState.isDirty}
      actions={
        <Button form="payment-form" type="submit" disabled={register.isPending}>
          {register.isPending ? "Guardando..." : "Registrar pago"}
        </Button>
      }
    >
      <div className="pt-1">
        <Form {...form}>
          <form id="payment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto *</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} placeholder="0" />
                  </FormControl>
                  <FormDescription>Máximo {formatCOP(saldoPendiente)} (el saldo pendiente).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fechaPago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de pago *</FormLabel>
                    <FormControl>
                      <Input type="date" max={toLocalDate(new Date())} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metodoPago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METODOS_PAGO.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={metodo === "Transferencia" ? "Número de la transferencia" : metodo === "Tarjeta" ? "Número del voucher" : "Número de recibo (opcional)"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comprobanteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprobante</FormLabel>
                  <DocumentUpload
                    entityType="Payment"
                    kind="Comprobante"
                    value={field.value}
                    onChange={field.onChange}
                    label="Adjuntar comprobante (opcional)"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observación</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </FormDialog>
  );
}
