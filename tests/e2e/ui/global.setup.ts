// Setup global del recorrido de UI:
//   1. Seed demo idempotente (POST /dev/seed-demo, solo Development).
//   2. Usuario Admin recepcion@nemedi.demo / Demo2026! en Sede Principal (si no existe).
//   3. Limpia capturas y resultados previos.
import { test as setup, expect } from "@playwright/test";
import { rmSync, mkdirSync } from "node:fs";
import { apiLogin, CREDS, listAll, req, localIso, dayAt } from "./api";
import { IMG_DIR, RESULTS_DIR } from "./walk";

const TEMP_PASSWORD = "Temporal2026!";

setup("seed demo + usuario de recepción", async () => {
  const seed = await req("POST", "/api/v1/dev/seed-demo?reanchor=true");
  expect(seed.status, `seed-demo → ${seed.text}`).toBe(200);

  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const existing = await req("POST", "/api/v1/auth/login", { body: CREDS.admin });
  if (existing.status !== 200) {
    const branches = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/branches");
    const principal = branches.find((b) => /principal/i.test(b.nombre)) ?? branches[0];
    const r = await req("POST", "/api/v1/auth/register", {
      token: sa.token,
      body: { nombre: "Recepción", apellido: "Nemedi", email: CREDS.admin.email, password: TEMP_PASSWORD, rol: "Admin", branchId: principal?.id },
    });
    expect(r.status, `register recepcion → ${r.text}`).toBe(201);

    // Un usuario recién creado debe cambiar su contraseña: se hace aquí por API para que el
    // recorrido de recepción entre directo con su clave definitiva.
    const temp = await req<{ token: string }>("POST", "/api/v1/auth/login", { body: { email: CREDS.admin.email, password: TEMP_PASSWORD } });
    const changed = await req("POST", "/api/v1/auth/change-password", {
      token: temp.data!.token,
      body: { currentPassword: TEMP_PASSWORD, newPassword: CREDS.admin.password },
    });
    expect(changed.status, `change-password recepcion → ${changed.text}`).toBe(200);
  }

  // Residuos de corridas anteriores interrumpidas: citas del recorrido (por sus notas) y
  // paquetes propios del recorrido. Una cita se borra regresándola a Agendada primero.
  const from = localIso(dayAt(-1));
  const to = localIso(dayAt(14));
  const stray = (await req<{ id: string; notas?: string | null }[]>("GET", `/api/v1/appointments?start=${from}&end=${to}`, { token: sa.token })).data ?? [];
  for (const a of stray.filter((x) => /recorrido de manual/.test(x.notas ?? ""))) {
    await req("PUT", `/api/v1/appointments/${a.id}/status`, { token: sa.token, body: { estado: "Agendada" } });
    await req("DELETE", `/api/v1/appointments/${a.id}`, { token: sa.token });
  }
  const pkgs = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/packages");
  for (const p of pkgs.filter((x) => /^Plan (Piel Luminosa|Mantenimiento Facial)$/.test(x.nombre))) {
    await req("DELETE", `/api/v1/packages/${p.id}`, { token: sa.token });
  }

  for (const rol of ["superadmin", "admin", "esteticista"]) rmSync(`${IMG_DIR}/${rol}`, { recursive: true, force: true });
  rmSync(RESULTS_DIR, { recursive: true, force: true });
  mkdirSync(RESULTS_DIR, { recursive: true });
});
