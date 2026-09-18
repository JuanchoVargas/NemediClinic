// ============================================================
// use-stored-choice.ts — Una opción de UI que se recuerda en el dispositivo
//
//   const [view, setView] = useStoredChoice("dashboard.citas-panel", ["citas", "dinero"], "citas");
//
// Es preferencia de interfaz (como el tema), no dato de negocio: va a
// localStorage. Si lo guardado ya no es una opción válida (cambió la lista o
// alguien lo editó a mano), se usa el valor por defecto.
//
// EQUIVALENTE A: useLocalStorage() de VueUse, con validación del valor
// ============================================================
import { useCallback, useState } from "react";

export function useStoredChoice<T extends string>(key: string, options: readonly T[], fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return options.includes(stored as T) ? (stored as T) : fallback;
    } catch {
      return fallback; // localStorage bloqueado (modo privado estricto)
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // sin persistencia: la elección vale solo para esta visita
      }
    },
    [key],
  );

  return [value, set];
}
