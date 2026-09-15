import { defineConfig } from "@playwright/test";

// Tests e2e de la raíz. Son pruebas de API (APIRequestContext) + consultas SQL,
// así que no necesitan navegador instalado (`playwright install` no hace falta).
// El servidor .NET se levanta solo si no hay uno escuchando en 5055.
const API_URL = process.env.E2E_API_URL ?? "http://localhost:5055";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: API_URL,
    extraHTTPHeaders: { "Content-Type": "application/json" },
  },
  webServer: {
    command: "dotnet run --project apps/api/src/NemediClinic.Api --urls " + API_URL,
    url: `${API_URL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
