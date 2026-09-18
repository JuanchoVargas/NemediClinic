import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, dialog, lastToast, option, headerLink } from "../walk";
import { apiLogin, CREDS, req, listAll, safeDelete, findPatient } from "../api";

test.describe.configure({ mode: "serial" });

// Flujo completo de una valoración: llega una persona que aún no es paciente, se cotiza, acepta y
// se convierte. Al convertirla el sistema crea el paciente y le asigna el paquete, así que al final
// se borran la asignación, la valoración y el paciente para no dejar rastro en los datos demo.
const NOMBRE = "Tatiana Restrepo";
const CEDULA = "1077889900";

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const paciente = await findPatient(sa.token, CEDULA);
  if (paciente) {
    for (const asignada of await listAll<{ id: string }>(sa.token, `/api/v1/patient-packages/patient/${paciente.id}`))
      await safeDelete(sa.token, `/api/v1/patient-packages/${asignada.id}`);
  }
  const valoraciones = (await req<{ id: string; nombre: string }[]>("GET", "/api/v1/valuations", { token: sa.token })).data ?? [];
  for (const v of valoraciones.filter((x) => x.nombre.includes("Tatiana")))
    await safeDelete(sa.token, `/api/v1/valuations/${v.id}`);
  if (paciente) await safeDelete(sa.token, `/api/v1/patients/${paciente.id}`);
});

test("Cap6 · Valoraciones (recepción)", async ({ page }) => {
  startChapter(page, "admin", 6);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);

  const d = () => dialog(page);
  const fila = () => page.locator("main table tbody tr").filter({ hasText: NOMBRE }).first();

  await step(page, "Haz clic en Valoraciones en el menú lateral", headerLink(page, "Valoraciones"), {
    after: async () => {
      await expect(page).toHaveURL(/\/valoraciones/);
      await expect(page.locator("main")).toContainText("Tasa de conversión");
    },
  });

  await step(page, "Arriba ves el embudo del mes y la tasa de conversión", page.locator("main").getByText("Tasa de conversión"), {
    click: false,
    after: async () => {
      await expect(page.locator("main")).toContainText("Valoraciones del mes");
      await expect(page.locator("main")).toContainText("Aceptaron");
    },
  });

  await step(page, "Haz clic en Nueva valoración", page.locator("main button", { hasText: "Nueva valoración" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Elige Prospecto y escribe el nombre y el teléfono de quien consulta", d().locator("[role=tab]", { hasText: "Prospecto" }), {
    after: async () => {
      await d().locator("input[name=prospectoNombre]").fill(NOMBRE);
      await d().locator("input[name=prospectoTelefono]").fill("3105566778");
    },
  });

  await step(page, "Escribe el diagnóstico, elige el paquete que le sugieres y el precio, y presiona Crear", d().locator("button[form=valuation-form]"), {
    before: async () => {
      await d().locator("textarea[name=diagnostico]").fill("Flacidez leve en óvalo facial. Consulta por rejuvenecimiento sin cirugía.");
      // Esteticista y paquete sugerido
      const combos = d().locator("button[role=combobox]");
      await combos.first().click();
      await option(page, "Laura Pérez").click();
      await combos.nth(1).click();
      await option(page, "Rostro Radiante").click();
      await d().locator("input[inputmode=numeric]").first().fill("620000");
    },
    after: async () => {
      await lastToast(page, /Valoraci/);
      await expect(fila()).toContainText("Prospecto");
      await expect(fila()).toContainText("Pendiente");
    },
  });

  await step(page, "Cuando la persona acepta, presiona Convertir en su fila", fila().locator("button", { hasText: "Convertir" }), {
    after: async () => {
      await expect(d()).toBeVisible();
      await expect(d()).toContainText("Convertir");
    },
  });

  await step(page, "Escribe la cédula y presiona Convertir", d().locator("button[form=convert-valuation-form]"), {
    before: async () => { await d().locator("input[name=cedula]").fill(CEDULA); },
    after: async () => {
      await lastToast(page, /Valoración convertida/);
      // El sistema crea el paciente, le asigna el paquete y abre su ficha
      await expect(page).toHaveURL(/\/patients\//);
      await expect(page.locator("main")).toContainText(NOMBRE);
      await expect(page.locator("main")).toContainText("Rostro Radiante");
    },
  });

  await step(page, "Vuelve a Valoraciones: quedó como Aceptó, ya es Paciente y su paquete tiene enlace", headerLink(page, "Valoraciones"), {
    after: async () => {
      await expect(fila()).toContainText("Aceptó");
      await expect(fila()).toContainText("Paciente");
      await expect(fila().locator("a", { hasText: "Rostro Radiante" })).toBeVisible();
    },
  });

  endChapter();
});
