// ============================================================
// PatientFormPage.tsx — Crear / editar paciente
//
// Modos:
//   - Crear: /patients/new          (sin :id en params)
//   - Editar: /patients/$id/edit    (con :id en params)
//
// Patrón: React Hook Form + Zod, useCreatePatient o useUpdatePatient
// según el modo. Al guardar redirige al detalle.
//
// EQUIVALENTE A: pages/auth/login.vue de SIRECEC pero con CRUD
// PATTERNS.md sección: "HTTP / Server state"
// ============================================================

import { useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/shared/PageContainer";
import {
  useCreatePatient,
  usePatient,
  useUpdatePatient,
} from "@/api/patients.api";
import { useToastStore } from "@/stores/toast.store";

const patientSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  apellido: z.string().min(1, "Requerido"),
  cedula: z.string().min(1, "Requerido"),
  telefono: z.string().min(1, "Requerido"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  fechaNacimiento: z.string().optional().or(z.literal("")),
  notasGenerales: z.string().optional().or(z.literal("")),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const EMPTY_FORM: PatientFormValues = {
  nombre: "",
  apellido: "",
  cedula: "",
  telefono: "",
  email: "",
  fechaNacimiento: "",
  notasGenerales: "",
};

export function PatientFormPage() {
  const navigate = useNavigate();
  // strict:false porque la misma página sirve a /new (sin id) y /$id/edit (con id)
  const params = useParams({ strict: false }) as { id?: string };
  const isEdit = !!params.id;

  const { data: existing, isLoading: isLoadingPatient } = usePatient(
    isEdit ? params.id : undefined,
  );
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: EMPTY_FORM,
  });

  // Pre-llena el form cuando el patient existente carga (modo edit)
  useEffect(() => {
    if (existing) {
      form.reset({
        nombre: existing.nombre,
        apellido: existing.apellido,
        cedula: existing.cedula,
        telefono: existing.telefono,
        email: existing.email ?? "",
        fechaNacimiento: existing.fechaNacimiento
          ? existing.fechaNacimiento.slice(0, 10) // ISO → YYYY-MM-DD
          : "",
        notasGenerales: existing.notasGenerales ?? "",
      });
    }
  }, [existing, form]);

  const onSubmit = async (values: PatientFormValues) => {
    // Normaliza strings vacíos a undefined antes de mandar al backend
    const body = {
      nombre: values.nombre,
      apellido: values.apellido,
      cedula: values.cedula,
      telefono: values.telefono,
      email: values.email || undefined,
      fechaNacimiento: values.fechaNacimiento || undefined,
      notasGenerales: values.notasGenerales || undefined,
    };

    try {
      if (isEdit && params.id) {
        await updateMutation.mutateAsync({ id: params.id, body });
        useToastStore.success("Paciente actualizado");
        navigate({ to: "/patients/$id", params: { id: params.id } });
      } else {
        const created = await createMutation.mutateAsync(body);
        useToastStore.success("Paciente creado");
        navigate({ to: "/patients/$id", params: { id: created.id } });
      }
    } catch {
      // El queryClient ya disparó el toast con el mensaje del backend.
    }
  };

  if (isEdit && isLoadingPatient) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full max-w-2xl" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEdit ? "Editar paciente" : "Nuevo paciente"}
            </CardTitle>
            <CardDescription>
              {isEdit
                ? "Modifica los datos del paciente. Los campos vacíos no se actualizan."
                : "Completa los datos básicos. La historia clínica se crea automáticamente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormLabel>Apellido *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cedula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cédula *</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fechaNacimiento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de nacimiento</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notasGenerales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas generales</FormLabel>
                      <FormControl>
                        <textarea
                          rows={4}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: "/patients" })}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Guardando..."
                      : isEdit
                        ? "Guardar cambios"
                        : "Crear paciente"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
