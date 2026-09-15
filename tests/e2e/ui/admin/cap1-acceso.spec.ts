import { test, expect } from "@playwright/test";
import { Walk, uiLogin, lastToast } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap1 · Acceso (recepción)", async ({ page }) => {
  const w = new Walk(page, "admin", 1);

  await w.step("Ingresar como Recepción (Admin)", async () => {
    await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
    await expect(page.locator("header")).toContainText(CREDS.admin.email);
  });

  await w.step("El menú Administración muestra Usuarios y Sedes (no Tenants)", async () => {
    await page.locator("header button", { hasText: "Administración" }).click();
    const items = page.locator("[role=menuitem]");
    await expect(items.filter({ hasText: "Usuarios" })).toHaveCount(1);
    await expect(items.filter({ hasText: "Sedes" })).toHaveCount(1);
    await expect(items.filter({ hasText: "Tenants" })).toHaveCount(0);
  });

  await w.step("Sedes: puede ver y editar, pero no crear", async () => {
    await page.keyboard.press("Escape");
    await page.goto("/admin/branches");
    await expect(page.locator("main table")).toContainText("Sede Principal");
    await expect(page.locator("main button", { hasText: "Nueva sede" })).toHaveCount(0);
    await expect(page.locator('main button[aria-label^="Editar"]').first()).toBeVisible();
  });

  await w.step("Usuarios: sin 'Nuevo usuario' pero con Editar", async () => {
    await page.goto("/admin/users");
    await expect(page.locator("main button", { hasText: "Nuevo usuario" })).toHaveCount(0);
    await expect(page.locator('main button[aria-label^="Editar"]').first()).toBeVisible();
  });

  await w.step("Escribir la dirección de Tenants (/super/tenants): vuelve al inicio", async () => {
    await page.goto("/super/tenants");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await w.step("…y muestra el aviso 'No tienes permisos'", async () => {
    // El guard del router lanza el toast antes de que el <Toaster> monte cuando la URL se carga directa.
    await lastToast(page, /No tienes permisos/);
  });

  w.save();
});
