// ============================================================
// PageContainer.tsx — Wrapper estándar de cada página
//
// Responsabilidad: padding consistente, max-width, espaciado vertical.
// Toda página debería envolver su contenido en este componente.
// ============================================================

import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={`container mx-auto px-4 py-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}
