// Recorrido guiado: cada paso toma captura para el manual y registra ✅/❌.
import { expect, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Rol = "superadmin" | "admin" | "esteticista";
export interface StepResult { rol: Rol; cap: number; n: number; desc: string; ok: boolean; error?: string; img: string }

const ROOT = process.cwd();
export const IMG_DIR = join(ROOT, "docs", "manual", "img");
export const RESULTS_DIR = join(ROOT, "tests", "e2e", "ui", ".results");

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

export class Walk {
  readonly results: StepResult[] = [];
  private n = 0;
  constructor(readonly page: Page, readonly rol: Rol, readonly cap: number) {
    mkdirSync(join(IMG_DIR, rol), { recursive: true });
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  /** Ejecuta un paso; captura siempre (éxito o fallo); nunca aborta el capítulo. */
  async step(desc: string, fn: () => Promise<void>, opts: { settle?: number } = {}): Promise<boolean> {
    this.n += 1;
    const file = `cap${this.cap}-${String(this.n).padStart(2, "0")}-${slug(desc)}.png`;
    const img = join(IMG_DIR, this.rol, file);
    let ok = true;
    let error: string | undefined;
    try {
      await fn();
      await this.page.waitForTimeout(opts.settle ?? 400);
    } catch (e) {
      ok = false;
      error = String(e instanceof Error ? e.message : e).split("\n").slice(0, 4).join(" ").replace(/\s+/g, " ").slice(0, 400);
    }
    try { await this.page.screenshot({ path: img, fullPage: false }); } catch { /* página cerrada */ }
    this.results.push({ rol: this.rol, cap: this.cap, n: this.n, desc, ok, error, img: `img/${this.rol}/${file}` });
    console.log(`${ok ? "✅" : "❌"} [${this.rol} cap${this.cap}] ${desc}${error ? " → " + error : ""}`);
    return ok;
  }

  save() {
    writeFileSync(join(RESULTS_DIR, `${this.rol}-cap${this.cap}.json`), JSON.stringify(this.results, null, 2));
  }
}

// ─── Acciones de UI reutilizables ─────────────────────────────

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
  const input = page.locator("[cmdk-input]");
  await input.fill(search);
  await page.locator("[cmdk-item]", { hasText: optionText }).first().click();
}

export async function lastToast(page: Page, pattern?: string | RegExp) {
  const toasts = page.locator("[data-sonner-toast]");
  if (pattern) await expect(toasts.filter({ hasText: pattern }).first()).toBeVisible({ timeout: 8_000 });
  return (await toasts.allInnerTexts()).map((t) => t.replace(/\n/g, " "));
}

export const dialog = (page: Page) => page.locator("[role=dialog]");
export const alertDialog = (page: Page) => page.locator("[role=alertdialog]");

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
