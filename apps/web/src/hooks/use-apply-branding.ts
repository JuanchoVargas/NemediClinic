// ============================================================
// use-apply-branding.ts — Aplica la marca del canal a la app
//
// Pide GET /branding una vez por carga y escribe la marca del canal en <html>:
// --brand-primary, --brand-primary-foreground y --brand-secondary. tokens.css
// DERIVA de ahí --primary, --ring y el hover (y su versión aclarada en modo
// oscuro), así el canal sobreescribe el primario sin romper el tema.
// También pone el título de la pestaña. Se monta UNA vez, en RootLayout.
//
// EQUIVALENTE A: un watch() en App.vue que pinta las variables del tema
// ============================================================
import { useEffect } from "react";
import { DEFAULT_BRANDING, useBranding } from "@/api/branding.api";
import { isHexColor, readableOn } from "@/lib/contrast-color";

export function useApplyBranding() {
  const { data } = useBranding();
  const branding = data ?? DEFAULT_BRANDING;

  useEffect(() => {
    document.title = branding.nombreComercial;

    const root = document.documentElement.style;
    if (isHexColor(branding.colorPrimario)) {
      root.setProperty("--brand-primary", branding.colorPrimario);
      root.setProperty("--brand-primary-foreground", readableOn(branding.colorPrimario));
    }
    if (isHexColor(branding.colorSecundario)) {
      root.setProperty("--brand-secondary", branding.colorSecundario);
    }
  }, [branding.nombreComercial, branding.colorPrimario, branding.colorSecundario]);

  return branding;
}
