// ============================================================
// offline-cache.ts — Copia sin conexión del service worker
//
// El service worker (vite.config.ts → workbox) guarda 24 h los GET de citas,
// hoja del día y fichas en la caché "clinic-api". Esa caché va por URL, no por
// usuario: al cerrar o cambiar de sesión se borra para que en una tablet
// compartida nadie vea datos de la sesión anterior.
// ============================================================

/** Debe coincidir con `cacheName` en vite.config.ts. */
const OFFLINE_CACHE = "clinic-api";

export function clearOfflineCache(): void {
  if (typeof caches === "undefined") return; // contexto no seguro o navegador sin Cache API
  void caches.delete(OFFLINE_CACHE).catch(() => undefined);
}
