import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickCombobox, dialog, lastToast, tab, activePanel } from "../walk";
import { apiLogin, CREDS, req, listAll, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

// Se usa un paquete propio del recorrido ("Plan Mantenimiento Facial") porque las
// asignaciones y pagos no se pueden borrar por API; al final se elimina el paquete del
// catálogo y con él deja de verse la asignación en la ficha de Sara.
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

test("Cap3 · Paquetes y pagos (recepción)", async ({ page }) => {
  const w = new Walk(page, "admin", 3);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);

  await w.step(`Asignar "${PKG}" a Sara Hernández desde el detalle del paquete`, async () => {
    await page.goto("/packages");
    await page.locator(`button[aria-label="Ver ${PKG}"]`).click();
    await expect(page.locator("main h1")).toContainText(PKG);
    await page.locator("main button", { hasText: "Asignar a paciente" }).click();
    const d = dialog(page);
    await pickCombobox(d.locator("button", { hasText: "Buscar paciente" }), "Sara", "Sara Hernández");
    await expect(d.locator("input[inputmode=numeric]")).toHaveValue("200.000");
    await d.locator("button", { hasText: /^Asignar$/ }).click();
    await lastToast(page, /Paquete asignado/);
    await page.waitForURL(/\/patients\/[0-9a-f-]+$/);
  });

  const card = () => activePanel(page).locator("[data-slot=card], .rounded-xl", { hasText: PKG }).first();

  await w.step("Ficha de Sara: el paquete aparece con 0 / 2 sesiones", async () => {
    await tab(page, "Paquetes").click();
    await expect(card()).toContainText("0 / 2");
  });

  await w.step("Pago parcial de $80.000 → saldo pendiente en amarillo", async () => {
    await tab(page, "Pagos").click();
    await card().locator("button", { hasText: "Registrar pago" }).click();
    const d = dialog(page);
    await d.locator("input[inputmode=numeric]").fill("80000");
    await d.locator("button[form=payment-form]").click();
    await lastToast(page, /Pago registrado/);
    await expect(dialog(page)).toBeHidden();
    const summary = card().locator("div.rounded-md.grid").first();
    await expect(summary).toContainText("$120.000");
    await expect(summary).toHaveClass(/bg-yellow-50/);
  });

  await w.step("Pago del resto → saldo $0 en verde", async () => {
    await card().locator("button", { hasText: "Registrar pago" }).click();
    const d = dialog(page);
    await expect(d.locator("input[inputmode=numeric]")).toHaveValue("120.000");
    await d.locator("button[form=payment-form]").click();
    await lastToast(page, /Pago registrado/);
    await expect(dialog(page)).toBeHidden();
    const summary = card().locator("div.rounded-md.grid").first();
    await expect(summary).toContainText("$0");
    await expect(summary).toHaveClass(/bg-green-50/);
  });

  w.save();
});
