// ============================================================
// RegulatoryReportDialog.tsx — "Reporte para Secretaría de Salud"
//
// Elige el rango (por defecto el mes en curso) y el tipo regulatorio,
// muestra un resumen de lo que va a salir y descarga el Excel, que arma
// el backend con una hoja por tipo.
// ============================================================
import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FormDialog } from "@/components/shared/FormDialog";
import { downloadRegulatoryReport, useRegulatoryReport } from "@/api/inventory.api";
import { toLocalDate } from "@/lib/dates";
import { useToastStore } from "@/stores/toast.store";
import { REGULATORY_PLURAL, RegulatoryType } from "@/types/inventory";

const TODOS = "all";

/** Primer día del mes en curso, en hora local. */
function inicioDeMes() {
  const d = new Date();
  return toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function RegulatoryReportDialog({ onClose }: { onClose: () => void }) {
  const [desde, setDesde] = useState(inicioDeMes);
  const [hasta, setHasta] = useState(() => toLocalDate(new Date()));
  const [tipo, setTipo] = useState<string>(TODOS);
  const [descargando, setDescargando] = useState(false);

  const filtro = tipo === TODOS ? undefined : (tipo as RegulatoryType);
  const { data, isLoading } = useRegulatoryReport(desde, hasta, filtro);

  const descargar = async () => {
    setDescargando(true);
    try {
      await downloadRegulatoryReport(desde, hasta, filtro);
      useToastStore.success("Reporte descargado", "Revisa tu carpeta de descargas.");
      onClose();
    } catch (error) {
      useToastStore.report(error);
    } finally {
      setDescargando(false);
    }
  };

  const rangoInvalido = !desde || !hasta || desde > hasta;

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={<>Reporte para Secretaría de Salud</>}
      description={<>Inventario con registro INVIMA, lotes, vencimientos y consumo del periodo.</>}
      actions={
        <Button onClick={() => void descargar()} disabled={descargando || rangoInvalido}>
          {descargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Descargar Excel
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reporte-desde">Desde</Label>
            <Input id="reporte-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reporte-hasta">Hasta</Label>
            <Input id="reporte-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reporte-tipo">Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger id="reporte-tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los tipos</SelectItem>
              {Object.entries(REGULATORY_PLURAL).map(([valor, etiqueta]) => (
                <SelectItem key={valor} value={valor}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rangoInvalido ? (
          <p className="text-sm text-destructive">La fecha inicial no puede ser posterior a la final.</p>
        ) : isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-2 text-sm font-medium">El archivo va a incluir:</p>
            {data && data.grupos.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {data.grupos.map((g) => (
                  <li key={g.tipoRegulatorio} className="flex justify-between gap-3">
                    <span>{REGULATORY_PLURAL[g.tipoRegulatorio] ?? g.tipoRegulatorio}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {g.productos.length} {g.productos.length === 1 ? "producto" : "productos"} ·{" "}
                      {g.productos.reduce((s, p) => s + p.lotes.length, 0)} lotes
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hay productos en ese periodo.</p>
            )}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
