// Responsive: cero scroll horizontal a 390×844 en cada ruta y rol.
//
// Por cada pantalla: navega, espera a que cargue, mide document.scrollWidth contra
// window.innerWidth y guarda una captura en docs/manual/img/mobile/. Falla con la lista de
// elementos que se salen del ancho, para que el arreglo sea directo.
// También abre un formulario por rol: en móvil los diálogos ocupan toda la pantalla.
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { apiLogin, CREDS, findPatient } from "../ui/api";

const SHOTS = "docs/manual/img/mobile";
const PLATFORM = { email: process.env.E2E_PLATFORM_EMAIL ?? "platform@nemedi.dev", password: process.env.E2E_PLATFORM_PASSWORD ?? "Platform2026!" };

mkdirSync(SHOTS, { recursive: true });

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.removeItem("auth-storage"));
  await page.goto("/login");
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/**
 * Dos comprobaciones: (1) el documento no es más ancho que la pantalla y (2) ningún elemento
 * visible se sale por la derecha. La segunda no depende de que el desborde llegue a generar
 * scroll (un contenedor con overflow-hidden lo taparía, dejando contenido recortado): se ignoran
 * solo los elementos que viven DENTRO de un contenedor con scroll propio (p. ej. la barra de pestañas).
 */
async function expectNoHorizontalScroll(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const width = window.innerWidth;
    const scrollsInside = (el: Element): boolean => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        // "hidden" NO excusa: un elemento recortado por overflow-hidden es un defecto visible
        if (ox === "auto" || ox === "scroll") return true;
      }
      return false;
    };
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      if (offenders.length >= 6) return;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") return;
      // Fuera de la medición: las herramientas de desarrollo de TanStack (solo existen con `vite dev`),
      // el interior de los SVG (su caja la da el <svg>) y el encabezado de las tablas en modo tarjeta,
      // que ResponsiveTable deja solo para lectores de pantalla (recortado a 1 px a propósito).
      if (el.closest('[class*="tsqd"], [class*="TanStackRouterDevtools"], .rt-cards thead')) return;
      if (el instanceof SVGElement && el.ownerSVGElement) return;
      if (rect.right > width + 1 && rect.left < width && !scrollsInside(el)) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} → right=${Math.round(rect.right)}`);
      }
    });
    return { scrollWidth: document.documentElement.scrollWidth, width, offenders };
  });
  const detail = [label, ...result.offenders].join(" | ");
  expect(result.scrollWidth, `scrollWidth > innerWidth · ${detail}`).toBeLessThanOrEqual(result.width);
  expect(result.offenders, `elementos fuera del ancho · ${detail}`).toEqual([]);
}

async function visit(page: Page, rol: string, path: string, slug: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500); // animaciones de entrada
  await expectNoHorizontalScroll(page, `${rol} ${path}`);
  await page.screenshot({ path: `${SHOTS}/${rol}-${slug}.png` });
}

const CLINIC_ROUTES: [string, string][] = [
  ["/dashboard", "dashboard"],
  ["/patients", "pacientes"],
  ["/patients/new", "paciente-nuevo"],
  ["/valoraciones", "valoraciones"],
  ["/calendar", "calendario"],
  ["/calendar/day-sheet", "hoja-del-dia"],
  ["/procedures", "procedimientos"],
  ["/inventory", "inventario"],
  ["/change-password", "cambiar-contrasena"],
];

test("público: inicio y login", async ({ page }) => {
  await visit(page, "publico", "/", "inicio");
  await visit(page, "publico", "/login", "login");
});

test("dueño (SuperAdmin): todas sus rutas", async ({ page }) => {
  await login(page, CREDS.superadmin.email, CREDS.superadmin.password);
  for (const [path, slug] of CLINIC_ROUTES) await visit(page, "superadmin", path, slug);
  for (const [path, slug] of [["/packages", "paquetes"], ["/packages/new", "paquete-nuevo"], ["/admin/users", "usuarios"], ["/admin/branches", "sedes"], ["/super/tenants", "mi-clinica"]] as const)
    await visit(page, "superadmin", path, slug);

  // Ficha del paciente y cada pestaña
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const valentina = await findPatient(sa.token, "1000000001");
  await visit(page, "superadmin", `/patients/${valentina!.id}`, "ficha");
  for (const name of ["Historia clínica", "Evolución", "Consentimientos", "Paquetes", "Pagos"]) {
    await page.locator("[role=tab]", { hasText: name }).click();
    await page.waitForTimeout(900);
    await expectNoHorizontalScroll(page, `superadmin ficha · ${name}`);
    await page.screenshot({ path: `${SHOTS}/superadmin-ficha-${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-")}.png` });
  }

  // Menú lateral (panel deslizante en móvil)
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Mostrar u ocultar el menú" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/superadmin-menu.png` });
  await page.keyboard.press("Escape");

  // Un formulario: en móvil el diálogo ocupa toda la pantalla
  await page.goto("/admin/users");
  await page.getByRole("button", { name: /Nuevo usuario/ }).click();
  const dialog = page.locator("[role=dialog]");
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(400); // animación de entrada (scale 0.96 → 1)
  const box = await dialog.boundingBox();
  expect(Math.round(box!.width), "el diálogo ocupa todo el ancho").toBe(390);
  expect(Math.round(box!.height), "el diálogo ocupa todo el alto").toBe(844);
  await expectNoHorizontalScroll(page, "superadmin diálogo Nuevo usuario");
  await page.screenshot({ path: `${SHOTS}/superadmin-dialogo-usuario.png` });
});

test("recepción (Admin): todas sus rutas", async ({ page }) => {
  await login(page, CREDS.admin.email, CREDS.admin.password);
  for (const [path, slug] of CLINIC_ROUTES) await visit(page, "admin", path, slug);
  for (const [path, slug] of [["/packages", "paquetes"], ["/admin/users", "usuarios"], ["/admin/branches", "sedes"]] as const)
    await visit(page, "admin", path, slug);
});

test("esteticista: todas sus rutas", async ({ page }) => {
  await login(page, CREDS.esteticista.email, CREDS.esteticista.password);
  for (const [path, slug] of CLINIC_ROUTES) await visit(page, "esteticista", path, slug);

  // El calendario arranca en vista de día
  await page.goto("/calendar");
  await expect(page.locator(".fc-timeGridDay-view")).toBeVisible();
});

test("plataforma (PlatformAdmin): /platform y sus pestañas", async ({ page }) => {
  await login(page, PLATFORM.email, PLATFORM.password);
  await visit(page, "platform", "/platform", "tenants");
  for (const name of ["Canales", "Oportunidades", "Liquidación"]) {
    await page.locator("[role=tab]", { hasText: name }).click();
    await page.waitForTimeout(900);
    await expectNoHorizontalScroll(page, `platform · ${name}`);
    await page.screenshot({ path: `${SHOTS}/platform-${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-")}.png` });
  }
});
