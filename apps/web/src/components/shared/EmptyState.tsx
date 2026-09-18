// ============================================================
// EmptyState.tsx — Estado vacío con ilustración propia y acción
//
// Ilustraciones SVG inline (sin assets externos), dibujadas con los tokens
// (currentColor / var(--primary) / var(--sand)) para que sigan el tema y la
// marca del canal. Un estado vacío siempre dice qué hacer a continuación.
// ============================================================
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyIllustration = "patients" | "calendar" | "inventory" | "photos" | "search" | "generic";

interface EmptyStateProps {
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  /** Botón (o enlace) con la acción que saca al usuario del vacío. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ illustration = "generic", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <Illustration name={illustration} />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Illustration({ name }: { name: EmptyIllustration }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className="h-28 w-36 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Base común: sombra suave en el piso */}
      <ellipse cx="80" cy="108" rx="52" ry="6" fill="var(--muted)" stroke="none" />
      {SHAPES[name]}
    </svg>
  );
}

const soft = { fill: "var(--card)" };
const primary = { stroke: "var(--primary)" };
const sand = { fill: "var(--sand)", stroke: "none" };

const SHAPES: Record<EmptyIllustration, ReactNode> = {
  patients: (
    <>
      <rect x="38" y="22" width="84" height="76" rx="10" {...soft} />
      <circle cx="80" cy="50" r="12" {...primary} />
      <path d="M58 84c3-12 12-17 22-17s19 5 22 17" {...primary} />
      <circle cx="116" cy="28" r="9" {...sand} />
      <path d="M116 24v8M112 28h8" stroke="var(--sand-foreground)" />
    </>
  ),
  calendar: (
    <>
      <rect x="34" y="26" width="92" height="72" rx="10" {...soft} />
      <path d="M34 44h92M56 18v14M104 18v14" />
      <rect x="48" y="54" width="16" height="12" rx="3" {...primary} />
      <rect x="72" y="54" width="16" height="12" rx="3" />
      <rect x="96" y="54" width="16" height="12" rx="3" />
      <rect x="48" y="74" width="16" height="12" rx="3" />
      <rect x="72" y="74" width="16" height="12" rx="3" {...sand} />
    </>
  ),
  inventory: (
    <>
      <path d="M80 20l42 18v44L80 100 38 82V38z" {...soft} />
      <path d="M38 38l42 18 42-18M80 56v44" />
      <path d="M59 29l42 18" {...primary} />
      <circle cx="118" cy="88" r="10" {...sand} />
      <path d="M118 84v8M114 88h8" stroke="var(--sand-foreground)" />
    </>
  ),
  photos: (
    <>
      <rect x="28" y="34" width="62" height="58" rx="8" {...soft} transform="rotate(-6 59 63)" />
      <rect x="66" y="28" width="66" height="62" rx="8" {...soft} />
      <circle cx="86" cy="48" r="6" {...sand} />
      <path d="M70 82l18-18 12 12 10-8 18 16" {...primary} />
    </>
  ),
  search: (
    <>
      <circle cx="72" cy="56" r="28" {...soft} />
      <path d="M93 77l24 22" {...primary} strokeWidth="4" />
      <path d="M62 56h20M72 46v20" opacity="0.5" />
    </>
  ),
  generic: (
    <>
      <rect x="40" y="24" width="80" height="74" rx="10" {...soft} />
      <path d="M56 46h48M56 62h48M56 78h28" />
      <circle cx="118" cy="30" r="9" {...sand} />
    </>
  ),
};
