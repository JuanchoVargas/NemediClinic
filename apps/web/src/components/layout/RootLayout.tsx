// ============================================================
// RootLayout.tsx — Composición del layout raíz
//
// Responsabilidad: Header + <Outlet /> + Footer.
// El <Outlet /> es donde TanStack Router monta la página actual.
//
// EQUIVALENTE A: App.vue (la parte de template) en SINERGIA
// ============================================================

import { Outlet } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
