import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickSelect, dialog, lastToast } from "../walk";
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

test("Cap2 · Configuración (dueño)", async ({ page }) => {
  const w = new Walk(page, "superadmin", 2);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);

  await w.step("Sedes: lista de sedes de la clínica", async () => {
    await page.goto("/admin/branches");
    await expect(page.locator("main table")).toContainText("Sede Principal");
  });

  await w.step(`Crear sede "${SEDE}"`, async () => {
    await page.locator("main button", { hasText: "Nueva sede" }).click();
    const d = dialog(page);
    await d.locator("input[name=nombre]").fill(SEDE);
    await d.locator("input[name=direccion]").fill("Calle 63 # 11-40");
    await d.locator("input[name=telefono]").fill("6017001234");
    await d.locator("button[form=branch-form]").click();
    await expect(page.locator("main table")).toContainText(SEDE);
  });

  await w.step("Usuarios: lista de usuarios y roles", async () => {
    await page.goto("/admin/users");
    await expect(page.locator("main table")).toContainText("laura.perez@nemedi.demo");
  });

  await w.step(`Crear usuario Admin "${ADMIN.nombre} ${ADMIN.apellido}"`, async () => {
    await page.locator("main button", { hasText: "Nuevo usuario" }).click();
    const d = dialog(page);
    await d.locator("input[name=nombre]").fill(ADMIN.nombre);
    await d.locator("input[name=apellido]").fill(ADMIN.apellido);
    await d.locator("input[name=email]").fill(ADMIN.email);
    await d.locator("input[name=password]").fill("Demo2026!");
    await pickSelect(d.locator("button[role=combobox]").nth(0), /^Admin$/);
    await pickSelect(d.locator("button[role=combobox]").nth(1), "Sede Principal");
    await d.locator("button[form=user-form]").click();
    await expect(page.locator("main table")).toContainText(ADMIN.email);
  });

  await w.step(`Crear usuario Esteticista "${ESTE.nombre} ${ESTE.apellido}" en ${SEDE}`, async () => {
    await page.locator("main button", { hasText: "Nuevo usuario" }).click();
    const d = dialog(page);
    await d.locator("input[name=nombre]").fill(ESTE.nombre);
    await d.locator("input[name=apellido]").fill(ESTE.apellido);
    await d.locator("input[name=email]").fill(ESTE.email);
    await d.locator("input[name=password]").fill("Demo2026!");
    await pickSelect(d.locator("button[role=combobox]").nth(0), "Esteticista");
    await pickSelect(d.locator("button[role=combobox]").nth(1), SEDE);
    await d.locator("button[form=user-form]").click();
    await expect(page.locator("main table")).toContainText(ESTE.email);
  });

  await w.step("Editar usuario (apellido Ospina Ríos)", async () => {
    await page.locator(`button[aria-label="Editar ${ESTE.nombre}"]`).click();
    const d = dialog(page);
    await d.locator("input[name=apellido]").fill("Ospina Ríos");
    await d.locator("button[form=user-form]").click();
    await expect(page.locator("main table")).toContainText("Ospina Ríos");
    await lastToast(page, /actualizado/i);
  });

  await w.step("Desactivar usuario desde el formulario", async () => {
    await page.locator(`button[aria-label="Editar ${ESTE.nombre}"]`).click();
    const d = dialog(page);
    const sw = d.locator("[role=switch]");
    if ((await sw.count()) === 0) {
      await page.keyboard.press("Escape");
      throw new Error("El formulario de usuario no tiene control 'Activo' (la API sí acepta IsActive en PUT /users)");
    }
    await sw.click();
    await d.locator("button[form=user-form]").click();
    await expect(page.locator("main table tr", { hasText: ESTE.email })).toContainText("Inactivo");
  });

  await w.step("Tenants: lectura del propio (clínica)", async () => {
    await page.goto("/super/tenants");
    await expect(page.locator("main table tbody tr")).toHaveCount(1);
  });

  w.save();
});
