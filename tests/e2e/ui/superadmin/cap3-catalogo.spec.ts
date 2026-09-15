import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, pickCombobox, dialog, alertDialog, closeDialog, headerLink, selectCalendarSlot, goToCalendarWeek } from "../walk";
import { apiLogin, CREDS, listAll, safeDelete, localDate, dayAt } from "../api";

test.describe.configure({ mode: "serial" });

const PROC = "Limpieza facial express";
const PKG = "Duo Facial Express";

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const pkgs = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/packages");
  for (const p of pkgs.filter((x) => x.nombre === PKG)) await safeDelete(sa.token, `/api/v1/packages/${p.id}`);
  const procs = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/procedures");
  for (const p of procs.filter((x) => x.nombre === PROC)) await safeDelete(sa.token, `/api/v1/procedures/${p.id}`);
});

test("Cap3 · Catálogo (dueño)", async ({ page }) => {
  startChapter(page, "superadmin", 3);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);
  const d = () => dialog(page);
  const procRow = () => page.locator("main table tr", { hasText: PROC });
  const procPicker = () => page.locator("button[role=combobox]", { hasText: "Buscar procedimiento" });
  const sesiones = () => page.locator('div:has(> label:text-is("Sesiones")) input[type=number]');

  await step(page, "Haz clic en Procedimientos", headerLink(page, "Procedimientos"), {
    after: async () => { await expect(page.locator("main table")).toContainText("Limpieza facial profunda"); },
  });

  await step(page, "Haz clic en Nuevo procedimiento", page.locator("main button", { hasText: "Nuevo procedimiento" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Completa el formulario con precio 150000 y presiona Crear", d().locator("button[form=procedure-form]"), {
    before: async () => {
      await d().locator("input[name=nombre]").fill(PROC);
      await d().locator("textarea[name=descripcion]").fill("Limpieza rápida de 30 minutos.");
      await d().locator("input[inputmode=numeric]").fill("150000");
      await d().getByLabel(/Duración/).fill("30");
      await d().locator("input[name=areaCorporal]").fill("Rostro");
    },
    after: async () => { await expect(procRow()).toContainText("$150.000"); },
  });

  await step(page, "Haz clic en el lápiz del procedimiento para editarlo", page.locator(`button[aria-label="Editar ${PROC}"]`), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Cambia la duración a 45 y presiona Guardar cambios", d().locator("button[form=procedure-form]"), {
    before: async () => { await d().getByLabel(/Duración/).fill("45"); },
    after: async () => { await expect(procRow()).toContainText("45 min"); },
  });

  await step(page, "Vuelve a editar y apaga el interruptor Activo", d().locator("[role=switch]"), {
    before: async () => { await page.locator(`button[aria-label="Editar ${PROC}"]`).click(); },
  });

  await step(page, "Presiona Guardar cambios: el procedimiento queda Inactivo", d().locator("button[form=procedure-form]"), {
    after: async () => { await expect(procRow()).toContainText("Inactivo"); },
  });

  await step(page, "En el Calendario, haz clic en un espacio libre y abre la lista de procedimientos: el inactivo no debería aparecer", d().locator('div:has(> label:has-text("Procedimiento")) button[role=combobox]'), {
    before: async () => {
      await page.goto("/calendar");
      const day = localDate(dayAt(2));
      await goToCalendarWeek(page, day);
      await selectCalendarSlot(page, day, "19:00:00");
    },
    after: async () => {
      const options = await page.locator("[role=option]").allInnerTexts();
      await page.keyboard.press("Escape");
      expect(options.some((o) => o.includes(PROC)), `el selector muestra "${PROC}" aunque está inactivo`).toBe(false);
    },
  });

  await step(page, "Haz clic en Paquetes y luego en Nuevo paquete", page.locator("main a", { hasText: "Nuevo paquete" }), {
    before: async () => { await closeDialog(page); await headerLink(page, "Paquetes").click(); await expect(page).toHaveURL(/\/packages$/); },
    after: async () => { await expect(page).toHaveURL(/\/packages\/new/); },
  });

  await step(page, "Escribe el nombre, busca Limpieza facial profunda, pon 2 sesiones y presiona Agregar", page.locator("main button", { hasText: "Agregar" }), {
    before: async () => {
      await page.locator("input[name=nombre]").fill(PKG);
      await page.locator("textarea[name=descripcion]").fill("Dos limpiezas profundas y un peeling.");
      await pickCombobox(procPicker(), "Limpieza facial profunda", "Limpieza facial profunda");
      await sesiones().fill("2");
    },
    after: async () => { await expect(page.locator("main")).toContainText("2 sesiones"); },
  });

  await step(page, "Agrega también Peeling químico con 1 sesión", page.locator("main button", { hasText: "Agregar" }), {
    before: async () => {
      await pickCombobox(procPicker(), "Peeling", "Peeling químico");
      await sesiones().fill("1");
    },
    after: async () => {
      await expect(page.locator("main")).toContainText("Total de sesiones: 3");
      await expect(page.locator("main")).toContainText("Precio de referencia: $440.000");
    },
  });

  await step(page, "Escribe un precio menor al de referencia: aparece el aviso de descuento", null, {
    before: async () => { await page.getByLabel(/Precio del paquete/).fill("400000"); },
    after: async () => { await expect(page.locator("main")).toContainText("Este paquete tiene un descuento de $40.000 (9%)"); },
  });

  await step(page, "Presiona Crear paquete", page.locator("main button", { hasText: "Crear paquete" }), {
    after: async () => {
      await page.waitForURL(/\/packages(\/[0-9a-f-]+)?$/, { timeout: 15_000 });
      await expect(page.locator("main")).toContainText(PKG);
    },
  });

  await step(page, "Revisa el detalle del paquete", null, {
    before: async () => {
      if (!/\/packages\/[0-9a-f-]+$/.test(page.url())) {
        await page.goto("/packages");
        await page.locator(`button[aria-label="Ver ${PKG}"]`).click();
      }
    },
    after: async () => {
      await expect(page.locator("main")).toContainText("Procedimientos incluidos");
      await expect(page.locator("main")).toContainText("$400.000");
    },
  });

  await step(page, "En la lista de paquetes, haz clic en la papelera del paquete", page.locator(`button[aria-label="Eliminar ${PKG}"]`), {
    before: async () => { await page.goto("/packages"); },
    after: async () => { await expect(alertDialog(page)).toBeVisible(); },
  });

  await step(page, "Confirma con Eliminar", alertDialog(page).locator("button", { hasText: /^Eliminar/ }), {
    after: async () => { await expect(page.locator("main table")).not.toContainText(PKG); },
  });

  endChapter();
});
