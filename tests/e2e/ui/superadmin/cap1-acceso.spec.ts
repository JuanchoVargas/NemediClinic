import { test, expect } from "@playwright/test";
import { Walk, uiLogin, uiLogout } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap1 · Acceso (dueño)", async ({ page }) => {
  const w = new Walk(page, "superadmin", 1);

  await w.step("Pantalla de inicio de sesión", async () => {
    await page.goto("/login");
    await expect(page.locator("input[name=email]")).toBeVisible();
  });

  await w.step("Ingresar como dueño (SuperAdmin)", async () => {
    await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);
    await expect(page.locator("header")).toContainText(CREDS.superadmin.email);
    await expect(page.locator("header")).toContainText("Administración");
  });

  await w.step("Cerrar sesión", async () => {
    await uiLogout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  await w.step("Ruta protegida sin sesión redirige al login", async () => {
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/login/);
  });

  w.save();
});
