import { test, expect } from "@playwright/test";
import { Walk, uiLogin, pickCombobox, pickSelect, dialog, alertDialog, lastToast, tab, activePanel, selectCalendarSlot, goToCalendarWeek, readState } from "../walk";
import { apiLogin, CREDS, req, localDate, localIso, dayAt } from "../api";

test.describe.configure({ mode: "serial" });

const TOMORROW = localDate(dayAt(1));
const created: string[] = [];
let camilaTime = "13:00:00"; // primera hora libre de la tarde para Camila

interface Appt { id: string; fechaInicio: string; patientNombre: string; esteticistNombre: string; estado: string }

/** Borra una cita en cualquier estado: la regresa a Agendada (única transición sin reglas) y la elimina. */
export async function purgeAppointment(token: string, id: string) {
  await req("PUT", `/api/v1/appointments/${id}/status`, { token, body: { estado: "Agendada" } });
  await req("DELETE", `/api/v1/appointments/${id}`, { token });
}

test.beforeAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  const list = (await req<Appt[]>("GET", `/api/v1/appointments?start=${localIso(dayAt(1))}&end=${localIso(dayAt(2))}`, { token: sa.token })).data ?? [];
  for (let h = 13; h <= 17; h++) {
    const hh = `${String(h).padStart(2, "0")}:00`;
    if (!list.some((a) => a.fechaInicio.slice(11, 16) === hh)) { camilaTime = `${hh}:00`; break; }
  }
});

test.afterAll(async () => {
  const sa = await apiLogin(CREDS.superadmin.email, CREDS.superadmin.password);
  for (const id of created) await purgeAppointment(sa.token, id);
  // Lo que dejó el Rol 3: la cita completada de Juliana y el paquete del recorrido
  const st = readState() as { linkedAppointmentId?: string; walkPackageId?: string };
  if (st.linkedAppointmentId) await purgeAppointment(sa.token, st.linkedAppointmentId);
  if (st.walkPackageId) await req("DELETE", `/api/v1/packages/${st.walkPackageId}`, { token: sa.token });
});

async function createAppointment(page: import("@playwright/test").Page, time: string, patient: string, procedure: string, esteticista: string, overrideTime?: string) {
  await selectCalendarSlot(page, TOMORROW, time);
  const d = dialog(page);
  await pickCombobox(d.locator("button", { hasText: "Buscar paciente" }), patient.split(" ")[0], patient);
  await pickSelect(d.locator('div:has(> label:has-text("Procedimiento")) button[role=combobox]'), procedure);
  await pickSelect(d.locator('div:has(> label:has-text("Esteticista")) button[role=combobox]'), esteticista);
  await expect(d.locator("input[type=datetime-local]")).toHaveValue(`${TOMORROW}T${time.slice(0, 5)}`);
  if (overrideTime) await d.locator("input[type=datetime-local]").fill(`${TOMORROW}T${overrideTime}`);
  await d.locator("button", { hasText: "Crear cita" }).click();
}

test("Cap4 · Agenda (recepción)", async ({ page }) => {
  const w = new Walk(page, "admin", 4);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const ad = await apiLogin(CREDS.admin.email, CREDS.admin.password);
  const appts = async () => (await req<Appt[]>("GET", `/api/v1/appointments?start=${localIso(dayAt(1))}&end=${localIso(dayAt(2))}`, { token: ad.token })).data ?? [];
  const tomorrowEvent = (time: string) => page.locator(`.fc-timegrid-col[data-date="${TOMORROW}"] .fc-event`, { hasText: `${time} - ` }).first();

  await w.step("Vista de mes", async () => {
    await page.goto("/calendar");
    await page.locator("main button", { hasText: /^Mes$/ }).click();
    await expect(page.locator(".fc-daygrid-body")).toBeVisible();
  });
  await w.step("Vista de semana", async () => {
    await page.locator("main button", { hasText: /^Semana$/ }).click();
    await expect(page.locator(".fc-timegrid-body")).toBeVisible();
  });
  await w.step("Vista de día", async () => {
    await page.locator("main button", { hasText: /^Día$/ }).click();
    await expect(page.locator(".fc-timegrid-col.fc-day")).toHaveCount(1);
    await page.locator("main button", { hasText: /^Semana$/ }).click();
  });

  await w.step("Crear cita para mañana 10:00 con Laura Pérez (Santiago Castro, limpieza facial)", async () => {
    await goToCalendarWeek(page, TOMORROW);
    await createAppointment(page, "10:00:00", "Santiago Castro", "Limpieza facial profunda", "Laura Pérez");
    await expect(dialog(page)).toBeHidden();
    const a = (await appts()).find((x) => x.fechaInicio === `${TOMORROW}T10:00:00` && /Santiago/.test(x.patientNombre));
    expect(a, "la cita debe quedar a las 10:00 exactas").toBeTruthy();
    created.push(a!.id);
    await expect(tomorrowEvent("10:00")).toContainText("Santiago");
  });

  await w.step(`Crear cita para mañana ${camilaTime.slice(0, 5)} con Camila Ruiz (Sara Hernández, radiofrecuencia)`, async () => {
    await createAppointment(page, camilaTime, "Sara Hernández", "Radiofrecuencia facial", "Camila Ruiz");
    await expect(dialog(page)).toBeHidden();
    const a = (await appts()).find((x) => x.fechaInicio === `${TOMORROW}T${camilaTime}` && /Sara/.test(x.patientNombre));
    expect(a, `la cita debe quedar a las ${camilaTime}`).toBeTruthy();
    created.push(a!.id);
  });

  await w.step("Conflicto de horario: Laura ya tiene cita a las 09:30", async () => {
    // Se abre el formulario en un slot libre (16:00) y se cambia la hora a 09:30,
    // que se solapa con la cita de Carolina (09:00–09:45) de Laura.
    await createAppointment(page, "16:00:00", "Mariana Gómez", "Peeling químico", "Laura Pérez", "09:30");
    await lastToast(page, /ya tiene una cita en ese horario/);
    await page.keyboard.press("Escape");
    const discard = alertDialog(page).locator("button", { hasText: "Descartar" });
    if (await discard.count()) await discard.click();
    await expect(dialog(page)).toBeHidden();
  });

  await w.step("Confirmar la cita de Laura (mañana 10:00)", async () => {
    await tomorrowEvent("10:00").locator(".fc-event-time").click();
    await dialog(page).locator("button", { hasText: /^Confirmar/ }).click();
    await lastToast(page, /Confirmada/);
    await expect(dialog(page)).toBeHidden();
  });

  await w.step(`Cancelar la cita de Camila (mañana ${camilaTime.slice(0, 5)})`, async () => {
    await tomorrowEvent(camilaTime.slice(0, 5)).locator(".fc-event-time").click();
    await dialog(page).locator("button", { hasText: /^Cancelar$/ }).click();
    await lastToast(page, /Cancelada/);
    await expect(dialog(page)).toBeHidden();
  });

  for (const [label, offset] of [["hoy", 0], ["ayer", -1], ["mañana", 1]] as const) {
    await w.step(`Hoja del día: ${label}`, async () => {
      await page.goto("/calendar/day-sheet");
      await page.locator("main input[type=date]").fill(localDate(dayAt(offset)));
      await expect(page.locator("main")).toContainText("Esteticista:");
    });
  }

  await w.step("Tras completar Laura su sesión, la ficha de Juliana muestra 1 / 2 sesiones (tab Paquetes)", async () => {
    const st = readState() as { julianaId?: string; walkPackageName?: string };
    if (!st.julianaId) throw new Error("No hay estado del Rol 3 (Laura no completó la sesión en esta corrida)");
    await page.goto(`/patients/${st.julianaId}`);
    await tab(page, "Paquetes").click();
    const card = activePanel(page).locator("[data-slot=card], .rounded-xl", { hasText: st.walkPackageName ?? "" }).first();
    await expect(card).toContainText("1 / 2");
  });

  w.save();
});
