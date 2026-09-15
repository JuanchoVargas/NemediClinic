import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, chooseCombobox, dialog, lastToast, tab, activePanel, headerLink } from "../walk";
import { apiLogin, CREDS, req, listAll, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

// Paquete propio del recorrido ("Plan Mantenimiento Facial"): las asignaciones y pagos no se
// pueden borrar por API; al eliminar el paquete del catálogo dejan de verse en la ficha de Sara.
const PKG = "Plan Mantenimiento Facial";
let pkgId: string | undefined;

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const procs = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/procedures");
  const limpieza = procs.find((p) => /Limpieza facial profunda/.test(p.nombre))!;
  const c = await req<{ id: string }>("POST", "/api/v1/packages", { token: sa.token, body: { nombre: PKG, descripcion: "Dos limpiezas faciales profundas.", precioTotal: 200000, sesionesTotales: 2, vigenciaDias: 60, diasAlertaVencimiento: 10 } });
  pkgId = c.data?.id;
  await req("POST", `/api/v1/packages/${pkgId}/procedures`, { token: sa.token, body: { procedureId: limpieza.id, cantidadSesiones: 2 } });
});

test.afterAll(async () => {
  if (!pkgId) return;
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  await safeDelete(sa.token, `/api/v1/packages/${pkgId}`);
});

test("Cap3 · Vender un paquete y registrar pagos (recepción)", async ({ page }) => {
  startChapter(page, "admin", 3);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const d = () => dialog(page);
  const card = () => activePanel(page).locator("[data-slot=card], .rounded-xl", { hasText: PKG }).first();
  const summary = () => card().locator("div.rounded-md.grid").first();

  await step(page, "Haz clic en Paquetes y abre el plan con el botón Ver", page.locator(`button[aria-label="Ver ${PKG}"]`), {
    before: async () => { await headerLink(page, "Paquetes").click(); await expect(page.locator("main table")).toContainText(PKG); },
    after: async () => { await expect(page.locator("main h1")).toContainText(PKG); },
  });

  await step(page, "Presiona Asignar a paciente", page.locator("main button", { hasText: "Asignar a paciente" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Busca a Sara Hernández, revisa el precio acordado y presiona Asignar", d().locator("button", { hasText: /^Asignar$/ }), {
    before: async () => {
      await d().locator("button", { hasText: "Buscar paciente" }).click();
      await chooseCombobox(page, "Sara", "Sara Hernández");
      await expect(d().locator("input[inputmode=numeric]")).toHaveValue("200.000");
    },
    after: async () => {
      await lastToast(page, /Paquete asignado/);
      await page.waitForURL(/\/patients\/[0-9a-f-]+$/);
    },
  });

  await step(page, "En la ficha de Sara, haz clic en la pestaña Paquetes: el plan aparece con 0 / 2 sesiones", tab(page, "Paquetes"), {
    after: async () => { await expect(card()).toContainText("0 / 2"); },
  });

  await step(page, "Haz clic en la pestaña Pagos y presiona Registrar pago del plan", card().locator("button", { hasText: "Registrar pago" }), {
    before: async () => { await tab(page, "Pagos").click(); await expect(card()).toBeVisible(); },
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Escribe 80000 como monto y presiona Registrar pago: el saldo queda en amarillo", d().locator("button[form=payment-form]"), {
    before: async () => { await d().locator("input[inputmode=numeric]").fill("80000"); },
    after: async () => {
      await lastToast(page, /Pago registrado/);
      await expect(d()).toBeHidden();
      await expect(summary()).toContainText("$120.000");
      await expect(summary()).toHaveClass(/bg-yellow-50/);
    },
  });

  await step(page, "Presiona Registrar pago otra vez: el formulario propone el saldo restante", card().locator("button", { hasText: "Registrar pago" }), {
    after: async () => { await expect(d().locator("input[inputmode=numeric]")).toHaveValue("120.000"); },
  });

  await step(page, "Presiona Registrar pago para saldar: el resumen pasa a verde con $0", d().locator("button[form=payment-form]"), {
    after: async () => {
      await lastToast(page, /Pago registrado/);
      await expect(d()).toBeHidden();
      await expect(summary()).toContainText("$0");
      await expect(summary()).toHaveClass(/bg-green-50/);
    },
  });

  endChapter();
});
