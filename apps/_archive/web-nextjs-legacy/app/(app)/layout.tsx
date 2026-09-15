"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUser, removeToken } from "@/lib/auth";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/patients", label: "Pacientes" },
  { href: "/packages", label: "Paquetes" },
  { href: "/calendar", label: "Calendario" },
  { href: "/inventory", label: "Inventario" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userLabel, setUserLabel] = useState<{ name: string; rol: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const payload = getUser();
    if (payload) {
      const name =
        (payload["nombre"] as string | undefined) ??
        (payload["name"] as string | undefined) ??
        (payload["email"] as string | undefined) ??
        "Usuario";
      const rol = (payload["rol"] as string | undefined) ?? "";
      setUserLabel({ name, rol });
    }
    setReady(true);
  }, [router]);

  function handleLogout() {
    removeToken();
    router.replace("/login");
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside
        className="flex flex-col text-white"
        style={{ width: 240, backgroundColor: "#1A3A5C" }}
      >
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center font-bold">
              N
            </div>
            <span className="font-semibold">NemediClinic</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-white/15 font-medium" : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-sm">
          {userLabel && (
            <div className="mb-3">
              <p className="font-medium truncate">{userLabel.name}</p>
              {userLabel.rol && <p className="text-xs text-white/60">{userLabel.rol}</p>}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
