// ============================================================
// Header.tsx — Barra superior persistente
//
// Responsabilidad: navegación principal + estado de sesión visible
// (botón login si no auth, botón logout si auth).
//
// EQUIVALENTE A: componentes/Header.vue en SINERGIA
// ============================================================

import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import {
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  LogIn,
  LogOut,
  Package,
  Package2,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";

export function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const clearSession = useAuthStore((s) => s.clearSession);

  const appName = import.meta.env.VITE_APP_NAME || "React Startup Base";

  const role = user?.role;
  const isSuperAdmin = role === "SuperAdmin";
  const isAdmin = role === "Admin" || isSuperAdmin;

  const handleLogout = () => {
    clearSession();
    useToastStore.success("Sesión cerrada");
    navigate({ to: "/login" });
  };

  const linkClass =
    "text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5";

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold">
            {appName}
          </Link>
          {isAuthenticated && (
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className={linkClass}
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Inicio
              </Link>
              <Link
                to="/dashboard"
                className={linkClass}
                activeProps={{ className: "text-foreground font-medium" }}
              >
                Dashboard
              </Link>

              <Link
                to="/procedures"
                className={linkClass}
                activeProps={{ className: "text-foreground font-medium" }}
              >
                <Stethoscope className="h-4 w-4" />
                Procedimientos
              </Link>
              <Link
                to="/packages"
                className={linkClass}
                activeProps={{ className: "text-foreground font-medium" }}
              >
                <Package className="h-4 w-4" />
                Paquetes
              </Link>
              <Link
                to="/inventory"
                className={linkClass}
                activeProps={{ className: "text-foreground font-medium" }}
              >
                <Package2 className="h-4 w-4" />
                Inventario
              </Link>

              {/* Calendario con sub-item "Hoja del día" */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`${linkClass} cursor-pointer focus:outline-none`}
                  >
                    <Calendar className="h-4 w-4" />
                    Calendario
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/calendar" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Vista calendario
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/calendar/day-sheet" className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Hoja del día
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Administración — solo Admin y SuperAdmin */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`${linkClass} cursor-pointer focus:outline-none`}
                    >
                      <Settings className="h-4 w-4" />
                      Administración
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/admin/users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Usuarios
                      </Link>
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/branches" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Sedes
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isSuperAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/super/tenants" className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Tenants
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/login" })}>
              <LogIn className="mr-2 h-4 w-4" />
              Ingresar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
