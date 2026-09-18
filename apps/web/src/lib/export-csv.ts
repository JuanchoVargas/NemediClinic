// ============================================================
// export-csv.ts — Descarga un arreglo de filas como archivo CSV
//
// Separador ";" y BOM UTF-8: así Excel en español lo abre en columnas
// y con tildes correctas sin pasar por el asistente de importación.
// ============================================================

type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  const text = value == null ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(";"));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
