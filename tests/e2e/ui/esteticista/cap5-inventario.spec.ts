import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, pickCombobox, dialog, lastToast, tab, headerLink } from "../walk";
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
  startChapter(page, "esteticista", 5);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);
  const d = () => dialog(page);

  await step(page, "Haz clic en Inventario y abre la pestaña Entradas", tab(page, "Entradas"), {
    before: async () => { await headerLink(page, "Inventario").click(); await expect(page.locator("main table tbody tr").first()).toBeVisible(); },
    after: async () => { await expect(page.locator("main button", { hasText: "Registrar entrada" })).toBeVisible(); },
  });

  await step(page, "Haz clic en Registrar entrada", page.locator("main button", { hasText: "Registrar entrada" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Busca el producto, escribe la cantidad 10 y presiona Registrar", d().locator("button", { hasText: /^Registrar$/ }), {
    before: async () => {
      await pickCombobox(d().locator("button[role=combobox]").first(), "Toallas", PROD);
      await d().locator("input[type=number]").fill("10");
    },
    after: async () => {
      await lastToast(page, /Entrada registrada/);
      await expect(d()).toBeHidden();
      await expect(page.locator("main table tbody tr", { hasText: PROD }).first()).toContainText("10");
    },
  });

  await step(page, "Abre la pestaña Productos: no hay botón Nuevo producto", tab(page, "Productos"), {
    after: async () => {
      await expect(page.locator("main table tbody tr").first()).toBeVisible();
      await expect(page.locator("main button", { hasText: "Nuevo producto" })).toHaveCount(0);
    },
  });

  endChapter();
});
