import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { headerMenu, openHeaderMenu, menuItem, lastToast } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap1 · Entrar y qué puedes hacer (recepción)", async ({ page }) => {
  startChapter(page, "admin", 1);

  await step(page, "Escribe tu correo y contraseña y presiona Ingresar", page.locator("form button[type=submit]"), {
    before: async () => {
      await page.goto("/login");
      await page.locator("input[name=email]").fill(CREDS.admin.email);
      await page.locator("input[name=password]").fill(CREDS.admin.password);
    },
    after: async () => {
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      await expect(page.locator("header")).toContainText(CREDS.admin.email);
    },
  });

  await step(page, "Haz clic en Administración: verás Usuarios y Sedes", headerMenu(page, "Administración"), {
    after: async () => {
      const items = page.locator("[role=menuitem]");
      await expect(items.filter({ hasText: "Usuarios" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Sedes" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Mi clínica" })).toHaveCount(0);
    },
  });

  await step(page, "Elige Sedes: puedes editar, pero no hay botón Nueva sede", menuItem(page, "Sedes"), {
    after: async () => {
      await expect(page).toHaveURL(/\/admin\/branches/);
      await expect(page.locator("main table")).toContainText("Sede Principal");
      await expect(page.locator("main button", { hasText: "Nueva sede" })).toHaveCount(0);
      await expect(page.locator('main button[aria-label^="Editar"]').first()).toBeVisible();
    },
  });

  await step(page, "Abre Administración y elige Usuarios: puedes editar, pero no hay botón Nuevo usuario", menuItem(page, "Usuarios"), {
    before: async () => { await openHeaderMenu(page, "Administración"); },
    after: async () => {
      await expect(page).toHaveURL(/\/admin\/users/);
      await expect(page.locator("main button", { hasText: "Nuevo usuario" })).toHaveCount(0);
      await expect(page.locator('main button[aria-label^="Editar"]').first()).toBeVisible();
    },
  });

  await step(page, "Si escribes la dirección de Mi clínica en el navegador, vuelves al inicio", null, {
    before: async () => { await page.goto("/super/tenants"); },
    after: async () => { await expect(page).toHaveURL(/\/dashboard/); },
  });

  await step(page, "…y debería mostrarse el aviso 'No tienes permisos'", null, {
    after: async () => { await lastToast(page, /No tienes permisos/); },
  });

  endChapter();
});
