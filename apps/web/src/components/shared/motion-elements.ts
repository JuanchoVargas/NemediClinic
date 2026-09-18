// ============================================================
// motion-elements.ts — Elementos animables y entrada escalonada
//
//   MotionTableRow / MotionDiv / MotionLi   versiones `motion` de los contenedores
//   staggerProps(i)   props de entrada: fade + 6 px, 30 ms de retraso por elemento
//
// Uso:  {items.map((x, i) => <MotionTableRow key={x.id} {...staggerProps(i)}>…)}
// Respeta prefers-reduced-motion vía <MotionConfig reducedMotion="user"> (RootLayout).
// ============================================================
import { motion } from "motion/react";
import { TableRow } from "@/components/ui/table";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Tope de elementos con retraso: en listas largas el resto entra a la vez. */
const MAX_STAGGERED = 14;

export function staggerProps(index: number) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: EASE, delay: Math.min(index, MAX_STAGGERED) * 0.03 },
  };
}

export const MotionTableRow = motion.create(TableRow);
export const MotionDiv = motion.div;
export const MotionLi = motion.li;
