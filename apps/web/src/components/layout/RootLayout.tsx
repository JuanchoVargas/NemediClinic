// ============================================================
// RootLayout.tsx — Composición del layout raíz
//
// Responsabilidad: Header + <Outlet /> + Footer, aplicar la marca del canal
// (useApplyBranding) y el aviso de cuenta suspendida.
// El <Outlet /> es donde TanStack Router monta la página actual.
//
// EQUIVALENTE A: App.vue (la parte de template) en SINERGIA
// ============================================================

import { Outlet } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SuspendedBanner } from "@/components/shared/SuspendedBanner";
import { useApplyBranding } from "@/hooks/use-apply-branding";

export function RootLayout() {
  useApplyBranding();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <SuspendedBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
