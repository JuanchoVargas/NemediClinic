// ============================================================
// SuspendedBanner.tsx — Aviso de cuenta suspendida
//
// Tenant en estado Suspendido = solo lectura: el backend responde 423
// "Cuenta suspendida por mora" a cualquier escritura. El banner lo
// anticipa para que el usuario no se entere al guardar.
// ============================================================
import { TriangleAlert } from "lucide-react";
import { useCurrentTenant } from "@/api/tenants.api";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth.store";

export function SuspendedBanner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { isPlatformAdmin } = usePermissions();
  // El PlatformAdmin no pertenece a ningún tenant: no hay nada que consultar.
  const { data: tenant } = useCurrentTenant(isAuthenticated && !isPlatformAdmin);

  if (!isAuthenticated || tenant?.estado !== "Suspendido") return null;

  return (
    <div
      role="alert"
      className="border-b border-destructive/30 bg-destructive/10 text-destructive"
    >
      <div className="container mx-auto flex items-center gap-2 px-4 py-2 text-sm">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Cuenta suspendida por mora.</span>{" "}
          Puedes consultar la información, pero no crear ni modificar registros
          hasta regularizar el pago.
        </p>
      </div>
    </div>
  );
}
