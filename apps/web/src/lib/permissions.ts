// ============================================================
// permissions.ts — Matriz de permisos reflejada en la UI
//
// Fuente de verdad: las policies de cada controller del backend
// (Program.cs: SuperAdmin ⊂ Admin ⊂ Esteticista). La UI OCULTA lo que
// can() niega; el backend sigue siendo quien rechaza con 403.
//
// Diferencias conocidas entre la regla de negocio deseada y lo que el
// backend permite hoy (la UI sigue al backend):
//   - Esteticista NO puede leer paquetes ni paquetes de paciente
//     (PackagesController y PatientPackagesController son policy Admin).
//   - Esteticista SÍ puede crear/editar/eliminar pacientes
//     (PatientsController es policy Esteticista completa).
//   - Admin NO puede crear usuarios (auth/register exige SuperAdmin),
//     pero sí editar/eliminar cualquiera (UsersController policy Admin,
//     sin restringir el rol del usuario objetivo).
//   - Admin puede editar/eliminar sedes; solo crear es SuperAdmin.
//   - Crear cita: el backend deja agendar para cualquier esteticista;
//     la UI fija la esteticista a la propia para el rol Esteticista.
//
// EQUIVALENTE A: el mapa de permisos por rol de SIRECEC (front)
// ============================================================

export type Role = "SuperAdmin" | "Admin" | "Esteticista";

/**
 * Rol de plataforma: vive fuera de todo tenant (su JWT no lleva tenant_id) y solo usa
 * /platform. No entra en la matriz: can() le niega todas las acciones de clínica.
 */
export const PLATFORM_ADMIN = "PlatformAdmin";

export type Action =
  // Pacientes e historia clínica (PatientsController / ClinicalRecordsController: Esteticista)
  | "patients.create"
  | "patients.update"
  | "patients.delete"
  | "clinical.record.update"
  | "clinical.note.create"
  // Citas (AppointmentsController: Esteticista; propias para el rol Esteticista)
  | "appointments.create"
  | "appointments.updateStatus"
  | "appointments.delete"
  | "appointments.filterByEsteticist"
  // Procedimientos (GET: cualquiera; escritura: Admin)
  | "procedures.create"
  | "procedures.update"
  | "procedures.delete"
  // Paquetes de catálogo (todo el controller: Admin)
  | "packages.read"
  | "packages.create"
  | "packages.update"
  | "packages.delete"
  // Paquetes asignados y pagos (PatientPackagesController: Admin)
  | "patientPackages.read"
  | "patientPackages.assign"
  | "patientPackages.updateStatus"
  | "payments.create"
  // Inventario (ProductsController: GET cualquiera, escritura Admin; entradas: cualquiera)
  | "products.create"
  | "products.update"
  | "products.delete"
  | "inventory.entries.create"
  // Usuarios (GET cualquiera; PUT/DELETE Admin; crear = auth/register SuperAdmin)
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.delete"
  // Sedes (GET/PUT/DELETE Admin; POST SuperAdmin)
  | "branches.read"
  | "branches.create"
  | "branches.update"
  | "branches.delete"
  // Tenant propio (TenantsController: SuperAdmin ve y edita SOLO el suyo).
  // Crear/eliminar tenants es del PlatformAdmin (/platform), fuera de esta matriz.
  | "tenants.read"
  | "tenants.update";

const ESTETICISTA: Action[] = [
  "patients.create",
  "patients.update",
  "patients.delete",
  "clinical.record.update",
  "clinical.note.create",
  "appointments.create",
  "appointments.updateStatus",
  "appointments.delete",
  "inventory.entries.create",
  "users.read",
];

const ADMIN: Action[] = [
  ...ESTETICISTA,
  "appointments.filterByEsteticist",
  "procedures.create",
  "procedures.update",
  "procedures.delete",
  "packages.read",
  "packages.create",
  "packages.update",
  "packages.delete",
  "patientPackages.read",
  "patientPackages.assign",
  "patientPackages.updateStatus",
  "payments.create",
  "products.create",
  "products.update",
  "products.delete",
  "users.update",
  "users.delete",
  "branches.read",
  "branches.update",
  "branches.delete",
];

const SUPER_ADMIN: Action[] = [
  ...ADMIN,
  "users.create",
  "branches.create",
  "tenants.read",
  "tenants.update",
];

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  Esteticista: new Set(ESTETICISTA),
  Admin: new Set(ADMIN),
  SuperAdmin: new Set(SUPER_ADMIN),
};

/** ¿Puede el rol ejecutar la acción? Un rol desconocido o ausente no puede nada. */
export function can(action: Action, rol: string | null | undefined): boolean {
  if (!rol) return false;
  const set = MATRIX[rol as Role];
  return set ? set.has(action) : false;
}

export function isRole(rol: string | null | undefined): rol is Role {
  return rol === "SuperAdmin" || rol === "Admin" || rol === "Esteticista";
}
