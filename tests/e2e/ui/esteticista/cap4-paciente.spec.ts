import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, tab, activePanel, headerLink } from "../walk";
import { apiLogin, CREDS, findPatient, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const PAT = { nombre: "Camilo", apellido: "Restrepo", cedula: "1020304050", telefono: "3115550101" };

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const p = await findPatient(sa.token, PAT.cedula);
  if (p) await safeDelete(sa.token, `/api/v1/patients/${p.id}`);
});

test("Cap4 · Pacientes (esteticista)", async ({ page }) => {
  startChapter(page, "esteticista", 4);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);
  const la = await apiLogin(CREDS.esteticista.email, CREDS.esteticista.password);

  await step(page, "Haz clic en Inicio y luego en la tarjeta Pacientes", page.locator('main a[href="/patients"]').first(), {
    before: async () => { await headerLink(page, /^Inicio$/).click(); },
    after: async () => { await expect(page).toHaveURL(/\/patients$/); },
  });

  await step(page, "Haz clic en Nuevo paciente", page.locator("main a", { hasText: "Nuevo paciente" }), {
    after: async () => { await expect(page).toHaveURL(/\/patients\/new/); },
  });

  await step(page, "Completa nombre, apellido, cédula y teléfono y presiona Crear paciente", page.locator("main form button[type=submit]"), {
    before: async () => {
      await page.locator("input[name=nombre]").fill(PAT.nombre);
      await page.locator("input[name=apellido]").fill(PAT.apellido);
      await page.locator("input[name=cedula]").fill(PAT.cedula);
      await page.locator("input[name=telefono]").fill(PAT.telefono);
    },
    after: async () => {
      await page.waitForURL((u) => !/\/patients\/new/.test(u.toString()), { timeout: 15_000 });
      expect(await findPatient(la.token, PAT.cedula), "el paciente debe existir").not.toBeNull();
    },
  });

  await step(page, "Abre la ficha del paciente: pestaña Información", null, {
    before: async () => {
      const p = await findPatient(la.token, PAT.cedula);
      await page.goto(`/patients/${p!.id}`);
    },
    after: async () => {
      await expect(page.locator("main h1")).toContainText(PAT.nombre);
      await expect(activePanel(page)).toContainText(PAT.telefono);
    },
  });

  await step(page, "Haz clic en la pestaña Historia clínica", tab(page, "Historia clínica"), {
    after: async () => { await expect(activePanel(page)).toContainText("Antecedentes"); },
  });

  await step(page, "Observa que no existen las pestañas Paquetes ni Pagos", null, {
    after: async () => {
      await expect(page.locator("[role=tab]")).toHaveCount(2);
      await expect(tab(page, "Paquetes")).toHaveCount(0);
      await expect(tab(page, "Pagos")).toHaveCount(0);
    },
  });

  endChapter();
});
