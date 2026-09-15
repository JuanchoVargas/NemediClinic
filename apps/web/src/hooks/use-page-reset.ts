// ============================================================
// use-page-reset.ts — Paginación que vuelve a la página 1 cuando
// cambian los filtros, sin useEffect (patrón "adjust state during
// render" de React: evita el warning react-hooks/set-state-in-effect).
//
// Uso:
//   const [page, setPage] = usePageReset(`${search}|${filtro}`);
//
// EQUIVALENTE A: watch(filtros, () => (page.value = 1)) en Vue
// ============================================================
import { useState, type Dispatch, type SetStateAction } from "react";

export function usePageReset(resetKey: string): [number, Dispatch<SetStateAction<number>>] {
  const [page, setPage] = useState(1);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setPage(1);
  }
  return [page, setPage];
}
