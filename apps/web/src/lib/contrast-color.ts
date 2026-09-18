// ============================================================
// contrast-color.ts — Color de texto legible sobre un color de marca
//
// El branding llega del backend como #RRGGBB. Para --primary-foreground
// se elige blanco o casi-negro según la luminancia relativa (WCAG).
// ============================================================

const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && HEX.test(value);
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Blanco sobre colores oscuros, casi-negro sobre colores claros. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#171717" : "#ffffff";
}
