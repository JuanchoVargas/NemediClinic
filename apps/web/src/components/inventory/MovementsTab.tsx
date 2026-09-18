// ============================================================
// MovementsTab.tsx — Movimientos de inventario (entradas y salidas)
//
// Historial de todo el inventario o de un producto. Antes no existía pantalla
// y GET /inventory/movements/product/{id} respondía 500 (FLUJOS bug 8).
// ============================================================
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { MotionTableRow, staggerProps } from "@/components/shared/motion-elements";
import { useInventoryMovements, useProducts } from "@/api/inventory.api";
import { formatShortDate } from "@/lib/format-platform";

const ALL = "all";

export function MovementsTab() {
  const [productId, setProductId] = useState(ALL);
  const { data: products } = useProducts(1, 100);
  const { data, isLoading } = useInventoryMovements(productId === ALL ? undefined : productId);
  const movements = data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Entradas y salidas de stock, de la más reciente a la más antigua.</p>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-64 bg-card" aria-label="Producto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los productos</SelectItem>
            {products?.items.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Referencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    illustration="inventory"
                    title="Sin movimientos"
                    description="Cada entrada de inventario queda registrada aquí con su fecha y referencia."
                  />
                </TableCell>
              </TableRow>
            )}
            {movements.map((m, i) => {
              const isEntry = m.tipoMovimiento === "Entrada";
              return (
                <MotionTableRow key={m.id} {...staggerProps(i)}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(m.fechaMovimiento).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                  <TableCell className="font-medium">{m.productoNombre}</TableCell>
                  <TableCell>
                    <Badge variant={isEntry ? "success" : "warning"} className="gap-1">
                      {isEntry ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {m.tipoMovimiento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isEntry ? "+" : "−"}
                    {m.cantidad} {m.unidadMedida}
                  </TableCell>
                  <TableCell>
                    {/* De qué lote salió: es lo que hay que poder responder de un insumo */}
                    {m.numeroLote ? (
                      <>
                        <span className="font-medium">{m.numeroLote}</span>
                        {m.fechaVencimientoLote && (
                          <div className="text-xs text-muted-foreground">
                            vence {formatShortDate(m.fechaVencimientoLote)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.referencia ?? "—"}
                    {m.pacienteNombre && <div className="text-xs">{m.pacienteNombre}</div>}
                  </TableCell>
                </MotionTableRow>
              );
            })}
          </TableBody>
        </Table>
      </ResponsiveTable>
    </div>
  );
}
