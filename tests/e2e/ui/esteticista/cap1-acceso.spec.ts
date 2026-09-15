import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { headerLink, lastToast } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap1 · Entrar y qué puedes hacer (esteticista)", async ({ page }) => {
  startChapter(page, "esteticista", 1);

  await step(page, "Escribe tu correo y contraseña y presiona Ingresar", page.locator("form button[type=submit]"), {
    before: async () => {
      await page.goto("/login");
      await page.locator("input[name=email]").fill(CREDS.esteticista.email);
      await page.locator("input[name=password]").fill(CREDS.esteticista.password);
    },
    after: async () => {
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      await expect(page.locator("header")).toContainText(CREDS.esteticista.email);
    },
  });

  await step(page, "Revisa el menú: no aparecen Administración ni Paquetes", null, {
    after: async () => {
      const nav = await page.locator("header nav").innerText();
      expect(nav).not.toMatch(/Administraci/);
      expect(nav).not.toMatch(/Paquetes/);
    },
  });

  await step(page, "Haz clic en Procedimientos: puedes consultar, no crear ni editar", headerLink(page, "Procedimientos"), {
    after: async () => {
      await expect(page.locator("main table")).toContainText("Limpieza facial profunda");
      await expect(page.locator("main button", { hasText: "Nuevo procedimiento" })).toHaveCount(0);
      await expect(page.locator('main button[aria-label^="Editar"]')).toHaveCount(0);
      await expect(page.locator('main button[aria-label^="Eliminar"]')).toHaveCount(0);
    },
  });

  await step(page, "Haz clic en Inventario: puedes consultar los productos, no crearlos", headerLink(page, "Inventario"), {
    after: async () => {
      await expect(page.locator("main table tbody tr").first()).toBeVisible();
      await expect(page.locator("main button", { hasText: "Nuevo producto" })).toHaveCount(0);
      await expect(page.locator('main button[aria-label^="Editar"]')).toHaveCount(0);
    },
  });

  await step(page, "Si escribes la dirección de Usuarios en el navegador, vuelves al inicio", null, {
    before: async () => { await page.goto("/admin/users"); },
    after: async () => { await expect(page).toHaveURL(/\/dashboard/); },
  });

  await step(page, "…y debería mostrarse el aviso 'No tienes permisos'", null, {
    after: async () => { await lastToast(page, /No tienes permisos/); },
  });

  await step(page, "Si escribes la dirección de Paquetes, vuelves al inicio", null, {
    before: async () => { await page.goto("/packages"); },
    after: async () => { await expect(page).toHaveURL(/\/dashboard/); },
  });

  await step(page, "…y debería mostrarse el aviso 'No tienes permisos'", null, {
    after: async () => { await lastToast(page, /No tienes permisos/); },
  });

  endChapter();
});
