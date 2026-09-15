// ============================================================
// guide.ts — Pasos de la guía de uso con el clic marcado
//
// step(page, name, locator?, opts?)
//   1. opts.before(): preparación (llenar campos, abrir menús) antes de la captura.
//   2. Si hay locator: le pinta borde rojo 3 px, fondo semitransparente y un círculo
//      rojo con el número de paso (inyectado con evaluate, se quita tras capturar).
//   3. Captura 1440x900 en docs/manual/img/<rol>/capN-NN-nombre.png.
//   4. Si hay locator: hace el clic.
//   5. opts.after(): verificación de lo que el usuario debe ver.
//   Un fallo en cualquier fase se registra como ❌ con el error y el capítulo continúa.
//
// startChapter(page, rol, cap) inicia la numeración; endChapter() guarda los
// resultados en tests/e2e/ui/.results/<rol>-cap<N>.json.
// ============================================================
import type { Locator, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Rol = "superadmin" | "admin" | "esteticista";
export interface StepResult { rol: Rol; cap: number; n: number; name: string; ok: boolean; error?: string; img: string; clicked: boolean }
export interface StepOptions {
  before?: () => Promise<void>;
  after?: () => Promise<void>;
  /** Espera (ms) tras `before` y antes de capturar, para que la UI asiente. */
  settle?: number;
  /** false: resalta el elemento pero no hace clic (p. ej. un campo deshabilitado que se quiere señalar). */
  click?: boolean;
}

const ROOT = process.cwd();
export const IMG_DIR = join(ROOT, "docs", "manual", "img");
export const RESULTS_DIR = join(ROOT, "tests", "e2e", "ui", ".results");

interface Chapter { page: Page; rol: Rol; cap: number; n: number; results: StepResult[] }
let current: Chapter | null = null;

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

export function startChapter(page: Page, rol: Rol, cap: number) {
  mkdirSync(join(IMG_DIR, rol), { recursive: true });
  mkdirSync(RESULTS_DIR, { recursive: true });
  current = { page, rol, cap, n: 0, results: [] };
}

export function endChapter(): StepResult[] {
  if (!current) return [];
  writeFileSync(join(RESULTS_DIR, `${current.rol}-cap${current.cap}.json`), JSON.stringify(current.results, null, 2));
  const r = current.results;
  current = null;
  return r;
}

const BOX_ID = "__guide_box";
const BADGE_ID = "__guide_badge";

async function highlight(locator: Locator, n: number) {
  const el = locator.first();
  await el.waitFor({ state: "visible" });
  await el.scrollIntoViewIfNeeded();
  await el.evaluate((node, args) => {
    const r = node.getBoundingClientRect();
    const box = document.createElement("div");
    box.id = args.boxId;
    box.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:3px solid #e11d48;border-radius:8px;background:rgba(225,29,72,.14);z-index:2147483647;pointer-events:none;box-sizing:border-box;`;
    const badge = document.createElement("div");
    badge.id = args.badgeId;
    badge.textContent = String(args.n);
    badge.style.cssText = `position:fixed;left:${r.left - 18}px;top:${r.top - 18}px;width:30px;height:30px;border-radius:50%;background:#e11d48;color:#fff;font:700 15px/30px system-ui,sans-serif;text-align:center;z-index:2147483647;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.45);`;
    document.body.append(box, badge);
  }, { n, boxId: BOX_ID, badgeId: BADGE_ID });
}

async function unhighlight(page: Page) {
  await page.evaluate((ids) => { for (const id of ids) document.getElementById(id)?.remove(); }, [BOX_ID, BADGE_ID]).catch(() => undefined);
}

export async function step(page: Page, name: string, locator?: Locator | null, opts: StepOptions = {}): Promise<boolean> {
  if (!current) throw new Error("Llama a startChapter(page, rol, cap) antes de step()");
  const c = current;
  c.n += 1;
  const file = `cap${c.cap}-${String(c.n).padStart(2, "0")}-${slug(name)}.png`;
  const img = join(IMG_DIR, c.rol, file);
  let ok = true;
  let error: string | undefined;
  let captured = false;

  const capture = async () => {
    if (captured) return;
    captured = true;
    try { await page.screenshot({ path: img, fullPage: false }); } catch { /* página cerrada */ }
  };

  try {
    if (opts.before) await opts.before();
    await page.waitForTimeout(opts.settle ?? 350);
    if (locator) await highlight(locator, c.n);
    await capture();
    if (locator) {
      await unhighlight(page);
      if (opts.click !== false) await locator.first().click();
    }
    if (opts.after) await opts.after();
  } catch (e) {
    ok = false;
    error = String(e instanceof Error ? e.message : e).replace(/\x1b\[[0-9;]*m/g, "").split("\n").slice(0, 4).join(" ").replace(/\s+/g, " ").slice(0, 400);
    await unhighlight(page);
    await capture();
  }

  c.results.push({ rol: c.rol, cap: c.cap, n: c.n, name, ok, error, img: `img/${c.rol}/${file}`, clicked: !!locator && opts.click !== false });
  console.log(`${ok ? "✅" : "❌"} [${c.rol} cap${c.cap}] ${c.n}. ${name}${error ? " → " + error : ""}`);
  return ok;
}
