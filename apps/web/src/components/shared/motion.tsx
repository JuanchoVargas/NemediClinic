// ============================================================
// motion.tsx — Piezas de animación reutilizables (librería `motion`)
//
//   PageTransition   fade + slide 200 ms al cambiar de ruta
//   CountUp          número de KPI que sube hasta su valor
// La entrada escalonada de filas y tarjetas vive en motion-elements.ts
// (MotionTableRow / MotionDiv / MotionLi + staggerProps).
//
// prefers-reduced-motion: <MotionConfig reducedMotion="user"> (en RootLayout)
// desactiva los desplazamientos; CountUp además salta directo al valor final.
//
// EQUIVALENTE A: <Transition> / <TransitionGroup> de Vue
// ============================================================
import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/shared/motion-elements";

/** Envuelve el <Outlet />. `routeKey` = pathname: al cambiar, la página nueva entra con fade + slide. */
export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface CountUpProps {
  value: number;
  /** Formatea el número en cada frame (p. ej. moneda). Por defecto, entero con separador es-CO. */
  format?: (n: number) => string;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("es-CO");

export function CountUp({ value, format = defaultFormat, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced) {
      node.textContent = format(value);
      return;
    }
    // Se escribe en el DOM por frame (sin setState): 60 renders por segundo no aportan nada
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (latest) => { node.textContent = format(latest); },
    });
    return () => controls.stop();
  }, [value, format, reduced]);

  return (
    <span ref={ref} className={className}>
      {format(reduced ? value : 0)}
    </span>
  );
}
