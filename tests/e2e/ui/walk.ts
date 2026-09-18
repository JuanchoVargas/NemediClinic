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

/** Botón del menú de usuario (arriba a la derecha): ahí viven el tema y "Cerrar sesión". */
export const userMenu = (page: Page) => page.locator('header button[aria-label="Menú de usuario"]');

export async function uiLogout(page: Page) {
  await userMenu(page).click();
  await menuItem(page, "Cerrar sesión").click();
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
// La navegación vive en el sidebar. Se conservan los nombres header* para no tocar cada spec:
//   headerLink  → enlace directo del menú lateral (Pacientes, Procedimientos, Inventario…)
//   headerMenu  → grupo desplegable del menú lateral (Calendario, Administración)
//   menuItem    → opción de un grupo desplegable, o de un menú flotante (menú de usuario)
export const sidebar = (page: Page) => page.locator("[data-slot=sidebar]").first();
export const menuItem = (page: Page, text: string | RegExp) =>
  page.locator("[role=menuitem], [data-sidebar=menu-sub-button]", { hasText: text }).first();
export const headerLink = (page: Page, text: string | RegExp) =>
  page.locator("[data-sidebar=menu-button][href]", { hasText: text }).first();
export const headerMenu = (page: Page, text: string | RegExp) =>
  page.locator("button[data-sidebar=menu-button]", { hasText: text }).first();

/** Abre un menú desplegable del header y espera a ver sus opciones (reintenta: tras navegar
 *  por una opción, Radix puede ignorar el primer clic sobre el trigger). */
export async function openHeaderMenu(page: Page, text: string | RegExp) {
  const trigger = headerMenu(page, text);
  await trigger.waitFor({ state: "visible" });
  // El grupo ya está abierto si la ruta actual está dentro: un clic lo cerraría
  if ((await trigger.getAttribute("aria-expanded")) === "true") return;
  await trigger.click();
  await page.locator("[data-sidebar=menu-sub-button]").first().waitFor({ state: "visible", timeout: 3000 });
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

/**
 * Selecciona un slot vacío del calendario (vista semana) por fecha y hora.
 * Si esa hora ya tiene cita, FullCalendar ignora el arrastre (o abre el detalle de la cita):
 * se recorren las demás horas del día, de la tarde hacia la mañana, hasta que abra "Nueva cita".
 */
export async function selectCalendarSlot(page: Page, date: string, time: string) {
  const col = page.locator(`.fc-timegrid-col.fc-day[data-date="${date}"]`).first();
  const c = await col.boundingBox();
  if (!c) throw new Error(`día no visible en el calendario: ${date}`);
  const x = c.x + c.width / 2;

  // Solo las horas en punto que la vista realmente pinta (07:00–19:00 según slotMaxTime).
  const horas = await page
    .locator('.fc-timegrid-slot-lane[data-time$=":00:00"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-time") ?? "").filter(Boolean));
  const candidatas = [time, ...horas.filter((h) => h !== time).reverse()];

  for (const t of candidatas) {
    const lane = page.locator(`.fc-timegrid-slot-lane[data-time="${t}"]`).first();
    if (!(await lane.count())) continue;
    const l = await lane.boundingBox();
    if (!l) continue;
    const y = l.y + 4;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 6);
    await page.mouse.up();
    const abrio = await dialog(page).waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false);
    // Si el arrastre empezó encima de una cita, lo que se abre es su detalle: no sirve.
    if (abrio && (await dialog(page).getByText("Nueva cita").count())) return;
    if (abrio) {
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
    }
  }
  throw new Error(`no hay hueco libre cerca de ${date} ${time}`);
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
