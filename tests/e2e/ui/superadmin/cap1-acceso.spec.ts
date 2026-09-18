import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { menuItem, sidebar, userMenu } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap1 · Entrar y salir (dueño)", async ({ page }) => {
  startChapter(page, "superadmin", 1);

  await step(page, "Abre la pantalla de inicio de sesión", null, {
    before: async () => { await page.goto("/login"); },
    after: async () => { await expect(page.locator("input[name=email]")).toBeVisible(); },
  });

  await step(page, "Escribe tu correo y contraseña y presiona Ingresar", page.locator("form button[type=submit]"), {
    before: async () => {
      await page.locator("input[name=email]").fill(CREDS.superadmin.email);
      await page.locator("input[name=password]").fill(CREDS.superadmin.password);
    },
    after: async () => {
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      await expect(sidebar(page)).toContainText(CREDS.superadmin.email);
      await expect(sidebar(page)).toContainText("Administración");
    },
  });

  await step(page, "Abre el menú de usuario (arriba a la derecha) y presiona Cerrar sesión", menuItem(page, "Cerrar sesión"), {
    before: async () => { await userMenu(page).click(); },
    after: async () => { await page.waitForURL(/\/login/); },
  });

  await step(page, "Sin sesión, cualquier dirección interna vuelve al inicio de sesión", null, {
    before: async () => { await page.goto("/patients"); },
    after: async () => { await expect(page).toHaveURL(/\/login/); },
  });

  endChapter();
});
