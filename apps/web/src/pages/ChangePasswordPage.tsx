// ============================================================
// ChangePasswordPage.tsx — Cambiar la contraseña (/change-password)
//
// Dos usos: voluntario (menú de usuario) y OBLIGATORIO cuando el login devuelve
// mustChangePassword (usuario recién creado o con la clave restablecida). En el
// segundo caso el guard del router no deja salir de aquí y la API responde 403
// a todo lo que no sea /auth/*. Al cambiarla, el backend devuelve una sesión
// nueva que reemplaza a la anterior.
// ============================================================
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/shared/PageContainer";
import { useChangePassword } from "@/api/auth.api";
import { PLATFORM_ADMIN } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

// Misma regla que PasswordPolicy en el backend: mínimo 8, con letra y número
const schema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/\p{L}/u, "Debe incluir al menos una letra")
      .regex(/\d/, "Debe incluir al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Las contraseñas no coinciden" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Debe ser distinta de la actual" });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const changePassword = useChangePassword();
  const forced = !!user?.mustChangePassword;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const session = await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSession(session.token, session.user);
      useToastStore.success("Contraseña actualizada");
      navigate({ to: session.user.role === PLATFORM_ADMIN ? "/platform" : "/dashboard" });
    } catch {
      // toast global (p. ej. "La contraseña actual no es correcta.")
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" aria-hidden />
            </span>
            <CardTitle className="text-2xl">{forced ? "Crea tu contraseña" : "Cambiar contraseña"}</CardTitle>
            <CardDescription>
              {forced
                ? "Ingresaste con una contraseña temporal. Por seguridad debes cambiarla antes de continuar."
                : "Al cambiarla se cierran las demás sesiones abiertas con tu cuenta."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{forced ? "Contraseña temporal" : "Contraseña actual"}</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña nueva</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormDescription>Mínimo 8 caracteres, con al menos una letra y un número.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repite la contraseña nueva</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                  {changePassword.isPending ? "Guardando..." : "Guardar contraseña"}
                </Button>
                {forced && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      clearSession();
                      navigate({ to: "/login" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Salir
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
