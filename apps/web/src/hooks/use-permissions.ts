// ============================================================
// use-permissions.ts — can() atado al rol de la sesión actual
//
// Uso en componentes:
//   const { can, role, userId, isPlatformAdmin } = usePermissions();
//   {can("patients.create") && <Button>Nuevo paciente</Button>}
//
// EQUIVALENTE A: un getter del store de sesión en Pinia
// ============================================================
import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { can as canFor, PLATFORM_ADMIN, type Action } from "@/lib/permissions";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;
  const userId = user?.id != null ? String(user.id) : null;
  const can = useCallback((action: Action) => canFor(action, role), [role]);
  return { can, role, userId, isPlatformAdmin: role === PLATFORM_ADMIN };
}
