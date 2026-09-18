import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, pickSelect, dialog, closeDialog, headerMenu, openHeaderMenu, menuItem, lastToast } from "../walk";
import { apiLogin, CREDS, listAll, safeDelete } from "../api";

test.describe.configure({ mode: "serial" });

const SEDE = "Sede Chapinero";
const ADMIN = { nombre: "Mónica", apellido: "Herrera", email: "monica.herrera@nemedi.demo" };
const ESTE = { nombre: "Daniela", apellido: "Ospina", email: "daniela.ospina@nemedi.demo" };

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const users = await listAll<{ id: string; email: string }>(sa.token, "/api/v1/users");
  for (const u of users.filter((x) => [ADMIN.email, ESTE.email].includes(x.email))) await safeDelete(sa.token, `/api/v1/users/${u.id}`);
  const branches = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/branches");
  for (const b of branches.filter((x) => x.nombre === SEDE)) await safeDelete(sa.token, `/api/v1/branches/${b.id}`);
});

test("Cap2 · Configurar la clínica (dueño)", async ({ page }) => {
  startChapter(page, "superadmin", 2);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);
  const d = () => dialog(page);
  const fillUser = async (u: { nombre: string; apellido: string; email: string }, rol: string | RegExp, sede: string) => {
    await d().locator("input[name=nombre]").fill(u.nombre);
    await d().locator("input[name=apellido]").fill(u.apellido);
    await d().locator("input[name=email]").fill(u.email);
    await d().locator("input[name=password]").fill("Demo2026!");
    await pickSelect(d().locator("button[role=combobox]").nth(0), rol);
    await pickSelect(d().locator("button[role=combobox]").nth(1), sede);
  };

  await step(page, "Haz clic en Administración", headerMenu(page, "Administración"), {
    after: async () => { await expect(menuItem(page, "Sedes")).toBeVisible(); },
  });

  await step(page, "Elige Sedes", menuItem(page, "Sedes"), {
    after: async () => {
      await expect(page).toHaveURL(/\/admin\/branches/);
      await expect(page.locator("main table")).toContainText("Sede Principal");
    },
  });

  await step(page, "Haz clic en Nueva sede", page.locator("main button", { hasText: "Nueva sede" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, `Escribe los datos de la sede y presiona Crear`, d().locator("button[form=branch-form]"), {
    before: async () => {
      await d().locator("input[name=nombre]").fill(SEDE);
      await d().locator("input[name=direccion]").fill("Calle 63 # 11-40");
      await d().locator("input[name=telefono]").fill("6017001234");
    },
    after: async () => { await expect(page.locator("main table")).toContainText(SEDE); },
  });

  await step(page, "Abre Administración y elige Usuarios", menuItem(page, "Usuarios"), {
    before: async () => { await openHeaderMenu(page, "Administración"); },
    after: async () => {
      await expect(page).toHaveURL(/\/admin\/users/);
      await expect(page.locator("main table")).toContainText("laura.perez@nemedi.demo");
    },
  });

  await step(page, "Haz clic en Nuevo usuario", page.locator("main button", { hasText: "Nuevo usuario" }), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Completa los datos de Mónica con rol Admin y Sede Principal, y presiona Crear", d().locator("button[form=user-form]"), {
    before: async () => { await fillUser(ADMIN, /^Admin$/, "Sede Principal"); },
    after: async () => { await expect(page.locator("main table")).toContainText(ADMIN.email); },
  });

  await step(page, `Crea a Daniela con rol Esteticista en ${SEDE} y presiona Crear`, d().locator("button[form=user-form]"), {
    before: async () => {
      await page.locator("main button", { hasText: "Nuevo usuario" }).click();
      await fillUser(ESTE, "Esteticista", SEDE);
    },
    after: async () => { await expect(page.locator("main table")).toContainText(ESTE.email); },
  });

  await step(page, "Haz clic en el lápiz de Daniela para editarla", page.locator(`button[aria-label="Editar ${ESTE.nombre}"]`), {
    after: async () => { await expect(d()).toBeVisible(); },
  });

  await step(page, "Cambia el apellido y presiona Guardar cambios", d().locator("button[form=user-form]"), {
    before: async () => { await d().locator("input[name=apellido]").fill("Ospina Ríos"); },
    after: async () => {
      await expect(page.locator("main table")).toContainText("Ospina Ríos");
      await lastToast(page, /actualizado/i);
    },
  });

  await step(page, "Vuelve a editar y apaga el interruptor Activo para desactivarla", d().locator("[role=switch]"), {
    before: async () => { await page.locator(`button[aria-label="Editar ${ESTE.nombre}"]`).click(); },
    after: async () => {
      await d().locator("button[form=user-form]").click();
      await expect(page.locator("main table tr", { hasText: ESTE.email })).toContainText("Inactivo");
    },
  });

  await step(page, "Abre Administración y elige Mi clínica para ver la ficha de tu clínica", menuItem(page, "Mi clínica"), {
    before: async () => { await closeDialog(page); await openHeaderMenu(page, "Administración"); },
    after: async () => {
      await expect(page).toHaveURL(/\/super\/tenants/);
      await expect(page.locator("main table tbody tr")).toHaveCount(1);
    },
  });

  endChapter();
});
