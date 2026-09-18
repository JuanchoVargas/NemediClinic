import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, dialog, lastToast, tab, headerLink, activePanel } from "../walk";
import { apiLogin, CREDS, req, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

// Producto propio del recorrido: es un medicamento (así el formulario exige lote y vencimiento),
// nace en 0 con mínimo 20 —aparece en Alertas—, recibe la entrada de 200 y se elimina al final.
const PROD = "Ampollas de ácido hialurónico";
const LOTE = "L-2026-0087";
let prodId: string | undefined;

/** Fecha de vencimiento del lote del recorrido: dentro de dos años, en formato del input date. */
function venceEnDosAnios() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const c = await req<{ id: string }>("POST", "/api/v1/products", {
    token: sa.token,
    body: {
      nombre: PROD,
      descripcion: "Ampollas 2 ml para mesoterapia facial.",
      referencia: "AMP-AH-2",
      tipoProducto: "InsumoCabina",
      unidadMedida: "unidad",
      stockMinimo: 20,
      stockMaximo: 100,
      tipoRegulatorio: "Medicamento",
      registroSanitarioInvima: "INVIMA 2024M-0019842",
      principioActivo: "Ácido hialurónico",
      concentracion: "20 mg/ml",
    },
  });
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

  // Los lotes vencidos y por vencer van arriba del stock bajo el mínimo: es lo que no se puede usar.
  await step(page, "Arriba de todo están los lotes vencidos y los que están por vencer", page.locator("main section", { hasText: "Lotes vencidos" }).first(), {
    click: false,
    after: async () => {
      await expect(page.locator("main")).toContainText("Lotes por vencer");
      await expect(page.locator("main")).toContainText("No se pueden usar");
    },
  });

  await step(page, "Presiona Registrar entrada en la tarjeta del producto: llega preseleccionado", card().locator("button", { hasText: "Registrar entrada" }), {
    after: async () => { await expect(d()).toContainText(PROD); },
  });

  await step(page, "Escribe la cantidad y completa el lote: en un medicamento el número y el vencimiento son obligatorios", d().locator("#entry-lote"), {
    click: false,
    before: async () => {
      await d().locator("input[type=number]").fill("200");
      await d().locator("#entry-lote").fill(LOTE);
      await d().locator("#entry-vence").fill(venceEnDosAnios());
      await d().locator("#entry-proveedor").fill("Distribuidora Médica Andina");
      await d().locator("#entry-factura").fill("FV-88231");
    },
    after: async () => { await expect(d()).toContainText("el número de lote y el vencimiento son obligatorios"); },
  });

  await step(page, "Presiona Registrar: el producto sale de Alertas", d().locator("button", { hasText: /^Registrar$/ }), {
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

  await step(page, "Abre la pestaña Productos: el semáforo quedó en Óptimo", tab(page, "Productos"), {
    after: async () => { await expect(page.locator("main table tr", { hasText: PROD })).toContainText("Óptimo"); },
  });

  await step(page, "Filtra por Medicamentos: el catálogo se separa por tipo regulatorio", tab(page, "Medicamentos"), {
    after: async () => { await expect(page.locator("main table").first()).toContainText(PROD); },
  });

  await step(page, "Presiona el botón de lotes del producto", page.locator(`main button[aria-label="Ver los lotes de ${PROD}"]`).first(), {
    after: async () => {
      await expect(d()).toContainText(LOTE);
      await expect(d()).toContainText("Distribuidora Médica Andina");
      await expect(d()).toContainText("INVIMA 2024M-0019842");
    },
  });

  await step(page, "Cierra la ficha de lotes y presiona Reporte para Secretaría de Salud", page.locator("main button", { hasText: "Reporte para Secretaría de Salud" }), {
    before: async () => { await d().locator("button", { hasText: "Cerrar" }).click(); await expect(d()).toBeHidden(); },
    after: async () => { await expect(d()).toContainText("El archivo va a incluir"); },
  });

  await step(page, "Elige el rango y presiona Descargar Excel", d().locator("button", { hasText: "Descargar Excel" }), {
    before: async () => { await expect(d()).toContainText("Medicamentos"); },
    after: async () => { await lastToast(page, /Reporte descargado/); },
  });

  await step(page, "Haz clic en la pestaña Movimientos para ver el historial de entradas y salidas", tab(page, "Movimientos"), {
    after: async () => {
      await expect(activePanel(page).locator("table")).toContainText(PROD);
      await expect(activePanel(page).locator("table")).toContainText("Entrada");
    },
  });

  endChapter();
});
