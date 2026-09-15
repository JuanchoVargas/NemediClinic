import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, lastToast, tab, activePanel, alertDialog, headerLink } from "../walk";
import { apiLogin, CREDS, findPatient, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const PAT = { nombre: "Laura", apellido: "Restrepo Mejía", cedula: "1010101010", telefono: "3125550202" };

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const p = await findPatient(sa.token, PAT.cedula);
  if (p) await safeDelete(sa.token, `/api/v1/patients/${p.id}`);
});

test("Cap2 · Pacientes (recepción)", async ({ page }) => {
  startChapter(page, "admin", 2);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const ad = await apiLogin(CREDS.admin.email, CREDS.admin.password);
  const search = () => page.locator("main input").first();
  const fillPatient = async (data: typeof PAT) => {
    await page.locator("input[name=nombre]").fill(data.nombre);
    await page.locator("input[name=apellido]").fill(data.apellido);
    await page.locator("input[name=cedula]").fill(data.cedula);
    await page.locator("input[name=telefono]").fill(data.telefono);
  };

  await step(page, "Haz clic en Inicio y luego en la tarjeta Pacientes", page.locator('main a[href="/patients"]').first(), {
    before: async () => { await headerLink(page, /^Inicio$/).click(); },
    after: async () => { await expect(page).toHaveURL(/\/patients$/); },
  });

  await step(page, "Haz clic en Nuevo paciente", page.locator("main a", { hasText: "Nuevo paciente" }), {
    after: async () => { await expect(page).toHaveURL(/\/patients\/new/); },
  });

  await step(page, "Completa nombre, apellido, cédula y teléfono y presiona Crear paciente", page.locator("main form button[type=submit]"), {
    before: async () => { await fillPatient(PAT); },
    after: async () => {
      await page.waitForURL((u) => !/\/patients\/new/.test(u.toString()), { timeout: 15_000 });
      expect(await findPatient(ad.token, PAT.cedula)).not.toBeNull();
    },
  });

  await step(page, "Intenta crear otro paciente con la misma cédula: el sistema lo rechaza con un aviso", page.locator("main form button[type=submit]"), {
    before: async () => { await page.goto("/patients/new"); await fillPatient({ ...PAT, nombre: "Otra", apellido: "Persona" }); },
    after: async () => { await lastToast(page, /Ya existe un paciente con esa cédula/); },
  });

  await step(page, "En Pacientes, escribe 'Valentina' en el buscador", null, {
    before: async () => { await page.goto("/patients"); await search().fill("Valentina"); },
    after: async () => {
      await expect(page.locator("main table tbody tr")).toHaveCount(1);
      await expect(page.locator("main table")).toContainText("Valentina Rodríguez");
    },
  });

  await step(page, "Escribe una cédula en el buscador: 1000000003", null, {
    before: async () => { await search().fill("1000000003"); },
    after: async () => {
      await expect(page.locator("main table tbody tr")).toHaveCount(1);
      await expect(page.locator("main table")).toContainText("Juliana Martínez");
    },
  });

  await step(page, "Busca a Valentina y haz clic en Ver", page.locator("main table tr", { hasText: "Valentina" }).locator("button", { hasText: "Ver" }), {
    before: async () => { await search().fill("Valentina"); await expect(page.locator("main table tbody tr")).toHaveCount(1); },
    after: async () => {
      await expect(page.locator("[role=tab]")).toHaveCount(4);
      await expect(activePanel(page)).toContainText("Datos personales");
    },
  });

  await step(page, "Haz clic en la pestaña Historia clínica", tab(page, "Historia clínica"), {
    after: async () => { await expect(activePanel(page)).toContainText("Rosácea"); },
  });

  await step(page, "Haz clic en la pestaña Paquetes", tab(page, "Paquetes"), {
    after: async () => { await expect(activePanel(page)).toContainText("Rostro Radiante"); },
  });

  await step(page, "Haz clic en la pestaña Pagos", tab(page, "Pagos"), {
    after: async () => { await expect(activePanel(page)).toContainText("$620.000"); },
  });

  await step(page, "Abre la ficha del paciente nuevo y presiona Editar", page.locator("main a", { hasText: "Editar" }), {
    before: async () => {
      const p = await findPatient(ad.token, PAT.cedula);
      await page.goto(`/patients/${p!.id}`);
      await expect(page.locator("main h1")).toContainText(PAT.nombre);
    },
    after: async () => { await expect(page).toHaveURL(/\/edit$/); },
  });

  await step(page, "Cambia el teléfono y presiona Guardar cambios", page.locator("main form button[type=submit]"), {
    before: async () => { await page.locator("input[name=telefono]").fill("3125559999"); },
    after: async () => {
      await page.waitForURL((u) => !/\/edit$/.test(u.toString()), { timeout: 15_000 });
      await expect(page.locator("main")).toContainText("3125559999");
    },
  });

  await step(page, "En la lista, busca al paciente y haz clic en la papelera", page.locator(`main button[aria-label^="Eliminar a ${PAT.nombre}"]`), {
    before: async () => {
      await page.goto("/patients");
      await search().fill(PAT.cedula);
      await expect(page.locator("main table tbody tr")).toHaveCount(1);
    },
    after: async () => { await expect(alertDialog(page)).toBeVisible(); },
  });

  await step(page, "Confirma con Eliminar", alertDialog(page).locator("button", { hasText: /^Eliminar/ }), {
    after: async () => {
      await expect(page.locator("main table")).toContainText("Sin resultados");
      await expect(page.locator("main table tbody tr", { hasText: PAT.apellido })).toHaveCount(0);
    },
  });

  endChapter();
});
