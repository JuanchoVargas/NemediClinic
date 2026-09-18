// ============================================================
// Footer.tsx — Pie minimalista
// ============================================================

import { DEFAULT_BRANDING, useBranding } from "@/api/branding.api";

export function Footer() {
  const { data: branding = DEFAULT_BRANDING } = useBranding();

  return (
    <footer className="border-t bg-background py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ·{" "}
        {branding.nombreComercial}
      </div>
    </footer>
  );
}
