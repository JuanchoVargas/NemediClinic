import { defineConfig, devices } from "@playwright/test";

// Tests e2e de la raíz.
//   - api:          gate de push (aislamiento multi-tenant), solo APIRequestContext.
//   - setup + superadmin → esteticista → admin: recorrido de UI por rol con
//     capturas para docs/manual (orden forzado con `dependencies`).
//   - mobile:       cero scroll horizontal a 390×844 en toda ruta y rol (pnpm test:mobile).
// Los servidores se levantan solos si no hay nada escuchando (API 5055, Vite 5173).
const API_URL = process.env.E2E_API_URL ?? "http://localhost:5055";
const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:5173";

const uiUse = {
  ...devices["Desktop Chrome"],
  baseURL: WEB_URL,
  viewport: { width: 1440, height: 900 },
  locale: "es-CO",
  timezoneId: "America/Bogota",
  // Un paso que no encuentra su elemento falla en 15 s y el capítulo sigue con el siguiente paso.
  actionTimeout: 15_000,
  navigationTimeout: 30_000,
};

export default defineConfig({
  testDir: "./tests/e2e",
  // Cada capítulo de UI encadena hasta 12 pasos con captura; el gate de API usa mucho menos.
  timeout: 600_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    {
      name: "api",
      testMatch: /(tenant-isolation|business-rules)\.spec\.ts/,
      // Sin Content-Type global: Playwright pone application/json cuando `data` es un objeto y
      // multipart/form-data (con su boundary) cuando se usa `multipart` — p. ej. al subir imágenes.
      use: { baseURL: API_URL },
    },
    { name: "setup", testMatch: /ui\/global\.setup\.ts/, use: uiUse },
    { name: "superadmin", testMatch: /ui\/superadmin\/.*\.spec\.ts/, dependencies: ["setup"], use: uiUse },
    { name: "esteticista", testMatch: /ui\/esteticista\/.*\.spec\.ts/, dependencies: ["superadmin"], use: uiUse },
    { name: "admin", testMatch: /ui\/admin\/.*\.spec\.ts/, dependencies: ["esteticista"], use: uiUse },
    // Responsive: 390×844 táctil. Falla si alguna ruta tiene scroll horizontal; capturas en docs/manual/img/mobile.
    {
      name: "mobile",
      testMatch: /mobile\/.*\.spec\.ts/,
      use: { ...uiUse, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: [
    {
      command: "dotnet run --project apps/api/src/NemediClinic.Api --urls " + API_URL,
      url: `${API_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "pnpm exec vite --port 5173 --strictPort",
      cwd: "apps/web",
      url: WEB_URL,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
