import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, dialog, lastToast, tab, headerLink, activePanel } from "../walk";
import { apiLogin, CREDS, req, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

// Producto propio del recorrido: nace en 0 con mínimo 20 (aparece en Alertas), recibe la
// entrada de 200 y se elimina al final.
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
  startChapter(page, "admin", 5);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const d = () => dialog(page);
  const cards = () => page.locator("main [data-slot=card], main .rounded-xl").filter({ hasText: "Stock actual" });
  const card = () => cards().filter({ hasText: PROD }).first();

  await step(page, "Haz clic en Inventario y abre la pestaña Alertas", tab(page, "Alertas"), {
    before: async () => { await headerLink(page, "Inventario").click(); await expect(page.locator("main table tbody tr").first()).toBeVisible(); },
    after: async () => { await expect(card()).toBeVisible(); await expect(card()).toContainText("Crítico"); },
  });

  await step(page, "Presiona Registrar entrada en la tarjeta del producto: llega preseleccionado", card().locator("button", { hasText: "Registrar entrada" }), {
    after: async () => { await expect(d()).toContainText(PROD); },
  });

  await step(page, "Escribe 200 como cantidad y presiona Registrar: el producto sale de Alertas", d().locator("button", { hasText: /^Registrar$/ }), {
    before: async () => { await d().locator("input[type=number]").fill("200"); },
    after: async () => {
      await lastToast(page, /Entrada registrada/);
      await expect(d()).toBeHidden();
      await expect(card()).toHaveCount(0);
    },
  });

  await step(page, "Abre la pestaña Entradas para ver el historial", tab(page, "Entradas"), {
    after: async () => {
      await expect(page.locator("main table tbody tr", { hasText: PROD }).filter({ hasText: "200" }).first()).toBeVisible();
    },
  });

  await step(page, "Abre la pestaña Productos: el semáforo quedó en Verde", tab(page, "Productos"), {
    after: async () => { await expect(page.locator("main table tr", { hasText: PROD })).toContainText("Verde"); },
  });

  await step(page, "Haz clic en la pestaña Movimientos para ver el historial de entradas y salidas", tab(page, "Movimientos"), {
    after: async () => {
      await expect(activePanel(page).locator("table")).toContainText(PROD);
      await expect(activePanel(page).locator("table")).toContainText("Entrada");
    },
  });

  endChapter();
});
