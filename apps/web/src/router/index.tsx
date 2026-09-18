// ============================================================
// router/index.tsx — Árbol de rutas (Nemedi Clinic)
//
// Estructura:
//   root (RootLayout: Header + Outlet + Footer)
//   ├── /              → HomePage (pública)
//   ├── /login         → LoginPage (pública)
//   └── _protected     → guard via beforeLoad
//       ├── /dashboard          → DashboardPage
//       ├── /patients           → PatientsPage
//       ├── /patients/new       → PatientFormPage (modo crear)
//       ├── /patients/$id       → PatientDetailPage
//       ├── /patients/$id/edit  → PatientFormPage (modo editar)
//       └── /platform           → PlatformPage (solo PlatformAdmin; es su ÚNICA ruta)
//
// EQUIVALENTE A: router/index.js de SINERGIA con beforeEach guards
// PATTERNS.md sección: "Routing"
// ============================================================

import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { z } from "zod";

import { RootLayout } from "@/components/layout/RootLayout";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PatientsPage } from "@/pages/PatientsPage";
import { PatientFormPage } from "@/pages/PatientFormPage";
import { PatientDetailPage } from "@/pages/PatientDetailPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { DaySheetPage } from "@/pages/DaySheetPage";
import { ProceduresPage } from "@/pages/ProceduresPage";
import { PackagesPage } from "@/pages/PackagesPage";
import { PackageFormPage } from "@/pages/PackageFormPage";
import { PackageDetailPage } from "@/pages/PackageDetailPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { BranchesPage } from "@/pages/admin/BranchesPage";
import { TenantsPage } from "@/pages/super/TenantsPage";
import { PlatformPage } from "@/pages/platform/PlatformPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { PLATFORM_ADMIN } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

// Guard por rol: usa el rol del JWT (auth store). Si el usuario no tiene
// un rol permitido, avisa con un toast y lo manda al dashboard.
function requireRoles(allowed: string[]) {
  const role = useAuthStore.getState().user?.role;
  if (!role || !allowed.includes(role)) {
    // deferError: en una carga directa de la URL el <Toaster /> aún no existe
    useToastStore.deferError("No tienes permisos para acceder a esa sección");
    throw redirect({ to: "/dashboard" });
  }
}

// ─── Root: layout persistente ──────────────────────────────
const rootRoute = createRootRoute({
  component: () => (
    <>
      <RootLayout />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
});

// ─── Rutas públicas ────────────────────────────────────────
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LoginPage,
});

// ─── Rutas protegidas (layout route con beforeLoad guard) ──
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_protected",
  beforeLoad: ({ location }) => {
    const isAuth = useAuthStore.getState().isAuthenticated();
    if (!isAuth) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    // Clave temporal (usuario nuevo o restablecido): nada más que /change-password.
    // La API además responde 403 fuera de /auth/* mientras el JWT lleve ese bloqueo.
    const mustChange = useAuthStore.getState().user?.mustChangePassword;
    if (mustChange && location.pathname !== "/change-password") {
      throw redirect({ to: "/change-password" });
    }
    if (location.pathname === "/change-password") return;

    // El PlatformAdmin vive fuera de todo tenant: las pantallas de clínica le darían 403.
    const role = useAuthStore.getState().user?.role;
    if (role === PLATFORM_ADMIN && !location.pathname.startsWith("/platform")) {
      throw redirect({ to: "/platform" });
    }
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const patientsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/patients",
  component: PatientsPage,
});

// /patients/new debe declararse ANTES que /patients/$id para que
// TSR no lo capture como un id="new".
const patientNewRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/patients/new",
  component: PatientFormPage,
});

const patientDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/patients/$id",
  component: PatientDetailPage,
});

const patientEditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/patients/$id/edit",
  component: PatientFormPage,
});

// /calendar/day-sheet ANTES que /calendar para coincidir exacto primero
const daySheetRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/calendar/day-sheet",
  component: DaySheetPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/calendar",
  // ?patientId= abre "Nueva cita" con el paciente elegido (acción rápida de la ficha)
  validateSearch: z.object({ patientId: z.string().optional() }),
  component: CalendarPage,
});

const proceduresRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/procedures",
  component: ProceduresPage,
});

// Paquetes: PackagesController es policy Admin (Esteticista recibe 403 incluso en GET)
const packagesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/packages",
  beforeLoad: () => requireRoles(["SuperAdmin", "Admin"]),
  component: PackagesPage,
});

// /packages/new ANTES de /packages/$id para que TSR no lo capture como id="new"
const packageNewRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/packages/new",
  beforeLoad: () => requireRoles(["SuperAdmin", "Admin"]),
  component: PackageFormPage,
});

const packageDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/packages/$id",
  beforeLoad: () => requireRoles(["SuperAdmin", "Admin"]),
  component: PackageDetailPage,
});

const packageEditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/packages/$id/edit",
  beforeLoad: () => requireRoles(["SuperAdmin", "Admin"]),
  component: PackageFormPage,
});

const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/inventory",
  component: InventoryPage,
});

// ─── Administración (guard por rol) ────────────────────────
const usersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/admin/users",
  beforeLoad: () => requireRoles(["SuperAdmin", "Admin"]),
  component: UsersPage,
});

// Sedes: BranchesController deja leer/editar/eliminar a Admin; solo crear es SuperAdmin
const branchesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/admin/branches",
  beforeLoad: () => requireRoles(["SuperAdmin", "Admin"]),
  component: BranchesPage,
});

const tenantsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/super/tenants",
  beforeLoad: () => requireRoles(["SuperAdmin"]),
  component: TenantsPage,
});

// Cualquier rol (incluido PlatformAdmin). Obligatoria con clave temporal, voluntaria desde el menú de usuario.
const changePasswordRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/change-password",
  component: ChangePasswordPage,
});

// ─── Plataforma (sobre los tenants) ────────────────────────
const platformRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/platform",
  beforeLoad: () => requireRoles([PLATFORM_ADMIN]),
  component: PlatformPage,
});

// ─── Árbol ─────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    patientsRoute,
    patientNewRoute,
    patientDetailRoute,
    patientEditRoute,
    daySheetRoute,
    calendarRoute,
    proceduresRoute,
    packagesRoute,
    packageNewRoute,
    packageDetailRoute,
    packageEditRoute,
    inventoryRoute,
    usersRoute,
    branchesRoute,
    tenantsRoute,
    platformRoute,
    changePasswordRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
