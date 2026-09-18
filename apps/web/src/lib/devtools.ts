// ============================================================
// devtools.ts — Cuándo se muestran las herramientas de TanStack
//
// En producción Vite las elimina del bundle porque `import.meta.env.DEV`
// es false y el árbol se poda. En desarrollo sí aparecen, y eso ensucia
// las capturas del manual y una grabación de pantalla, porque el recorrido
// corre contra `vite dev`.
//
// Con VITE_HIDE_DEVTOOLS=1 se ocultan también en desarrollo. El recorrido
// de UI lo pasa siempre (playwright.config.ts); para grabar un video basta
// con arrancar Vite con esa variable.
// ============================================================
export const SHOW_DEVTOOLS = import.meta.env.DEV && import.meta.env.VITE_HIDE_DEVTOOLS !== "1";
