import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickSelect } from "../walk";
import { CREDS } from "../api";

test.describe.configure({ mode: "serial" });

test("Cap5 · Vista general (dueño)", async ({ page }) => {
  const w = new Walk(page, "superadmin", 5);
  await uiLogin(page, CREDS.superadmin.email, CREDS.superadmin.password);

  await w.step("Calendario con las citas de todas las esteticistas", async () => {
    await page.goto("/calendar");
    await expect(page.locator(".fc-event").first()).toBeVisible();
    expect(await page.locator(".fc-event").count()).toBeGreaterThanOrEqual(10);
  });

  await w.step("Filtrar el calendario por esteticista (Camila Ruiz)", async () => {
    await pickSelect(page.locator("main button[role=combobox]", { hasText: /esteticista/i }), "Camila");
    await page.waitForTimeout(1200);
    const texts = await page.locator(".fc-event").allInnerTexts();
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.some((t) => /Santiago|Mariana/.test(t)), "solo deben quedar citas de Camila").toBe(false);
  });

  await w.step("Hoja del día de toda la clínica", async () => {
    await page.goto("/calendar/day-sheet");
    await expect(page.locator("main")).toContainText("Esteticista:");
    await expect(page.locator("main")).toContainText("Laura Pérez");
    await expect(page.locator("main")).toContainText("Camila Ruiz");
  });

  w.save();
});
