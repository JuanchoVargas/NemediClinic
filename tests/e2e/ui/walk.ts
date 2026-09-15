// Acciones de UI reutilizables por los specs del recorrido. Los pasos con captura
// y clic marcado viven en helpers/guide.ts (startChapter / step / endChapter).
import { expect, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RESULTS_DIR } from "./helpers/guide";

export { IMG_DIR, RESULTS_DIR } from "./helpers/guide";

export async function uiLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

export async function uiLogout(page: Page) {
  await page.locator("header button", { hasText: "Cerrar sesión" }).click();
  await page.waitForURL(/\/login/);
}

/** Select de shadcn/Radix: abre el trigger y elige la opción por texto. */
export async function pickSelect(trigger: Locator, optionText: string | RegExp) {
  await trigger.click();
  const page = trigger.page();
  await page.locator("[role=option]", { hasText: optionText }).first().click();
}

/** Combobox cmdk (Popover + Command): abre, escribe y elige. */
export async function pickCombobox(trigger: Locator, search: string, optionText: string | RegExp) {
  await trigger.click();
  const page = trigger.page();
  await page.locator("[cmdk-input]").fill(search);
  await page.locator("[cmdk-item]", { hasText: optionText }).first().click();
}

/** Con el popover cmdk ya abierto: escribe y elige. */
export async function chooseCombobox(page: Page, search: string, optionText: string | RegExp) {
  await page.locator("[cmdk-input]").fill(search);
  await page.locator("[cmdk-item]", { hasText: optionText }).first().click();
}

export async function lastToast(page: Page, pattern?: string | RegExp) {
  const toasts = page.locator("[data-sonner-toast]");
  if (pattern) await expect(toasts.filter({ hasText: pattern }).first()).toBeVisible({ timeout: 8_000 });
  return (await toasts.allInnerTexts()).map((t) => t.replace(/\n/g, " "));
}

export const dialog = (page: Page) => page.locator("[role=dialog]");
export const alertDialog = (page: Page) => page.locator("[role=alertdialog]");
export const option = (page: Page, text: string | RegExp) => page.locator("[role=option]", { hasText: text }).first();
export const menuItem = (page: Page, text: string | RegExp) => page.locator("[role=menuitem]", { hasText: text }).first();
export const headerLink = (page: Page, text: string | RegExp) => page.locator("header nav a", { hasText: text }).first();
export const headerMenu = (page: Page, text: string | RegExp) => page.locator("header nav button", { hasText: text }).first();

/** Abre un menú desplegable del header y espera a ver sus opciones (reintenta: tras navegar
 *  por una opción, Radix puede ignorar el primer clic sobre el trigger). */
export async function openHeaderMenu(page: Page, text: string | RegExp) {
  for (let i = 0; i < 3; i++) {
    await headerMenu(page, text).click();
    const items = page.locator("[role=menuitem]");
    try { await items.first().waitFor({ state: "visible", timeout: 1500 }); return; } catch { /* reintenta */ }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  throw new Error(`no se pudo abrir el menú ${String(text)}`);
}

/** Cierra un diálogo abierto descartando cambios si los hay. */
export async function closeDialog(page: Page) {
  if (!(await dialog(page).count())) return;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const discard = alertDialog(page).locator("button", { hasText: "Descartar" });
  if (await discard.count()) await discard.click();
  await expect(dialog(page)).toBeHidden();
}

/** Selecciona un slot vacío del calendario (vista semana) por fecha y hora. */
export async function selectCalendarSlot(page: Page, date: string, time: string) {
  const col = page.locator(`.fc-timegrid-col.fc-day[data-date="${date}"]`).first();
  const lane = page.locator(`.fc-timegrid-slot-lane[data-time="${time}"]`).first();
  const c = await col.boundingBox();
  const l = await lane.boundingBox();
  if (!c || !l) throw new Error(`slot no visible: ${date} ${time}`);
  const x = c.x + c.width / 2;
  const y = l.y + 4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 6);
  await page.mouse.up();
  await expect(dialog(page)).toBeVisible();
}

/** Ir a la semana que contiene `date` en el calendario: vuelve a "Hoy" y avanza/retrocede. */
export async function goToCalendarWeek(page: Page, date: string) {
  const has = () => page.locator(`.fc-timegrid-col.fc-day[data-date="${date}"]`).count();
  if (await has()) return;
  await page.locator("main button", { hasText: /^Hoy$/ }).click();
  await page.waitForTimeout(500);
  const forward = date >= new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 8; i++) {
    if (await has()) return;
    await page.locator("main button", { hasText: forward ? "›" : "‹" }).click();
    await page.waitForTimeout(600);
  }
  throw new Error(`no se llegó a la semana de ${date}`);
}

export const tab = (page: Page, text: string) => page.locator("[role=tab]", { hasText: text });
export const activePanel = (page: Page) => page.locator("[role=tabpanel][data-state=active]");

/** Estado compartido entre roles (p. ej. la cita que Laura completa y Recepción verifica). */
const STATE_FILE = join(RESULTS_DIR, "state.json");
export function writeState(patch: Record<string, unknown>) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const current = readState();
  writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...patch }, null, 2));
}
export function readState(): Record<string, unknown> {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")) as Record<string, unknown>; } catch { return {}; }
}
