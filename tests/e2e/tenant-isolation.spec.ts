// F03 · Aislamiento multi-tenant como gate de push.
//
// Crea dos tenants (A y B) con SuperAdmin, sede, procedimiento, producto,
// paciente, paquete, paquete asignado y cita; hace login con cada uno y
// verifica que ninguno ve nada del otro (listas vacías de cruces y 404 al
// pedir ids ajenos). Con SQL comprueba que las filas sí existen en la base,
// para que un 404 legítimo no se confunda con "no había datos".
//
// Requisitos: API en 5055 (playwright.config la levanta si hace falta), base
// NemediClinic_Dev con un SuperAdmin existente (credenciales por env o las del
// seed demo) y `sqlcmd` con autenticación de Windows.
//
// Nota: no existe endpoint para crear el SuperAdmin de un tenant nuevo
// (`auth/register` usa el tenant del JWT). El test registra el usuario en el
// tenant del SuperAdmin y lo mueve por SQL. Cuando exista onboarding real,
// reemplazar `createTenantWithOwner`.
import { test, expect, type APIRequestContext } from "@playwright/test";
import { hardDeleteTenants, lit, scalar, sql } from "./sql";

const ADMIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL ?? "juandiegov2002@gmail.com";
const ADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? "Admin2026!";
const RUN = Date.now().toString(36);
const PASSWORD = "E2eTenant2026!";

type TenantData = {
  name: string;
  tenantId: string;
  token: string;
  userId: string;
  branchId: string;
  procedureId: string;
  productId: string;
  patientId: string;
  packageId: string;
  patientPackageId: string;
  appointmentId: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const localIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function login(api: APIRequestContext, email: string, password: string) {
  const res = await api.post("/api/v1/auth/login", { data: { email, password } });
  expect(res.status(), `login ${email}`).toBe(200);
  return (await res.json()) as { token: string; userInfo: { id: string; tenantId: string; rol: string } };
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function postJson(api: APIRequestContext, token: string, url: string, data: unknown) {
  const res = await api.post(url, { ...auth(token), data });
  expect(res.status(), `POST ${url} → ${await res.text()}`).toBeLessThan(300);
  return (await res.json()) as { id: string };
}

/** Crea tenant + SuperAdmin propio (registro en el tenant del admin y traslado por SQL). */
async function createTenantWithOwner(api: APIRequestContext, adminToken: string, label: string) {
  const tenant = await postJson(api, adminToken, "/api/v1/tenants", {
    nombre: `E2E Tenant ${label} ${RUN}`,
    nit: `E2E-${label}-${RUN}`,
    telefono: "6010000000",
    email: `tenant-${label}-${RUN}@e2e.local`,
  });
  const email = `owner-${label}-${RUN}@e2e.local`;
  const user = await postJson(api, adminToken, "/api/v1/auth/register", {
    nombre: "Owner",
    apellido: label,
    email,
    password: PASSWORD,
    rol: "SuperAdmin",
  });
  sql(`UPDATE Users SET TenantId = ${lit(tenant.id)}, BranchId = NULL WHERE Id = ${lit(user.id)};`);
  const session = await login(api, email, PASSWORD);
  expect(session.userInfo.tenantId.toLowerCase(), "el JWT debe llevar el tenant nuevo").toBe(tenant.id.toLowerCase());
  return { tenantId: tenant.id, token: session.token, userId: session.userInfo.id };
}

/** Puebla un tenant con un registro de cada agregado que se quiere aislar. */
async function seedTenant(api: APIRequestContext, label: string, base: { tenantId: string; token: string; userId: string }): Promise<TenantData> {
  const t = base.token;
  const branch = await postJson(api, t, "/api/v1/branches", { nombre: `Sede ${label}`, direccion: "Calle 1", telefono: "6010000001" });
  const procedure = await postJson(api, t, "/api/v1/procedures", {
    nombre: `Procedimiento ${label}`, descripcion: "e2e", precioBase: 100000, duracionMinutos: 30, areaCorporal: "Rostro",
  });
  const product = await postJson(api, t, "/api/v1/products", {
    nombre: `Producto ${label}`, descripcion: "e2e", tipoProducto: "InsumoCabina", unidadMedida: "unidad", stockMinimo: 5,
  });
  const patient = await postJson(api, t, "/api/v1/patients", {
    nombre: "Paciente", apellido: label, cedula: `E2E${label}${RUN}`.slice(0, 20), telefono: "3000000000",
  });
  const pkg = await postJson(api, t, "/api/v1/packages", {
    nombre: `Paquete ${label}`, descripcion: "e2e", precioTotal: 250000, sesionesTotales: 2, vigenciaDias: 60, diasAlertaVencimiento: 10,
  });
  await postJson(api, t, `/api/v1/packages/${pkg.id}/procedures`, { procedureId: procedure.id, cantidadSesiones: 2 });
  const pp = await postJson(api, t, "/api/v1/patient-packages", {
    patientId: patient.id, packageId: pkg.id, precioAcordado: 250000, fechaInicio: localDate(new Date()),
  });
  const start = new Date(); start.setDate(start.getDate() + 30); start.setHours(9, 0, 0, 0);
  const appointment = await postJson(api, t, "/api/v1/appointments", {
    patientId: patient.id, esteticistId: base.userId, procedureId: procedure.id, branchId: branch.id, fechaInicio: localIso(start),
  });
  return {
    name: label, tenantId: base.tenantId, token: t, userId: base.userId, branchId: branch.id,
    procedureId: procedure.id, productId: product.id, patientId: patient.id, packageId: pkg.id,
    patientPackageId: pp.id, appointmentId: appointment.id,
  };
}

async function listIds(api: APIRequestContext, token: string, url: string): Promise<string[]> {
  const res = await api.get(url, auth(token));
  expect(res.status(), `GET ${url}`).toBe(200);
  const body = await res.json();
  const items: { id: string }[] = Array.isArray(body) ? body : body.items ?? [];
  return items.map((x) => x.id.toLowerCase());
}

/** `viewer` no debe ver nada de `other`. */
async function expectNoCrossAccess(api: APIRequestContext, viewer: TenantData, other: TenantData) {
  const from = new Date(); from.setDate(from.getDate() - 1);
  const to = new Date(); to.setDate(to.getDate() + 60);
  const lists: Record<string, string> = {
    patients: "/api/v1/patients?page=1&pageSize=200",
    appointments: `/api/v1/appointments?start=${localIso(from)}&end=${localIso(to)}`,
    products: "/api/v1/products?page=1&pageSize=200",
    packages: "/api/v1/packages?page=1&pageSize=200",
    "patient-packages": `/api/v1/patient-packages/patient/${viewer.patientId}`,
  };
  const foreignIds: Record<string, string> = {
    patients: other.patientId,
    appointments: other.appointmentId,
    products: other.productId,
    packages: other.packageId,
    "patient-packages": other.patientPackageId,
  };
  const ownIds: Record<string, string> = {
    patients: viewer.patientId,
    appointments: viewer.appointmentId,
    products: viewer.productId,
    packages: viewer.packageId,
    "patient-packages": viewer.patientPackageId,
  };

  for (const [name, url] of Object.entries(lists)) {
    const ids = await listIds(api, viewer.token, url);
    expect(ids, `${viewer.name} lista ${name}: no debe incluir el registro de ${other.name}`).not.toContain(foreignIds[name].toLowerCase());
    expect(ids, `${viewer.name} lista ${name}: debe incluir su propio registro`).toContain(ownIds[name].toLowerCase());
  }

  // Ids ajenos → 404 (nunca 200 ni 403, que confirmaría existencia)
  const byId: [string, string][] = [
    ["patients", `/api/v1/patients/${other.patientId}`],
    ["clinical-record", `/api/v1/patients/${other.patientId}/clinical-record`],
    ["appointments", `/api/v1/appointments/${other.appointmentId}`],
    ["products", `/api/v1/products/${other.productId}`],
    ["packages", `/api/v1/packages/${other.packageId}`],
    ["patient-packages", `/api/v1/patient-packages/${other.patientPackageId}`],
  ];
  for (const [name, url] of byId) {
    const res = await api.get(url, auth(viewer.token));
    expect(res.status(), `${viewer.name} GET ${name} ajeno debe ser 404`).toBe(404);
  }

  // Lista de paquetes de un paciente ajeno: vacía o 404, nunca con datos
  const foreignPp = await api.get(`/api/v1/patient-packages/patient/${other.patientId}`, auth(viewer.token));
  if (foreignPp.status() === 200) {
    expect(await foreignPp.json(), `${viewer.name} paquetes del paciente de ${other.name}`).toEqual([]);
  } else {
    expect(foreignPp.status()).toBe(404);
  }

  // Escritura cruzada: agendar cita con el paciente ajeno debe fallar (el paciente "no existe" en este tenant)
  const start = new Date(); start.setDate(start.getDate() + 31); start.setHours(9, 0, 0, 0);
  const cross = await api.post("/api/v1/appointments", {
    ...auth(viewer.token),
    data: { patientId: other.patientId, esteticistId: viewer.userId, procedureId: viewer.procedureId, branchId: viewer.branchId, fechaInicio: localIso(start) },
  });
  expect(cross.status(), `${viewer.name} no puede agendar con paciente de ${other.name}`).toBe(400);
}

test.describe("F03 · aislamiento multi-tenant", () => {
  const created: string[] = [];

  test.afterAll(() => {
    // Borrado físico de todo lo creado por el test (tenants con NIT E2E-...)
    hardDeleteTenants(created, RUN);
    const leftovers = scalar(`SELECT COUNT(*) FROM Tenants WHERE NIT LIKE 'E2E-%-${RUN}'`);
    expect(Number(leftovers)).toBe(0);
  });

  test("dos tenants con datos no se ven entre sí", async ({ request: api }) => {
    const admin = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(admin.userInfo.rol).toBe("SuperAdmin");

    const ownerA = await createTenantWithOwner(api, admin.token, "A");
    created.push(ownerA.tenantId);
    const ownerB = await createTenantWithOwner(api, admin.token, "B");
    created.push(ownerB.tenantId);

    const A = await seedTenant(api, "A", ownerA);
    const B = await seedTenant(api, "B", ownerB);

    // Las filas existen en la base con el TenantId correcto (stamping desde el JWT)
    for (const t of [A, B]) {
      const counts = sql(`
        SELECT
          (SELECT COUNT(*) FROM Patients WHERE TenantId = ${lit(t.tenantId)}),
          (SELECT COUNT(*) FROM Appointments WHERE TenantId = ${lit(t.tenantId)}),
          (SELECT COUNT(*) FROM Products WHERE TenantId = ${lit(t.tenantId)}),
          (SELECT COUNT(*) FROM Packages WHERE TenantId = ${lit(t.tenantId)}),
          (SELECT COUNT(*) FROM PatientPackages WHERE TenantId = ${lit(t.tenantId)})`)[0];
      expect(counts, `filas en SQL del tenant ${t.name}`).toEqual(["1", "1", "1", "1", "1"]);
    }

    // Aislamiento en ambas direcciones
    await expectNoCrossAccess(api, A, B);
    await expectNoCrossAccess(api, B, A);

    // El tenant original tampoco ve los de prueba
    const adminPatients = await listIds(api, admin.token, "/api/v1/patients?page=1&pageSize=500");
    expect(adminPatients).not.toContain(A.patientId.toLowerCase());
    expect(adminPatients).not.toContain(B.patientId.toLowerCase());
  });

  test("sin JWT válido no hay acceso a datos de ningún tenant", async ({ request: api }) => {
    // Sin token → 401. Token con firma inválida → 401 (la autenticación falla antes del TenantMiddleware).
    // El caso "JWT válido sin claim tenant_id → 403" requiere firmar con la clave del servidor y
    // se cubre manualmente en docs/FLUJOS.md (F03); aquí solo se garantiza que no hay acceso anónimo.
    const anon = await api.get("/api/v1/patients");
    expect(anon.status()).toBe(401);
    const forged = await api.get("/api/v1/patients", auth("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4IiwiZXhwIjo0MTAyNDQ0ODAwfQ.invalid"));
    expect(forged.status()).toBe(401);
  });
});
