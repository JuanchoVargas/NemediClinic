import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, chooseCombobox, option, dialog, lastToast, selectCalendarSlot, goToCalendarWeek, writeState } from "../walk";
import { apiLogin, CREDS, req, safeDelete, findPatient, listAll, localDate, localIso, dayAt } from "../api";

test.describe.configure({ mode: "serial" });

// La sesión que Laura atiende (Confirmar → Iniciar → Completar) pertenece a un paquete
// propio del recorrido ("Plan Piel Luminosa", 2 masajes) asignado a Juliana en cada corrida.
// Recepción (Cap4) verifica "1 / 2" en su ficha y al final borra el paquete y la cita.

export const WALK_PKG = "Plan Piel Luminosa";
const NEW_DAY = dayAt(3);
const SESSION_DAY = dayAt(6);
let createdId: string | undefined;
let linkedTime = "";

interface Session { id: string; numero: number; estado: string; procedureId: string }
interface PP { id: string; sesiones: Session[] }

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const laura = await apiLogin(CREDS.esteticista.email, CREDS.esteticista.password);
  const juliana = await findPatient(sa.token, "1000000003");
  const procs = await listAll<{ id: string; nombre: string }>(sa.token, "/api/v1/procedures");
  const masaje = procs.find((p) => /Masaje reductor/.test(p.nombre))!;
  const pkg = await req<{ id: string }>("POST", "/api/v1/packages", { token: sa.token, body: { nombre: WALK_PKG, descripcion: "Dos masajes reductores.", precioTotal: 160000, sesionesTotales: 2, vigenciaDias: 60, diasAlertaVencimiento: 10 } });
  await req("POST", `/api/v1/packages/${pkg.data!.id}/procedures`, { token: sa.token, body: { procedureId: masaje.id, cantidadSesiones: 2 } });
  const pp = await req<{ id: string }>("POST", "/api/v1/patient-packages", { token: sa.token, body: { patientId: juliana!.id, packageId: pkg.data!.id, precioAcordado: 160000, fechaInicio: localDate(new Date()) } });
  const full = (await req<PP>("GET", `/api/v1/patient-packages/${pp.data!.id}`, { token: sa.token })).data!;
  const session1 = full.sesiones.find((s) => s.numero === 1)!;
  const branch = (await req<{ items: { id: string }[] }>("GET", "/api/v1/branches?page=1&pageSize=5", { token: sa.token })).data!.items[0];
  const taken = (await req<{ fechaInicio: string; esteticistId: string }[]>("GET", `/api/v1/appointments?start=${localIso(SESSION_DAY)}&end=${localIso(dayAt(7))}`, { token: sa.token })).data ?? [];
  let hour = 9;
  while (taken.some((a) => a.esteticistId === laura.userInfo.id && a.fechaInicio.slice(11, 13) === String(hour).padStart(2, "0")) && hour < 17) hour++;
  const start = new Date(SESSION_DAY); start.setHours(hour, 0, 0, 0);
  linkedTime = `${hour}:00`; // FullCalendar pinta "9:00 - 10:00" (sin cero a la izquierda)
  const created = await req<{ id: string }>("POST", "/api/v1/appointments", {
    token: sa.token,
    body: { patientId: juliana!.id, esteticistId: laura.userInfo.id, procedureId: masaje.id, branchId: branch.id, fechaInicio: localIso(start), patientPackageSessionId: session1.id, notas: "Sesión del paquete (recorrido de manual)" },
  });
  writeState({ julianaId: juliana!.id, walkPackageId: pkg.data!.id, walkPackageName: WALK_PKG, linkedAppointmentId: created.data?.id, linkedDay: localDate(SESSION_DAY), linkedTime });
});

test.afterAll(async () => {
  if (!createdId) return;
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  await safeDelete(sa.token, `/api/v1/appointments/${createdId}`);
});

test("Cap3 · Atender (esteticista)", async ({ page }) => {
  startChapter(page, "esteticista", 3);
  await uiLogin(page, CREDS.esteticista.email, CREDS.esteticista.password);
  const la = await apiLogin(CREDS.esteticista.email, CREDS.esteticista.password);
  const d = () => dialog(page);
  const newDay = localDate(NEW_DAY);
  const linked = () => page.locator(`.fc-timegrid-col[data-date="${localDate(SESSION_DAY)}"] .fc-event`, { hasText: "Juliana" }).filter({ hasText: `${linkedTime} - ` }).first().locator(".fc-event-time");

  await step(page, "En el calendario, haz clic en un espacio libre (viernes 16:00): el campo Esteticista viene fijo con tu nombre", d().locator('div:has(> label:has-text("Esteticista")) button[role=combobox]'), {
    before: async () => {
      await page.goto("/calendar");
      await goToCalendarWeek(page, newDay);
      await selectCalendarSlot(page, newDay, "16:00:00");
    },
    click: false, // el campo está deshabilitado a propósito: se resalta, no se pulsa
    after: async () => {
      const est = d().locator('div:has(> label:has-text("Esteticista")) button[role=combobox]');
      await expect(est).toContainText("Laura Pérez");
      await expect(est).toBeDisabled();
      await expect(d().locator("input[type=datetime-local]")).toHaveValue(`${newDay}T16:00`);
    },
  });

  await step(page, "Haz clic en Buscar paciente y elige a Santiago Castro", d().locator("button", { hasText: "Buscar paciente" }), {
    after: async () => { await chooseCombobox(page, "Santiago", "Santiago Castro"); },
  });

  await step(page, "Abre Procedimiento y elige Hidratación profunda", d().locator('div:has(> label:has-text("Procedimiento")) button[role=combobox]'), {
    after: async () => { await option(page, "Hidratación profunda").click(); },
  });

  await step(page, "Presiona Crear cita", d().locator("button", { hasText: "Crear cita" }), {
    after: async () => {
      await expect(d()).toBeHidden();
      const list = await req<{ id: string; fechaInicio: string }[]>("GET", `/api/v1/appointments?start=${localIso(dayAt(3))}&end=${localIso(dayAt(4))}`, { token: la.token });
      createdId = list.data?.find((a) => a.fechaInicio === `${newDay}T16:00:00`)?.id;
      expect(createdId, "la cita debe existir a las 16:00").toBeTruthy();
      await expect(page.locator(`.fc-timegrid-col[data-date="${newDay}"] .fc-event`, { hasText: "16:00" })).toContainText("Santiago");
    },
  });

  await step(page, "Ve a la semana siguiente y haz clic en la cita de Juliana (sesión de su paquete)", linked(), {
    before: async () => { await goToCalendarWeek(page, localDate(SESSION_DAY)); },
    after: async () => { await expect(d()).toContainText("Juliana Martínez"); },
  });

  await step(page, "Presiona Confirmar", d().locator("button", { hasText: /^Confirmar/ }), {
    after: async () => { await lastToast(page, /Cita marcada como Confirmada/); await expect(d()).toBeHidden(); },
  });

  await step(page, "Vuelve a abrir la cita y presiona Iniciar", d().locator("button", { hasText: /^Iniciar/ }), {
    before: async () => { await linked().click(); await expect(d()).toBeVisible(); },
    after: async () => { await lastToast(page, /Cita marcada como En curso/); await expect(d()).toBeHidden(); },
  });

  await step(page, "Vuelve a abrir la cita y presiona Completar", d().locator("button", { hasText: /^Completar/ }), {
    before: async () => { await linked().click(); await expect(d()).toBeVisible(); },
    after: async () => {
      await lastToast(page, /Cita marcada como Completada/);
      await expect(d()).toBeHidden();
      await linked().click();
      await expect(d()).toContainText("Completada");
      await page.keyboard.press("Escape");
    },
  });

  await step(page, "Las citas de otras esteticistas no aparecen en tu calendario", null, {
    before: async () => { await goToCalendarWeek(page, localDate(dayAt(0))); },
    after: async () => {
      await expect(page.locator(".fc-event", { hasText: "Andr" })).toHaveCount(0);
      await expect(page.locator(".fc-event", { hasText: "Daniela" })).toHaveCount(0);
    },
  });

  endChapter();
});
