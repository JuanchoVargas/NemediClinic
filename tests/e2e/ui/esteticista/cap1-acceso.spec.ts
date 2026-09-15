import { test, expect } from "@playwright/test";
import { Walk, uiLogin, lastToast } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap1 · Acceso (esteticista)", async ({ page }) => {
  const w = new Walk(page, "esteticista", 1);

  await w.step("Ingresar como Laura Pérez (esteticista)", async () => {
    await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);
    await expect(page.locator("header")).toContainText(CREDS.esteticista.email);
  });

  await w.step("El menú no muestra Administración ni Paquetes", async () => {
    const nav = await page.locator("header nav").innerText();
    expect(nav).not.toMatch(/Administraci/);
    expect(nav).not.toMatch(/Paquetes/);
  });

  await w.step("Procedimientos: solo lectura (sin crear, editar ni eliminar)", async () => {
    await page.goto("/procedures");
    await expect(page.locator("main table")).toContainText("Limpieza facial profunda");
    await expect(page.locator("main button", { hasText: "Nuevo procedimiento" })).toHaveCount(0);
    await expect(page.locator('main button[aria-label^="Editar"]')).toHaveCount(0);
    await expect(page.locator('main button[aria-label^="Eliminar"]')).toHaveCount(0);
  });

  await w.step("Productos: solo lectura (sin crear, editar ni eliminar)", async () => {
    await page.goto("/inventory");
    await expect(page.locator("main table tbody tr").first()).toBeVisible();
    await expect(page.locator("main button", { hasText: "Nuevo producto" })).toHaveCount(0);
    await expect(page.locator('main button[aria-label^="Editar"]')).toHaveCount(0);
  });

  await w.step("Escribir la dirección de Usuarios (/admin/users): vuelve al inicio", async () => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await w.step("…y muestra el aviso 'No tienes permisos'", async () => {
    // El guard del router lanza el toast antes de que el <Toaster> monte cuando la URL se carga directa.
    await lastToast(page, /No tienes permisos/);
  });

  await w.step("Escribir la dirección de Paquetes (/packages): vuelve al inicio", async () => {
    await page.goto("/packages");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await w.step("…y muestra el aviso 'No tienes permisos'", async () => {
    await lastToast(page, /No tienes permisos/);
  });

  w.save();
});
