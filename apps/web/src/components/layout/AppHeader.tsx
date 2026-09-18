// ============================================================
// AppHeader.tsx — Barra superior de la app autenticada
//
// Botón para colapsar el sidebar, breadcrumb de la ruta actual, buscador
// global (Ctrl+K) y menú de usuario (tema claro/oscuro y cerrar sesión).
// El PlatformAdmin no tiene buscador: no accede a datos de clínicas.
// ============================================================
import { Fragment, useState } from "react";
import { Link, useLocation, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { KeyRound, LogOut, Moon, Search, Sun } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ROUTE_LABELS } from "@/hooks/use-nav-items";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
// Segmentos que tienen pantalla propia y por tanto enlace en el breadcrumb
const LINKABLE = new Set(["/dashboard", "/patients", "/calendar", "/procedures", "/packages", "/inventory", "/platform", "/valoraciones"]);

function useBreadcrumb() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    return {
      href,
      label: GUID.test(segment) ? "Detalle" : (ROUTE_LABELS[segment] ?? segment),
      linkable: LINKABLE.has(href) && i < segments.length - 1,
    };
  });
}

export function AppHeader() {
  const navigate = useNavigate();
  const crumbs = useBreadcrumb();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { isPlatformAdmin, role } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    useToastStore.success("Sesión cerrada");
    navigate({ to: "/login" });
  };

  const isDark = resolvedTheme === "dark";
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger aria-label="Mostrar u ocultar el menú" />
      <Separator orientation="vertical" className="mr-1 h-5!" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="truncate">
                {crumb.linkable ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href as NonNullable<LinkProps["to"]>}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {!isPlatformAdmin && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="hidden w-56 justify-start gap-2 bg-card text-muted-foreground md:inline-flex"
          >
            <Search className="h-4 w-4" />
            Buscar…
            <kbd className="ml-auto rounded border bg-muted px-1.5 font-sans text-[10px] font-medium">Ctrl K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
          <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Menú de usuario"
            className="flex size-8 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {initial}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-foreground">{user?.name || "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* onSelect + preventDefault: cambiar el tema no cierra el menú */}
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTheme(isDark ? "light" : "dark"); }}>
            {isDark ? <Sun /> : <Moon />}
            {isDark ? "Modo claro" : "Modo oscuro"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: "/change-password" })}>
            <KeyRound />
            Cambiar contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
