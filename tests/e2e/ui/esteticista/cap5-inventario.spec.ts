import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickCombobox, dialog, lastToast, tab } from "../walk";
import { apiLogin, CREDS, req, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

// Producto propio del recorrido (se crea y se elimina en cada corrida) para no alterar el seed.
const PROD = "Toallas desechables de cabina";
let prodId: string | undefined;

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const c = await req<{ id: string }>("POST", "/api/v1/products", { token: sa.token, body: { nombre: PROD, descripcion: "Paquete x50.", referencia: "TOA-50", tipoProducto: "InsumoCabina", unidadMedida: "paquete", stockMinimo: 5, stockMaximo: 40 } });
  prodId = c.data?.id;
});

test.afterAll(async () => {
  if (!prodId) return;
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  await safeDelete(sa.token, `/api/v1/products/${prodId}`);
});

test("Cap5 · Inventario (esteticista)", async ({ page }) => {
  const w = new Walk(page, "esteticista", 5);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);

  await w.step("Registrar una entrada de 10 paquetes de toallas desechables", async () => {
    await page.goto("/inventory");
    await tab(page, "Entradas").click();
    await page.locator("main button", { hasText: "Registrar entrada" }).click();
    const d = dialog(page);
    await pickCombobox(d.locator("button[role=combobox]").first(), "Toallas", PROD);
    await d.locator("input[type=number]").fill("10");
    await d.locator("button", { hasText: /^Registrar$/ }).click();
    await lastToast(page, /Entrada registrada/);
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator("main table tbody tr", { hasText: PROD }).first()).toContainText("10");
  });

  await w.step("No puede crear productos", async () => {
    await tab(page, "Productos").click();
    await expect(page.locator("main table tbody tr").first()).toBeVisible();
    await expect(page.locator("main button", { hasText: "Nuevo producto" })).toHaveCount(0);
  });

  w.save();
});
