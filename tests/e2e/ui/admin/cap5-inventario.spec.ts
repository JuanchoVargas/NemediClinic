import { test, expect } from "@playwright/test";
import { Walk, uiLogin, dialog, lastToast, tab } from "../walk";
import { apiLogin, CREDS, req, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

// Producto propio del recorrido: nace en 0 con mínimo 20 (aparece en Alertas), recibe la
// entrada de 200 y se elimina al final. Las entradas no se pueden borrar, pero al eliminar
// el producto dejan de verse.
const PROD = "Ampollas de ácido hialurónico";
let prodId: string | undefined;

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const c = await req<{ id: string }>("POST", "/api/v1/products", { token: sa.token, body: { nombre: PROD, descripcion: "Ampollas 2 ml para mesoterapia facial.", referencia: "AMP-AH-2", tipoProducto: "InsumoCabina", unidadMedida: "unidad", stockMinimo: 20, stockMaximo: 100 } });
  prodId = c.data?.id;
});

test.afterAll(async () => {
  if (!prodId) return;
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  await safeDelete(sa.token, `/api/v1/products/${prodId}`);
});

test("Cap5 · Inventario (recepción)", async ({ page }) => {
  const w = new Walk(page, "admin", 5);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);

  const cards = () => page.locator("main [data-slot=card], main .rounded-xl").filter({ hasText: "Stock actual" });
  const card = () => cards().filter({ hasText: PROD }).first();

  await w.step("Alertas de stock bajo", async () => {
    await page.goto("/inventory");
    await tab(page, "Alertas").click();
    await expect(card()).toBeVisible();
    await expect(card()).toContainText("Crítico");
  });

  await w.step("Registrar entrada desde la alerta: el producto llega preseleccionado", async () => {
    await card().locator("button", { hasText: "Registrar entrada" }).click();
    await expect(dialog(page)).toContainText(PROD);
  });

  await w.step("Entrada de 200 unidades → el semáforo cambia y sale de Alertas", async () => {
    const d = dialog(page);
    await d.locator("input[type=number]").fill("200");
    await d.locator("button", { hasText: /^Registrar$/ }).click();
    await lastToast(page, /Entrada registrada/);
    await expect(dialog(page)).toBeHidden();
    await expect(card()).toHaveCount(0);
  });

  await w.step("Historial en el tab Entradas", async () => {
    await tab(page, "Entradas").click();
    const row = page.locator("main table tbody tr", { hasText: PROD }).filter({ hasText: "200" }).first();
    await expect(row).toBeVisible();
  });

  await w.step("Productos: el semáforo del producto quedó en Verde", async () => {
    await tab(page, "Productos").click();
    await expect(page.locator("main table tr", { hasText: PROD })).toContainText("Verde");
  });

  await w.step("Movimientos de inventario por producto", async () => {
    const movTab = page.locator("[role=tab]", { hasText: /Movimientos/i });
    if ((await movTab.count()) === 0) throw new Error("No existe una vista de movimientos en la UI (y GET /inventory/movements/product/{id} responde 500)");
    await movTab.click();
  });

  w.save();
});
