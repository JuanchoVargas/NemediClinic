import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickSelect, dialog, alertDialog } from "../walk";
import { apiLogin, CREDS, listAll, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const PROD = "Sérum vitamina C 30 ml";

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const prods = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/products");
  for (const p of prods.filter((x) => x.nombre === PROD)) await safeDelete(sa.token, `/api/v1/products/${p.id}`);
});

test("Cap4 · Inventario (dueño)", async ({ page }) => {
  const w = new Walk(page, "superadmin", 4);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);

  await w.step("Inventario: productos con semáforo", async () => {
    await page.goto("/inventory");
    await expect(page.locator("main table tbody tr")).toHaveCount(6);
  });

  await w.step(`Crear producto "${PROD}" con stock mínimo 100 → semáforo Rojo`, async () => {
    await page.locator("main button", { hasText: "Nuevo producto" }).click();
    const d = dialog(page);
    await d.locator("input[name=nombre]").fill(PROD);
    await d.locator("input[name=referencia]").fill("SER-VC-30");
    await pickSelect(d.locator("button[role=combobox]").first(), "Venta");
    await d.locator("input[name=unidadMedida]").fill("unidad");
    await d.getByLabel(/Stock mínimo/).fill("100");
    await d.locator("button[form=product-form]").click();
    const row = page.locator("main table tr", { hasText: PROD });
    await expect(row).toContainText("0");
    await expect(row).toContainText("Rojo");
  });

  await w.step("Editar producto (stock mínimo 80)", async () => {
    await page.locator(`button[aria-label="Editar ${PROD}"]`).click();
    const d = dialog(page);
    await d.getByLabel(/Stock mínimo/).fill("80");
    await d.locator("button[form=product-form]").click();
    await expect(page.locator("main table tr", { hasText: PROD })).toContainText("mín 80");
  });

  await w.step("Eliminar producto", async () => {
    await page.locator(`button[aria-label="Eliminar ${PROD}"]`).click();
    await alertDialog(page).locator("button", { hasText: /^Eliminar/ }).click();
    await expect(page.locator("main table")).not.toContainText(PROD);
  });

  w.save();
});
