// ============================================================
// AppSidebar.tsx — Navegación lateral (shadcn sidebar)
//
// Colapsable a iconos (Ctrl+B o el botón del header). Los ítems salen de
// useNavItems() según el rol. "Calendario" y "Administración" son grupos
// desplegables: arrancan cerrados salvo que la ruta actual esté dentro.
//
// EQUIVALENTE A: componentes/Sidebar.vue en SINERGIA
// ============================================================
import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { DEFAULT_BRANDING, useBranding } from "@/api/branding.api";
import { useCurrentTenant } from "@/api/tenants.api";
import { SecureImage } from "@/components/shared/SecureImage";
import { useNavItems, type NavLink } from "@/hooks/use-nav-items";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

/** /calendar activo en /calendar y /calendar/x, pero "Vista calendario" solo en /calendar exacto. */
function isActive(pathname: string, to: string, exact = false) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

export function AppSidebar() {
  const sections = useNavItems();
  const { isPlatformAdmin } = usePermissions();
  const { data: branding = DEFAULT_BRANDING } = useBranding();
  const pathname = useLocation({ select: (l) => l.pathname });
  const user = useAuthStore((s) => s.user);
  // La clínica firma su propia interfaz: su logo y su nombre van primero; la marca del canal
  // queda como respaldo (y como subtítulo). El PlatformAdmin no pertenece a ningún tenant.
  const { data: tenant } = useCurrentTenant(!!user && !isPlatformAdmin);
  const title = tenant?.nombre ?? branding.nombreComercial;
  const channelMark = branding.logoUrl ? (
    <img src={branding.logoUrl} alt="" className="size-8 rounded-lg object-contain" />
  ) : (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground"
    >
      {title.charAt(0)}
    </span>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={title}>
              <Link to={isPlatformAdmin ? "/platform" : "/dashboard"}>
                {tenant?.logoId ? (
                  <SecureImage
                    id={tenant.logoId}
                    alt=""
                    className="size-8 shrink-0 rounded-lg bg-card object-contain"
                    fallback={channelMark}
                  />
                ) : (
                  channelMark
                )}
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-heading text-base font-bold">{title}</span>
                  {tenant && tenant.nombre !== branding.nombreComercial && (
                    <span className="truncate text-xs text-muted-foreground">{branding.nombreComercial}</span>
                  )}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Navegación principal">
          {sections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) =>
                    "children" in item ? (
                      <NavGroup key={item.label} item={item} pathname={pathname} />
                    ) : (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive(pathname, item.to)} tooltip={item.label}>
                          <Link to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      {/* Quién tiene la sesión abierta. Las acciones (tema, cerrar sesión) están en el menú del header. */}
      {user && (
        <SidebarFooter>
          <div className="flex items-center gap-2 rounded-lg p-2 group-data-[collapsible=icon]:hidden">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 text-xs leading-tight">
              <p className="truncate font-medium text-foreground">{user.name || "Usuario"}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}

function NavGroup({
  item,
  pathname,
}: {
  item: { label: string; icon: NavLink["icon"]; children: NavLink[] };
  pathname: string;
}) {
  const { state, setOpen } = useSidebar();
  const children = item.children;
  const containsCurrent = children.some((c) => isActive(pathname, c.to));
  // null = el usuario no lo ha tocado → abierto solo si la ruta actual está dentro
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? containsCurrent;

  const toggle = () => {
    // Colapsado a iconos no hay dónde mostrar el submenú: primero se expande la barra
    if (state === "collapsed") {
      setOpen(true);
      setManual(true);
      return;
    }
    setManual(!open);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={toggle}
        isActive={containsCurrent && !open}
        tooltip={item.label}
        aria-expanded={open}
      >
        <item.icon />
        <span>{item.label}</span>
        <ChevronRight className={cn("ml-auto transition-transform duration-200", open && "rotate-90")} />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub>
          {children.map((child) => (
            <SidebarMenuSubItem key={child.to}>
              <SidebarMenuSubButton asChild isActive={isActive(pathname, child.to, true)}>
                <Link to={child.to}>
                  <child.icon />
                  <span>{child.label}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
