import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, tab, activePanel, headerLink, dialog, option } from "../walk";
import { samplePng } from "../helpers/sample-image";
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

  await step(page, "Haz clic en Pacientes, en el menú lateral", headerLink(page, "Pacientes"), {
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

  await step(page, "Presiona Nueva nota para registrar la sesión de hoy", activePanel(page).locator("button", { hasText: "Nueva nota" }).first(), {
    after: async () => { await expect(dialog(page)).toContainText("Nueva nota clínica"); },
  });

  await step(page, "Presiona Agregar producto y anota lo que gastaste en la sesión", dialog(page).locator("button", { hasText: "Agregar producto" }), {
    before: async () => {
      await dialog(page).locator("button[role=combobox]").first().click();
      await option(page, "Limpieza facial profunda").click();
      await dialog(page).locator("textarea[name=observaciones]").fill("Piel mixta. Se realiza limpieza profunda con buena tolerancia.");
    },
    after: async () => {
      await dialog(page).locator('button[aria-label="Producto 1"]').click();
      await option(page, /Crema hidratante/).click();
      await dialog(page).locator('input[aria-label="Cantidad del producto 1"]').fill("1");
      await expect(dialog(page)).toContainText(/Quedan \d+/);
    },
  });

  await step(page, "Agrega una foto en Antes y otra en Después, y presiona Guardar nota", dialog(page).locator("button[form=clinical-note-form]"), {
    before: async () => {
      await dialog(page).locator('input[aria-label="Agregar fotos Antes"]').setInputFiles({ name: "antes.png", mimeType: "image/png", buffer: samplePng([214, 150, 130], [240, 200, 185], 60) });
      await expect(dialog(page).locator('img[alt="Foto Antes"]')).toBeVisible();
      await dialog(page).locator('input[aria-label="Agregar fotos Después"]').setInputFiles({ name: "despues.png", mimeType: "image/png", buffer: samplePng([232, 190, 172], [250, 228, 216], 8) });
      await expect(dialog(page).locator('img[alt="Foto Después"]')).toBeVisible();
    },
    after: async () => {
      await expect(dialog(page)).toBeHidden();
      await expect(activePanel(page)).toContainText("Limpieza facial profunda");
    },
  });

  await step(page, "Haz clic en la pestaña Evolución: la sesión aparece con sus fotos y el comparador de antes y después", tab(page, "Evolución"), {
    after: async () => {
      await expect(activePanel(page)).toContainText("Sesión 1");
      await expect(activePanel(page)).toContainText("Desliza para comparar");
      await expect(activePanel(page).locator("ul[aria-label='Fotos de la sesión'] img")).toHaveCount(2);
    },
  });

  await step(page, "Haz clic en una foto para verla en grande; cierra con Escape", activePanel(page).locator("ul[aria-label='Fotos de la sesión'] img").first(), {
    after: async () => {
      await expect(page.locator(".yarl__container")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".yarl__container")).toBeHidden();
    },
  });

  await step(page, "Observa que no existen las pestañas Paquetes ni Pagos", null, {
    after: async () => {
      await expect(page.locator("[role=tab]")).toHaveCount(4); // Información, Historia clínica, Evolución, Consentimientos
      await expect(tab(page, "Paquetes")).toHaveCount(0);
      await expect(tab(page, "Pagos")).toHaveCount(0);
    },
  });

  endChapter();
});
