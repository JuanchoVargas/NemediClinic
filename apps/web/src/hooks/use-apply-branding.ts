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
import { API_BASE_URL } from "@/lib/axios";

/** Crea o actualiza una etiqueta de <head> identificada por un atributo (rel="manifest", name="theme-color"). */
function upsertHeadTag(tag: "link" | "meta", keyAttr: string, keyValue: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(`${tag}[${keyAttr}="${keyValue}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(keyAttr, keyValue);
    document.head.appendChild(el);
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
}

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

  // PWA: el manifest lo arma el API con el nombre y el color del canal. En producción web y API
  // comparten origen (el Host ya identifica al canal); en desarrollo se manda el origen de Vite
  // para que start_url e iconos apunten a él, y el host de marca de prueba si lo hay.
  useEffect(() => {
    const params = new URLSearchParams();
    if (API_BASE_URL) params.set("origin", window.location.origin);
    if (import.meta.env.DEV && import.meta.env.VITE_BRANDING_HOST) params.set("host", import.meta.env.VITE_BRANDING_HOST);
    const query = params.toString();
    upsertHeadTag("link", "rel", "manifest", {
      href: `${API_BASE_URL}/api/v1/branding/manifest.webmanifest${query ? `?${query}` : ""}`,
      // El manifest es público: sin credenciales aunque venga de otro origen en desarrollo
      crossorigin: "anonymous",
    });
    if (isHexColor(branding.colorPrimario)) {
      upsertHeadTag("meta", "name", "theme-color", { content: branding.colorPrimario });
    }
  }, [branding.colorPrimario]);

  return branding;
}
