// ============================================================
// SegmentedControl.tsx — Alternador de 2–3 opciones ([Citas | Dinero])
//
// Es un grupo de radio (role="radiogroup"): flechas ←/→ cambian de opción y
// solo la activa entra en el orden de tabulación. La "pastilla" activa se
// desliza entre opciones con layoutId (motion); con prefers-reduced-motion
// salta sin animación (<MotionConfig reducedMotion="user"> en RootLayout).
//
// EQUIVALENTE A: <el-radio-group> con <el-radio-button> en Element Plus
// ============================================================
import { useId, type KeyboardEvent } from "react";
import { MotionDiv, EASE } from "@/components/shared/motion-elements";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nombre accesible del grupo, p. ej. "Ver citas o dinero". */
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: SegmentedControlProps<T>) {
  const pillId = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = options.findIndex((o) => o.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    // El foco sigue a la opción elegida
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex shrink-0 rounded-lg bg-muted p-0.5 text-sm", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-md px-3 py-1 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <MotionDiv
                layoutId={pillId}
                className="absolute inset-0 rounded-md bg-card shadow-soft"
                transition={{ duration: 0.25, ease: EASE }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
