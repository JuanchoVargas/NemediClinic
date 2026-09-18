import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Rutas del API cuyos GET se guardan para consultarlos sin conexión (24 h):
// hoja del día y citas, y la ficha del paciente (datos, historia clínica, evolución).
// NetworkFirst: con red siempre gana la respuesta fresca; la copia solo se usa si la red falla.
// /api/v1/files NO entra: son URLs firmadas que expiran en 10 minutos.
// OJO: workbox copia cada urlPattern al sw.js con toString(), así que la función no puede usar
// variables de este archivo: la expresión regular va escrita dentro.
// El mismo nombre está en src/lib/offline-cache.ts, que la borra al cerrar sesión.
const OFFLINE_CACHE = "clinic-api";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // El manifest lo sirve el API (GET /api/v1/branding/manifest.webmanifest) con el nombre y el
      // color del canal del dominio; use-apply-branding.ts pone el <link rel="manifest">.
      manifest: false,
      includeAssets: ["favicon.svg", "icons/*.png"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === "GET" && /^\/api\/v1\/(appointments|patients)(\/|$)/i.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: OFFLINE_CACHE,
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Tipografías de Google Fonts: cambian muy poco
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fonts", expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
        ],
      },
      // Sin service worker en `vite dev`: cachear durante el desarrollo solo confunde.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
