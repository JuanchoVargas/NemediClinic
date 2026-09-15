import { test, expect } from "@playwright/test";
import { Walk, uiLogin, dialog } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap2 · Mi día (esteticista)", async ({ page }) => {
  const w = new Walk(page, "esteticista", 2);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);

  await w.step("Hoja del día: solo mis citas", async () => {
    await page.goto("/calendar/day-sheet");
    await expect(page.locator("main")).toContainText("Esteticista:");
    const text = await page.locator("main").innerText();
    expect(text).toContain("Laura Pérez");
    expect(text).not.toContain("Camila Ruiz");
  });

  await w.step("Calendario: solo mis citas y sin filtro de esteticista", async () => {
    await page.goto("/calendar");
    await expect(page.locator(".fc-event").first()).toBeVisible();
    await expect(page.locator("main button[role=combobox]", { hasText: /esteticista/i })).toHaveCount(0);
    const texts = await page.locator(".fc-event").allInnerTexts();
    expect(texts.some((t) => /Andr[ée]s|Daniela/.test(t)), "no deben verse citas de Camila").toBe(false);
  });

  await w.step("Abrir una de mis citas (Santiago Castro, hoy 8:00)", async () => {
    await page.locator(".fc-event", { hasText: "Santiago" }).first().click();
    await expect(dialog(page)).toContainText("Detalle de la cita");
    await expect(dialog(page)).toContainText("Santiago Castro");
  });

  w.save();
});
