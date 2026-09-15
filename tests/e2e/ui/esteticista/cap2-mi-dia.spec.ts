import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, dialog, headerMenu, openHeaderMenu, menuItem } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap2 · Mi día (esteticista)", async ({ page }) => {
  startChapter(page, "esteticista", 2);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);

  await step(page, "Haz clic en Calendario y elige Hoja del día: solo tus citas", menuItem(page, "Hoja del día"), {
    before: async () => { await openHeaderMenu(page, "Calendario"); },
    after: async () => {
      await expect(page.locator("main")).toContainText("Esteticista:");
      const text = await page.locator("main").innerText();
      expect(text).toContain("Laura Pérez");
      expect(text).not.toContain("Camila Ruiz");
    },
  });

  await step(page, "Haz clic en Calendario y elige Vista calendario: solo tus citas, sin filtro de esteticista", menuItem(page, "Vista calendario"), {
    before: async () => { await openHeaderMenu(page, "Calendario"); },
    after: async () => {
      await expect(page.locator(".fc-event").first()).toBeVisible();
      await expect(page.locator("main button[role=combobox]", { hasText: /esteticista/i })).toHaveCount(0);
      const texts = await page.locator(".fc-event").allInnerTexts();
      expect(texts.some((t) => /Andr[ée]s|Daniela/.test(t)), "no deben verse citas de Camila").toBe(false);
    },
  });

  await step(page, "Haz clic en una de tus citas para ver el detalle", page.locator(".fc-event", { hasText: "Santiago" }).first().locator(".fc-event-time"), {
    after: async () => {
      await expect(dialog(page)).toContainText("Detalle de la cita");
      await expect(dialog(page)).toContainText("Santiago Castro");
    },
  });

  endChapter();
});
