// ============================================================
// HomePage.tsx — Landing pública de Nemedi Clinic
//
// Responsabilidad: bienvenida + entry points a las funcionalidades.
//
// EQUIVALENTE A: pages/Home.vue en SINERGIA
// ============================================================

import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/PageContainer";
import { useAuthStore } from "@/stores/auth.store";
import { Users, LayoutDashboard, LogIn } from "lucide-react";

export function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  return (
    <PageContainer>
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Nemedi Clinic</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Sistema de gestión clínica multi-tenant para estéticas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <LayoutDashboard className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              KPIs y resumen operacional de la clínica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">Ir al dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Pacientes</CardTitle>
            <CardDescription>
              Listado, historia clínica y paquetes por paciente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/patients">Ver pacientes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <LogIn className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Autenticación</CardTitle>
            <CardDescription>
              {isAuthenticated
                ? "Ya tienes una sesión activa."
                : "Inicia sesión con tus credenciales del backend Nemedi."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthenticated && (
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Ingresar</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
