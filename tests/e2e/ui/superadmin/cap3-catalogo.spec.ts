import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickCombobox, dialog, alertDialog, selectCalendarSlot, goToCalendarWeek } from "../walk";
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
  const w = new Walk(page, "superadmin", 3);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);

  await w.step("Procedimientos: catálogo actual", async () => {
    await page.goto("/procedures");
    await expect(page.locator("main table")).toContainText("Limpieza facial profunda");
  });

  await w.step(`Crear procedimiento "${PROC}" con precio 150000`, async () => {
    await page.locator("main button", { hasText: "Nuevo procedimiento" }).click();
    const d = dialog(page);
    await d.locator("input[name=nombre]").fill(PROC);
    await d.locator("textarea[name=descripcion]").fill("Limpieza rápida de 30 minutos.");
    await d.locator("input[inputmode=numeric]").fill("150000");
    await d.getByLabel(/Duración/).fill("30");
    await d.locator("input[name=areaCorporal]").fill("Rostro");
    await d.locator("button[form=procedure-form]").click();
    const row = page.locator("main table tr", { hasText: PROC });
    await expect(row).toContainText("$150.000");
  });

  await w.step("Editar procedimiento (duración 45 min)", async () => {
    await page.locator(`button[aria-label="Editar ${PROC}"]`).click();
    const d = dialog(page);
    await d.getByLabel(/Duración/).fill("45");
    await d.locator("button[form=procedure-form]").click();
    await expect(page.locator("main table tr", { hasText: PROC })).toContainText("45 min");
  });

  await w.step("Desactivar procedimiento", async () => {
    await page.locator(`button[aria-label="Editar ${PROC}"]`).click();
    const d = dialog(page);
    await d.locator("[role=switch]").click();
    await d.locator("button[form=procedure-form]").click();
    await expect(page.locator("main table tr", { hasText: PROC })).toContainText("Inactivo");
  });

  await w.step("El procedimiento inactivo no aparece al crear una cita", async () => {
    await page.goto("/calendar");
    const day = localDate(dayAt(2));
    await goToCalendarWeek(page, day);
    await selectCalendarSlot(page, day, "19:00:00");
    const d = dialog(page);
    await d.locator('div:has(> label:has-text("Procedimiento")) button[role=combobox]').click();
    const options = await page.locator("[role=option]").allInnerTexts();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    const discard = alertDialog(page).locator("button", { hasText: "Descartar" });
    if (await discard.count()) await discard.click();
    expect(options.some((o) => o.includes(PROC)), `el select muestra "${PROC}" inactivo`).toBe(false);
  });

  await w.step(`Crear paquete "${PKG}" con 2 procedimientos`, async () => {
    await page.goto("/packages/new");
    await page.locator("input[name=nombre]").fill(PKG);
    await page.locator("textarea[name=descripcion]").fill("Dos limpiezas profundas y un peeling.");
    await pickCombobox(page.locator("button[role=combobox]", { hasText: "Buscar procedimiento" }), "Limpieza facial profunda", "Limpieza facial profunda");
    await page.locator('div:has(> label:text-is("Sesiones")) input[type=number]').fill("2");
    await page.locator("main button", { hasText: "Agregar" }).click();
    await pickCombobox(page.locator("button[role=combobox]", { hasText: "Buscar procedimiento" }), "Peeling", "Peeling químico");
    await page.locator('div:has(> label:text-is("Sesiones")) input[type=number]').fill("1");
    await page.locator("main button", { hasText: "Agregar" }).click();
    await expect(page.locator("main")).toContainText("Precio de referencia: $440.000");
    await expect(page.locator("main")).toContainText("Total de sesiones: 3");
  });

  await w.step("Precio con descuento muestra el aviso", async () => {
    await page.getByLabel(/Precio del paquete/).fill("400000");
    await expect(page.locator("main")).toContainText("Este paquete tiene un descuento de $40.000 (9%)");
  });

  await w.step("Guardar el paquete", async () => {
    await page.locator("main button", { hasText: "Crear paquete" }).click();
    await page.waitForURL(/\/packages(\/[0-9a-f-]+)?$/, { timeout: 15_000 });
    await expect(page.locator("main")).toContainText(PKG);
  });

  await w.step("Detalle del paquete", async () => {
    if (!/\/packages\/[0-9a-f-]+$/.test(page.url())) {
      await page.goto("/packages");
      await page.locator(`button[aria-label="Ver ${PKG}"]`).click();
    }
    await expect(page.locator("main")).toContainText("Procedimientos incluidos");
    await expect(page.locator("main")).toContainText("$400.000");
  });

  await w.step("Eliminar el paquete", async () => {
    await page.goto("/packages");
    await page.locator(`button[aria-label="Eliminar ${PKG}"]`).click();
    await alertDialog(page).locator("button", { hasText: /^Eliminar/ }).click();
    await expect(page.locator("main table")).not.toContainText(PKG);
  });

  w.save();
});
