import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, headerMenu, openHeaderMenu, menuItem, option } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap5 · Vista general (dueño)", async ({ page }) => {
  startChapter(page, "superadmin", 5);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);

  await step(page, "En el Dashboard, presiona Dinero para ver lo cobrado por día y el saldo acumulado", page.getByRole("radio", { name: "Dinero" }), {
    before: async () => {
      await page.goto("/dashboard");
      await expect(page.locator("main")).toContainText("Citas por día");
    },
    after: async () => {
      await expect(page.locator("main")).toContainText("Dinero por día");
      await expect(page.getByRole("radio", { name: "Dinero" })).toHaveAttribute("aria-checked", "true");
    },
  });

  await step(page, "Presiona Productos para ver los insumos más usados del mes", page.getByRole("radio", { name: "Productos" }), {
    after: async () => {
      await expect(page.locator("main")).toContainText("Productos del mes");
      await expect(page.locator("main")).toContainText("unidades movidas");
      // Se vuelve a dejar como estaba: la elección se guarda en el dispositivo
      await page.getByRole("radio", { name: "Citas" }).click();
      await page.getByRole("radio", { name: "Procedimientos" }).click();
    },
  });

  await step(page, "Haz clic en Calendario y elige Vista calendario", menuItem(page, "Vista calendario"), {
    before: async () => { await openHeaderMenu(page, "Calendario"); },
    after: async () => {
      await expect(page).toHaveURL(/\/calendar$/);
      await expect(page.locator(".fc-event").first()).toBeVisible();
      expect(await page.locator(".fc-event").count()).toBeGreaterThanOrEqual(10);
    },
  });

  await step(page, "Abre el selector Todos los esteticistas", page.locator("main button[role=combobox]", { hasText: /esteticista/i }), {
    after: async () => { await expect(option(page, "Camila")).toBeVisible(); },
  });

  // El calendario vuelve a pedir las citas con ?esteticistId=…: se comprueba esa respuesta (todas de
  // Camila) y que el calendario pinta exactamente esas, sin depender de qué pacientes tenga el seed.
  let filtered: Promise<{ esteticistNombre: string }[]> | null = null;
  await step(page, "Elige Camila Ruiz: el calendario muestra solo sus citas", option(page, "Camila"), {
    before: async () => {
      filtered = page
        .waitForResponse((r) => /\/appointments\?/i.test(r.url()) && /esteticistId=/i.test(r.url()) && r.ok())
        .then((r) => r.json());
    },
    after: async () => {
      const items = await filtered!;
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((a) => a.esteticistNombre.includes("Camila")), "solo deben llegar citas de Camila").toBe(true);
      await expect(page.locator(".fc-event")).toHaveCount(items.length);
    },
  });

  await step(page, "Haz clic en Hoja del día", page.locator("main a", { hasText: "Hoja del día" }), {
    after: async () => {
      await expect(page.locator("main")).toContainText("Esteticista:");
      await expect(page.locator("main")).toContainText("Laura Pérez");
      await expect(page.locator("main")).toContainText("Camila Ruiz");
    },
  });

  endChapter();
});
