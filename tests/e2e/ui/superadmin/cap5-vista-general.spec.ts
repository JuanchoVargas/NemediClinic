import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, headerMenu, openHeaderMenu, menuItem, option } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap5 · Vista general (dueño)", async ({ page }) => {
  startChapter(page, "superadmin", 5);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);

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

  await step(page, "Elige Camila Ruiz: el calendario muestra solo sus citas", option(page, "Camila"), {
    after: async () => {
      await page.waitForTimeout(1200);
      const texts = await page.locator(".fc-event").allInnerTexts();
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.some((t) => /Santiago|Mariana/.test(t)), "solo deben quedar citas de Camila").toBe(false);
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
