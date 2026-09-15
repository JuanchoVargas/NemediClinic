import { test, expect } from "@playwright/test";
import { Walk, uiLogin, lastToast, tab, activePanel, alertDialog } from "../walk";
import { apiLogin, CREDS, findPatient, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const PAT = { nombre: "Laura", apellido: "Restrepo Mejía", cedula: "1010101010", telefono: "3125550202" };

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const p = await findPatient(sa.token, PAT.cedula);
  if (p) await safeDelete(sa.token, `/api/v1/patients/${p.id}`);
});

async function fillPatient(page: import("@playwright/test").Page, data: typeof PAT) {
  await page.goto("/patients/new");
  await page.locator("input[name=nombre]").fill(data.nombre);
  await page.locator("input[name=apellido]").fill(data.apellido);
  await page.locator("input[name=cedula]").fill(data.cedula);
  await page.locator("input[name=telefono]").fill(data.telefono);
  await page.locator("main form button[type=submit]").click();
}

test("Cap2 · Pacientes (recepción)", async ({ page }) => {
  const w = new Walk(page, "admin", 2);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const ad = await apiLogin(CREDS.admin.email, CREDS.admin.password);

  await w.step(`Crear paciente "${PAT.nombre} ${PAT.apellido}"`, async () => {
    await fillPatient(page, PAT);
    await page.waitForURL((u) => !/\/patients\/new/.test(u.toString()), { timeout: 15_000 });
    expect(await findPatient(ad.token, PAT.cedula)).not.toBeNull();
  });

  await w.step("Cédula duplicada: el sistema lo rechaza con un aviso", async () => {
    await fillPatient(page, { ...PAT, nombre: "Otra", apellido: "Persona" });
    await lastToast(page, /Ya existe un paciente con esa cédula/);
  });

  await w.step("Buscar por nombre: 'Valentina'", async () => {
    await page.goto("/patients");
    await page.locator("main input").first().fill("Valentina");
    await expect(page.locator("main table tbody tr")).toHaveCount(1);
    await expect(page.locator("main table")).toContainText("Valentina Rodríguez");
  });

  await w.step("Buscar por cédula: '1000000003'", async () => {
    await page.locator("main input").first().fill("1000000003");
    await expect(page.locator("main table tbody tr")).toHaveCount(1);
    await expect(page.locator("main table")).toContainText("Juliana Martínez");
  });

  const valentina = await findPatient(ad.token, "1000000001");
  await w.step("Ficha de Valentina: tab Información", async () => {
    await page.goto(`/patients/${valentina!.id}`);
    await expect(page.locator("[role=tab]")).toHaveCount(4);
    await expect(activePanel(page)).toContainText("Datos personales");
  });
  await w.step("Ficha de Valentina: tab Historia clínica", async () => {
    await tab(page, "Historia clínica").click();
    await expect(activePanel(page)).toContainText("Rosácea");
  });
  await w.step("Ficha de Valentina: tab Paquetes", async () => {
    await tab(page, "Paquetes").click();
    await expect(activePanel(page)).toContainText("Rostro Radiante");
  });
  await w.step("Ficha de Valentina: tab Pagos", async () => {
    await tab(page, "Pagos").click();
    await expect(activePanel(page)).toContainText("$620.000");
  });

  await w.step("Editar teléfono del paciente nuevo", async () => {
    const p = await findPatient(ad.token, PAT.cedula);
    await page.goto(`/patients/${p!.id}/edit`);
    await page.locator("input[name=telefono]").fill("3125559999");
    await page.locator("main form button[type=submit]").click();
    await page.waitForURL((u) => !/\/edit$/.test(u.toString()), { timeout: 15_000 });
    await expect(page.locator("main")).toContainText("3125559999");
  });

  await w.step("Eliminar el paciente nuevo", async () => {
    await page.goto("/patients");
    await page.locator("main input").first().fill(PAT.cedula);
    await expect(page.locator("main table tbody tr")).toHaveCount(1);
    await page.locator(`main button[aria-label^="Eliminar a ${PAT.nombre}"]`).click();
    await alertDialog(page).locator("button", { hasText: /^Eliminar/ }).click();
    await expect(page.locator("main table")).toContainText("Sin resultados");
    await expect(page.locator("main table tbody tr", { hasText: PAT.apellido })).toHaveCount(0);
  });

  w.save();
});
