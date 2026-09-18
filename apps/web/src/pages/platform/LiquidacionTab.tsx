// ============================================================
// LiquidacionTab.tsx — Liquidación mensual por canal
//
// Selector de mes → por canal: tenants activos, plan, precio, porcentaje,
// monto del canal y monto de Nemedi. Los tenants Exento/Suspendido se
// listan con montos en 0 (no suman). Exporta el detalle a CSV.
// ============================================================

import { useState } from "react";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useLiquidacion } from "@/api/platform.api";
import { toLocalDate } from "@/lib/dates";
import { exportCsv } from "@/lib/export-csv";
import { formatCop, formatPercent } from "@/lib/format-platform";
import type { Liquidacion } from "@/types/platform";

function downloadCsv(liquidacion: Liquidacion) {
  const rows = liquidacion.canales.flatMap((c) =>
    c.tenants.map((t) => [
      liquidacion.mes,
      c.canal,
      t.nombre,
      t.nit,
      t.plan,
      t.sedesAdicionales,
      t.esIps ? "Sí" : "No",
      t.estado,
      t.precio,
      t.porcentaje,
      t.montoCanal,
      t.montoNemedi,
    ]),
  );
  exportCsv(
    `liquidacion-${liquidacion.mes}.csv`,
    ["Mes", "Canal", "Tenant", "NIT", "Plan", "Sedes adicionales", "IPS", "Estado", "Precio", "Porcentaje canal", "Monto canal", "Monto Nemedi"],
    rows,
  );
}

export function LiquidacionTab() {
  // Mes en curso en hora local (YYYY-MM); nunca toISOString()
  const [mes, setMes] = useState(() => toLocalDate(new Date()).slice(0, 7));
  const { data, isLoading } = useLiquidacion(mes);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label htmlFor="liquidacion-mes">Mes</Label>
          <Input
            id="liquidacion-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 w-44"
          />
        </div>
        <Button variant="outline" disabled={!data} onClick={() => data && downloadCsv(data)}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total facturado" value={formatCop(data.totalFacturado)} />
            <SummaryCard label="Para los canales" value={formatCop(data.totalCanales)} />
            <SummaryCard label="Para Nemedi" value={formatCop(data.totalNemedi)} />
          </div>

          <div className="space-y-6">
            {data.canales.map((c) => (
              <section key={c.channelId} aria-label={`Canal ${c.canal}`}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    {c.canal}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {formatPercent(c.porcentajeCanal)} · {c.tenantsActivos}{" "}
                      {c.tenantsActivos === 1 ? "tenant activo" : "tenants activos"}
                    </span>
                  </h2>
                  <p className="text-sm">
                    Canal <span className="font-semibold">{formatCop(c.montoCanal)}</span> · Nemedi{" "}
                    <span className="font-semibold">{formatCop(c.montoNemedi)}</span>
                  </p>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Monto canal</TableHead>
                        <TableHead className="text-right">Monto Nemedi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {c.tenants.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">
                            Sin tenants en este mes.
                          </TableCell>
                        </TableRow>
                      )}
                      {c.tenants.map((t) => (
                        <TableRow key={t.tenantId} className={t.suma ? "" : "text-muted-foreground"}>
                          <TableCell>
                            <div className="font-medium">{t.nombre}</div>
                            <div className="text-xs text-muted-foreground">{t.nit}</div>
                          </TableCell>
                          <TableCell>
                            {t.plan === "Basico" ? "Básico" : "Pro"}
                            {t.sedesAdicionales > 0 && ` +${t.sedesAdicionales} sedes`}
                            {t.esIps && " · IPS"}
                          </TableCell>
                          <TableCell>
                            {t.suma ? t.estado : <Badge variant="secondary">{t.estado} · no suma</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{formatCop(t.precio)}</TableCell>
                          <TableCell className="text-right">{formatPercent(t.porcentaje)}</TableCell>
                          <TableCell className="text-right">{formatCop(t.montoCanal)}</TableCell>
                          <TableCell className="text-right">{formatCop(t.montoNemedi)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
