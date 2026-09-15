import { test, expect } from "@playwright/test";
import { Walk, uiLogin, tab, activePanel } from "../walk";
import { apiLogin, CREDS, findPatient, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const PAT = { nombre: "Camilo", apellido: "Restrepo", cedula: "1020304050", telefono: "3115550101" };

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const p = await findPatient(sa.token, PAT.cedula);
  if (p) await safeDelete(sa.token, `/api/v1/patients/${p.id}`);
});

test("Cap4 · Paciente (esteticista)", async ({ page }) => {
  const w = new Walk(page, "esteticista", 4);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);
  const la = await apiLogin(CREDS.esteticista.email, CREDS.esteticista.password);

  await w.step(`Crear paciente "${PAT.nombre} ${PAT.apellido}"`, async () => {
    await page.goto("/patients/new");
    await page.locator("input[name=nombre]").fill(PAT.nombre);
    await page.locator("input[name=apellido]").fill(PAT.apellido);
    await page.locator("input[name=cedula]").fill(PAT.cedula);
    await page.locator("input[name=telefono]").fill(PAT.telefono);
    await page.locator("main form button[type=submit]").click();
    await page.waitForURL((u) => !/\/patients\/new/.test(u.toString()), { timeout: 15_000 });
    expect(await findPatient(la.token, PAT.cedula), "el paciente debe existir").not.toBeNull();
  });

  await w.step("Abrir la ficha: tab Información", async () => {
    const p = await findPatient(la.token, PAT.cedula);
    await page.goto(`/patients/${p!.id}`);
    await expect(page.locator("main h1")).toContainText(PAT.nombre);
    await expect(activePanel(page)).toContainText(PAT.telefono);
  });

  await w.step("Tab Historia clínica (lectura)", async () => {
    await tab(page, "Historia clínica").click();
    await expect(activePanel(page)).toContainText("Antecedentes");
  });

  await w.step("No existen los tabs Paquetes ni Pagos para la esteticista", async () => {
    await expect(page.locator("[role=tab]")).toHaveCount(2);
    await expect(tab(page, "Paquetes")).toHaveCount(0);
    await expect(tab(page, "Pagos")).toHaveCount(0);
  });

  w.save();
});
