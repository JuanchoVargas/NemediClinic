import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, pickSelect, dialog, alertDialog, headerLink } from "../walk";
import { apiLogin, CREDS, listAll, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const PROD = "Sérum vitamina C 30 ml";

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const prods = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/products");
  for (const p of prods.filter((x) => x.nombre === PROD)) await safeDelete(sa.token, `/api/v1/products/${p.id}`);
});

test("Cap4 · Inventario (dueño)", async ({ page }) => {
  startChapter(page, "superadmin", 4);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);
  const d = () => dialog(page);
  const row = () => page.locator("main table tr", { hasText: PROD });

  await step(page, "Haz clic en Inventario", headerLink(page, "Inventario"), {
    after: async () => { await expect(page.locator("main table tbody tr")).toHaveCount(6); },
  });

  await step(page, "Haz clic en Nuevo producto", page.locator("main button", { hasText: "Nuevo producto" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Completa el producto con stock mínimo 100 y presiona Crear: queda en Rojo", d().locator("button[form=product-form]"), {
    before: async () => {
      await d().locator("input[name=nombre]").fill(PROD);
      await d().locator("input[name=referencia]").fill("SER-VC-30");
      await pickSelect(d().locator("button[role=combobox]").first(), "Venta");
      await d().locator("input[name=unidadMedida]").fill("unidad");
      await d().getByLabel(/Stock mínimo/).fill("100");
    },
    after: async () => { await expect(row()).toContainText("Rojo"); },
  });

  await step(page, "Haz clic en el lápiz del producto para editarlo", page.locator(`button[aria-label="Editar ${PROD}"]`), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Cambia el stock mínimo a 80 y presiona Guardar cambios", d().locator("button[form=product-form]"), {
    before: async () => { await d().getByLabel(/Stock mínimo/).fill("80"); },
    after: async () => { await expect(row()).toContainText("mín 80"); },
  });

  await step(page, "Haz clic en la papelera del producto", page.locator(`button[aria-label="Eliminar ${PROD}"]`), {
    after: async () => { await expect(alertDialog(page)).toBeVisible(); },
  });

  await step(page, "Confirma con Eliminar", alertDialog(page).locator("button", { hasText: /^Eliminar/ }), {
    after: async () => { await expect(page.locator("main table")).not.toContainText(PROD); },
  });

  endChapter();
});
