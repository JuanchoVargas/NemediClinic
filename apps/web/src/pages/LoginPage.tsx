// ============================================================
// LoginPage.tsx — Formulario de autenticación
//
// Responsabilidad: form con React Hook Form + Zod, dispara useLogin
// mutation, guarda sesión, redirige al destino o a /.
//
// "EJEMPLO DE ORO" de: form + validación + mutation + redirect.
// Cuando construyas otros forms (registro, checkout, etc.), copia
// esta estructura.
//
// EQUIVALENTE A: pages/auth/login.vue en SIRECEC
// ============================================================

import { useNavigate, useSearch } from "@tanstack/react-router";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageContainer } from "@/components/shared/PageContainer";
import { useLogin } from "@/api/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

// Schema de validación con Zod
// EQUIVALENTE A: [Required] [StringLength] [EmailAddress] en .NET
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" }) as { redirect?: string };
  const setSession = useAuthStore((s) => s.setSession);
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await loginMutation.mutateAsync(values);
      setSession(result.token, result.user);
      useToastStore.success("Bienvenido", `Sesión iniciada como ${result.user.email}`);
      navigate({ to: search.redirect ?? "/dashboard" });
    } catch {
      // El queryClient global ya disparó el toast.
      // Aquí solo aprovechamos para resaltar el campo password.
      form.setError("password", { message: "Credenciales inválidas" });
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa con tus credenciales del backend Nemedi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="tu@email.com"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Mínimo 6 caracteres</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
