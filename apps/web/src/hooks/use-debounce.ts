// ============================================================
// use-debounce.ts — Debounce hook genérico
//
// Devuelve un valor que se actualiza solo después de `delay` ms
// de inactividad. Útil para inputs de búsqueda.
//
// EQUIVALENTE A: lodash.debounce envuelto en composable Vue.
// ============================================================

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
