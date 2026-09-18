// ============================================================
// ConsumptionSummary.tsx — Consumo de cabina acumulado del paciente
//
// Suma por producto todo lo gastado en sus sesiones (GET /patients/{id}/consumption).
// Sirve para costear un tratamiento: cuánta ampolla, cuánto gel lleva encima.
// Si el paciente no tiene consumo registrado, no se pinta nada.
// ============================================================
import { PackageSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatientConsumption } from "@/api/clinical-records.api";

export function ConsumptionSummary({ patientId }: { patientId: string }) {
  const { data } = usePatientConsumption(patientId);

  if (!data || data.length === 0) return null;

  // Un mismo producto puede repetirse en varias sesiones: se acumula por producto
  const totales = new Map<string, { producto: string; unidadMedida: string; cantidad: number; sesiones: number }>();
  for (const row of data) {
    const actual = totales.get(row.productId);
    if (actual) {
      actual.cantidad += row.cantidad;
      actual.sesiones += 1;
    } else {
      totales.set(row.productId, {
        producto: row.producto,
        unidadMedida: row.unidadMedida,
        cantidad: row.cantidad,
        sesiones: 1,
      });
    }
  }

  const filas = [...totales.values()].sort((a, b) => b.cantidad - a.cantidad);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageSearch className="h-4 w-4 text-muted-foreground" aria-hidden />
          Consumo de cabina
        </CardTitle>
        <CardDescription>Lo gastado en las sesiones de este paciente</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {filas.map((fila) => (
            <li key={fila.producto} className="flex items-baseline justify-between gap-3 border-b pb-1 last:border-0">
              <span className="min-w-0 truncate">{fila.producto}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-medium">
                  {fila.cantidad.toLocaleString("es-CO")} {fila.unidadMedida}
                </span>
                <span className="text-muted-foreground"> · {fila.sesiones} {fila.sesiones === 1 ? "sesión" : "sesiones"}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
