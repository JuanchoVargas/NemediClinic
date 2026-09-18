// ============================================================
// RootLayout.tsx — Composición del layout raíz
//
// Dos caras según la sesión:
//   · Autenticado → sidebar colapsable + header (breadcrumb, buscador, usuario)
//   · Público (/, /login) → header mínimo con la marca + pie
// También aplica la marca del canal (useApplyBranding), el aviso de cuenta
// suspendida y la transición de página. <MotionConfig reducedMotion="user">
// hace que todas las animaciones de `motion` respeten prefers-reduced-motion.
//
// EQUIVALENTE A: App.vue (la parte de template) en SINERGIA
// ============================================================

import { useEffect } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/shared/motion";
import { SuspendedBanner } from "@/components/shared/SuspendedBanner";
import { useApplyBranding } from "@/hooks/use-apply-branding";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

export function RootLayout() {
  const branding = useApplyBranding();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const mustChangePassword = useAuthStore((s) => !!s.user?.mustChangePassword);
  const pathname = useLocation({ select: (l) => l.pathname });

  // Avisos que el guard de rutas encoló antes de que existiera el Toaster ("No tienes permisos…")
  useEffect(() => {
    useToastStore.flushDeferred();
  }, [pathname]);

  // Sin sesión, o con clave temporal (solo puede ver /change-password): layout mínimo, sin menú
  if (!isAuthenticated || mustChangePassword) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-card">
            <div className="container mx-auto flex h-14 items-center px-4">
              <Link to="/" className="inline-flex items-center gap-2 font-heading text-lg font-bold">
                {branding.logoUrl && <img src={branding.logoUrl} alt="" className="h-7 w-auto object-contain" />}
                {branding.nombreComercial}
              </Link>
            </div>
          </header>
          <main className="flex-1">
            <PageTransition routeKey={pathname}>
              <Outlet />
            </PageTransition>
          </main>
          <Footer />
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <AppHeader />
          <SuspendedBanner />
          <div className="flex-1">
            <PageTransition routeKey={pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MotionConfig>
  );
}
