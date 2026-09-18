// ============================================================
// ResponsiveTable.tsx — Tabla en escritorio, lista de tarjetas en móvil
//
// Envuelve una <Table> de shadcn SIN cambiarla:
//
//   <ResponsiveTable>
//     <Table>…</Table>
//   </ResponsiveTable>
//
// En pantallas < 768 px el CSS de tokens.css (.rt-cards) convierte cada fila en
// una tarjeta: la primera celda es el título y las demás son pares
// "etiqueta → valor". La etiqueta sale del encabezado de su columna: este
// componente copia el texto de cada <th> al atributo data-label de las celdas
// de esa columna (después de cada render, porque las filas cambian con los datos).
// Así ninguna página repite sus columnas en dos formatos.
//
// EQUIVALENTE A: un <b-table stacked="md"> de BootstrapVue
// ============================================================
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveTable({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Sin dependencias a propósito: corre tras cada render para etiquetar las filas nuevas.
  // Solo escribe atributos (no estado), así que no provoca renders.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const labels = Array.from(root.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
    root.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell instanceof HTMLTableCellElement && cell.colSpan === 1) {
          cell.dataset.label = labels[index] ?? "";
        }
      });
    });
  });

  return (
    <div ref={ref} className={cn("rt-cards rounded-md border max-md:border-0", className)}>
      {children}
    </div>
  );
}
