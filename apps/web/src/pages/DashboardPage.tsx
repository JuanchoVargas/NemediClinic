// ============================================================
// DashboardPage.tsx — KPIs principales de la clínica
//
// Placeholder con datos hardcoded.
// TODO: conectar a /api/v1/dashboard cuando exista.
// ============================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/PageContainer";
import { Calendar, Users, DollarSign, AlertCircle } from "lucide-react";

interface Kpi {
  label: string;
  value: string;
  icon: typeof Calendar;
  hint?: string;
}

// TODO: reemplazar por GET /api/v1/dashboard cuando esté
const KPIS: Kpi[] = [
  { label: "Citas hoy", value: "—", icon: Calendar, hint: "Sin endpoint aún" },
  { label: "Pacientes activos", value: "—", icon: Users, hint: "Sin endpoint aún" },
  { label: "Ingresos del mes", value: "—", icon: DollarSign, hint: "Sin endpoint aún" },
  { label: "Paquetes por vencer", value: "—", icon: AlertCircle, hint: "Sin endpoint aún" },
];

export function DashboardPage() {
  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen operacional de la clínica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {KPIS.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
