// ============================================================
// ProductConsumptionField.tsx — "Productos usados" de una nota clínica
//
// Antes era un campo de texto libre; ahora es una lista de (producto, cantidad)
// que descuenta inventario al guardar la nota de una cita Completada.
//
// Cada línea avisa cuánto queda en stock y se pone en rojo si la cantidad
// escrita supera esa existencia — el backend rechaza el guardado en ese caso,
// así que conviene verlo antes de enviar.
// ============================================================
import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/api/inventory.api";
import { cn } from "@/lib/utils";

export interface ConsumedProduct {
  productId: string;
  cantidad: number;
}

interface ProductConsumptionFieldProps {
  value: ConsumedProduct[];
  onChange: (value: ConsumedProduct[]) => void;
  disabled?: boolean;
}

export function ProductConsumptionField({ value, onChange, disabled }: ProductConsumptionFieldProps) {
  // Solo insumos: lo que se gasta en cabina, no lo que se vende en mostrador
  const { data } = useProducts(1, 200);
  const products = useMemo(
    () => (data?.items ?? []).filter((p) => p.activo && p.tipoProducto !== "Venta"),
    [data],
  );
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const usados = new Set(value.map((v) => v.productId));
  const disponibles = products.filter((p) => !usados.has(p.id));

  const update = (index: number, patch: Partial<ConsumedProduct>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      {value.map((row, index) => {
        const product = byId.get(row.productId);
        const excede = !!product && row.cantidad > product.stockActual;
        return (
          <div key={row.productId || index} className="flex flex-wrap items-start gap-2">
            <div className="min-w-44 flex-1">
              <Select value={row.productId} onValueChange={(productId) => update(index, { productId })} disabled={disabled}>
                <SelectTrigger className="w-full" aria-label={`Producto ${index + 1}`}>
                  <SelectValue placeholder="Elige el producto" />
                </SelectTrigger>
                <SelectContent>
                  {/* El ya elegido sigue en la lista para poder verlo seleccionado */}
                  {[...(product ? [product] : []), ...disponibles].map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {product && (
                <p className={cn("mt-1 text-xs", excede ? "text-destructive" : "text-muted-foreground")}>
                  {excede
                    ? `Solo quedan ${product.stockActual} ${product.unidadMedida}`
                    : `Quedan ${product.stockActual} ${product.unidadMedida}`}
                </p>
              )}
            </div>
            <Input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              className={cn("w-24", excede && "border-destructive")}
              aria-label={`Cantidad del producto ${index + 1}`}
              value={row.cantidad || ""}
              disabled={disabled}
              onChange={(e) => update(index, { cantidad: e.target.valueAsNumber || 0 })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              disabled={disabled}
              aria-label="Quitar el producto"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || disponibles.length === 0}
        onClick={() => onChange([...value, { productId: "", cantidad: 1 }])}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Agregar producto
      </Button>
      <p className="text-xs text-muted-foreground">
        Al guardar la nota de una cita completada, estas cantidades salen del inventario.
      </p>
    </div>
  );
}
