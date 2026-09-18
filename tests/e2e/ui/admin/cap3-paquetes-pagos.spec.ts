import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, chooseCombobox, dialog, lastToast, tab, activePanel, headerLink } from "../walk";
import { apiLogin, CREDS, req, listAll, safeDelete, findPatient } from "../api";
import { samplePng } from "../helpers/sample-image";

test.describe.configure({ mode: "serial" });

// Paquete propio del recorrido ("Plan Mantenimiento Facial"). Desde que una asignación conserva
// su copia del catálogo, borrar el paquete ya NO la esconde: el capítulo borra también la
// asignación que creó, o cada corrida dejaría una tarjeta más en la ficha de Sara.
const PKG = "Plan Mantenimiento Facial";
let pkgId: string | undefined;
let saraId = "";

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const sara = await findPatient(sa.token, "Sara");
  saraId = sara?.id ?? "";
  const procs = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/procedures");
  const limpieza = procs.find((p) => /Limpieza facial profunda/.test(p.nombre))!;
  const c = await req<{ id: string }>("POST", "/api/v1/packages", { token: sa.token, body: { nombre: PKG, descripcion: "Dos limpiezas faciales profundas.", precioTotal: 200000, sesionesTotales: 2, vigenciaDias: 60, diasAlertaVencimiento: 10 } });
  pkgId = c.data?.id;
  await req("POST", `/api/v1/packages/${pkgId}/procedures`, { token: sa.token, body: { procedureId: limpieza.id, cantidadSesiones: 2 } });
});

test.afterAll(async () => {
  if (!pkgId) return;
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const asignadas = await listAll<{ id: string; packageId: string }>(sa.token, "/api/v1/patient-packages/patient/" + saraId);
  for (const asignada of asignadas.filter((a) => a.packageId === pkgId))
    await safeDelete(sa.token, `/api/v1/patient-packages/${asignada.id}`);
  await safeDelete(sa.token, `/api/v1/packages/${pkgId}`);
});

test("Cap3 · Vender un paquete y registrar pagos (recepción)", async ({ page }) => {
  startChapter(page, "admin", 3);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const d = () => dialog(page);
  const card = () => activePanel(page).locator("[data-slot=card], .rounded-xl", { hasText: PKG }).first();
  const progreso = () => card().locator("[role=progressbar]").first();
  const resumen = () => card().locator("[role=progressbar] + div").first();

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

  await step(page, "Escribe 80000 como monto, el número de la transferencia y presiona Registrar pago", d().locator("button[form=payment-form]"), {
    before: async () => {
      await d().locator("input[inputmode=numeric]").fill("80000");
      await d().locator("button[role=combobox]").first().click();
      await page.locator("[role=option]", { hasText: "Transferencia" }).click();
      await d().locator("input[name=referencia]").fill("TRF-4417");
    },
    after: async () => {
      await lastToast(page, /Pago registrado/);
      await expect(d()).toBeHidden();
      // La barra muestra 40 % y el saldo baja a $120.000
      await expect(progreso()).toHaveAttribute("aria-valuenow", "40");
      await expect(resumen()).toContainText("40%");
      await expect(card()).toContainText("TRF-4417");
    },
  });

  await step(page, "En la fila del pago, presiona Adjuntar para guardar la foto del comprobante", card().locator("button", { hasText: "Adjuntar" }).first(), {
    click: false,
    after: async () => {
      await card().locator("input[type=file]").first().setInputFiles({
        name: "comprobante.png", mimeType: "image/png", buffer: samplePng([31, 78, 121], [217, 164, 65], 20),
      });
      await lastToast(page, /Comprobante adjuntado/);
      await expect(card().locator("img").first()).toBeVisible();
    },
  });

  await step(page, "Presiona Registrar pago otra vez: el formulario propone el saldo restante", card().locator("button", { hasText: "Registrar pago" }), {
    after: async () => { await expect(d().locator("input[inputmode=numeric]")).toHaveValue("120.000"); },
  });

  await step(page, "Presiona Registrar pago para saldar: la barra llega a 100 % con la etiqueta Pagado", d().locator("button[form=payment-form]"), {
    after: async () => {
      await lastToast(page, /Pago registrado/);
      await expect(d()).toBeHidden();
      await expect(progreso()).toHaveAttribute("aria-valuenow", "100");
      await expect(resumen()).toContainText("Pagado");
    },
  });

  endChapter();
});
