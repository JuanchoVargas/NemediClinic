import { test, expect } from "@playwright/test";
import { startChapter, step, endChapter } from "../helpers/guide";
import { uiLogin, chooseCombobox, pickCombobox, pickSelect, option, dialog, closeDialog, lastToast, tab, activePanel, headerMenu, openHeaderMenu, menuItem, selectCalendarSlot, goToCalendarWeek, readState } from "../walk";
import { apiLogin, CREDS, req, listAll, safeDelete, localDate, localIso, dayAt } from "../api";

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
  const st = readState() as { linkedAppointmentId?: string; walkPackageId?: string; julianaId?: string };
  if (st.linkedAppointmentId) await purgeAppointment(sa.token, st.linkedAppointmentId);
  // La asignación se borra aparte: desde que guarda su copia del catálogo, borrar el paquete ya
  // no la esconde y cada corrida dejaría una tarjeta más en la ficha de Juliana.
  if (st.walkPackageId && st.julianaId) {
    const asignadas = await listAll<{ id: string; packageId: string }>(sa.token, `/api/v1/patient-packages/patient/${st.julianaId}`);
    for (const a of asignadas.filter((x) => x.packageId === st.walkPackageId))
      await safeDelete(sa.token, `/api/v1/patient-packages/${a.id}`);
  }
  if (st.walkPackageId) await req("DELETE", `/api/v1/packages/${st.walkPackageId}`, { token: sa.token });
});

test("Cap4 · Agenda (recepción)", async ({ page }) => {
  startChapter(page, "admin", 4);
  await uiLogin(page, CREDS.admin.email, CREDS.admin.password);
  const ad = await apiLogin(CREDS.admin.email, CREDS.admin.password);
  const d = () => dialog(page);
  const appts = async () => (await req<Appt[]>("GET", `/api/v1/appointments?start=${localIso(dayAt(1))}&end=${localIso(dayAt(2))}`, { token: ad.token })).data ?? [];
  const tomorrowEvent = (time: string) => page.locator(`.fc-timegrid-col[data-date="${TOMORROW}"] .fc-event`, { hasText: `${time} - ` }).first().locator(".fc-event-time");
  const procSel = () => d().locator('div:has(> label:has-text("Procedimiento")) button[role=combobox]');
  const estSel = () => d().locator('div:has(> label:has-text("Esteticista")) button[role=combobox]');
  const camilaHH = camilaTime.slice(0, 5);

  await step(page, "Haz clic en Calendario y elige Vista calendario", menuItem(page, "Vista calendario"), {
    before: async () => { await openHeaderMenu(page, "Calendario"); },
    after: async () => { await expect(page).toHaveURL(/\/calendar$/); await expect(page.locator(".fc-timegrid-body")).toBeVisible(); },
  });

  await step(page, "Presiona Mes para ver el mes completo", page.locator("main button", { hasText: /^Mes$/ }), {
    after: async () => { await expect(page.locator(".fc-daygrid-body")).toBeVisible(); },
  });

  await step(page, "Presiona Día para ver un solo día", page.locator("main button", { hasText: /^Día$/ }), {
    after: async () => { await expect(page.locator(".fc-timegrid-col.fc-day")).toHaveCount(1); },
  });

  await step(page, "Presiona Semana para volver a la vista semanal", page.locator("main button", { hasText: /^Semana$/ }), {
    after: async () => { await expect(page.locator(".fc-timegrid-body")).toBeVisible(); },
  });

  await step(page, "Haz clic en el espacio libre de mañana a las 10:00: se abre el formulario con esa hora", d().locator("input[type=datetime-local]"), {
    before: async () => { await goToCalendarWeek(page, TOMORROW); await selectCalendarSlot(page, TOMORROW, "10:00:00"); },
    after: async () => { await expect(d().locator("input[type=datetime-local]")).toHaveValue(`${TOMORROW}T10:00`); },
  });

  await step(page, "Haz clic en Buscar paciente y elige a Santiago Castro", d().locator("button", { hasText: "Buscar paciente" }), {
    after: async () => { await chooseCombobox(page, "Santiago", "Santiago Castro"); },
  });

  await step(page, "Abre Procedimiento y elige Limpieza facial profunda", procSel(), {
    after: async () => { await option(page, "Limpieza facial profunda").click(); },
  });

  await step(page, "Abre Esteticista y elige Laura Pérez", estSel(), {
    after: async () => { await option(page, "Laura Pérez").click(); },
  });

  await step(page, "Presiona Crear cita: la cita aparece a las 10:00", d().locator("button", { hasText: "Crear cita" }), {
    after: async () => {
      await expect(d()).toBeHidden();
      const a = (await appts()).find((x) => x.fechaInicio === `${TOMORROW}T10:00:00` && /Santiago/.test(x.patientNombre));
      expect(a, "la cita debe quedar a las 10:00 exactas").toBeTruthy();
      created.push(a!.id);
      await expect(tomorrowEvent("10:00")).toBeVisible();
    },
  });

  await step(page, `Crea otra cita: mañana ${camilaHH} con Camila Ruiz para Sara Hernández (radiofrecuencia) y presiona Crear cita`, d().locator("button", { hasText: "Crear cita" }), {
    before: async () => {
      await selectCalendarSlot(page, TOMORROW, camilaTime);
      await pickCombobox(d().locator("button", { hasText: "Buscar paciente" }), "Sara", "Sara Hernández");
      await pickSelect(procSel(), "Radiofrecuencia facial");
      await pickSelect(estSel(), "Camila Ruiz");
    },
    after: async () => {
      await expect(d()).toBeHidden();
      const a = (await appts()).find((x) => x.fechaInicio === `${TOMORROW}T${camilaTime}` && /Sara/.test(x.patientNombre));
      expect(a, `la cita debe quedar a las ${camilaTime}`).toBeTruthy();
      created.push(a!.id);
    },
  });

  await step(page, "Intenta agendar a Laura a las 09:30, cuando ya tiene cita: el sistema avisa el choque", d().locator("button", { hasText: "Crear cita" }), {
    before: async () => {
      await selectCalendarSlot(page, TOMORROW, "16:00:00");
      await pickCombobox(d().locator("button", { hasText: "Buscar paciente" }), "Mariana", "Mariana Gómez");
      await pickSelect(procSel(), "Peeling químico");
      await pickSelect(estSel(), "Laura Pérez");
      await d().locator("input[type=datetime-local]").fill(`${TOMORROW}T09:30`);
    },
    after: async () => { await lastToast(page, /ya tiene una cita en ese horario/); await closeDialog(page); },
  });

  await step(page, "Haz clic en la cita de las 10:00 y presiona Confirmar", d().locator("button", { hasText: /^Confirmar/ }), {
    before: async () => { await tomorrowEvent("10:00").click(); await expect(d()).toBeVisible(); },
    after: async () => { await lastToast(page, /Confirmada/); await expect(d()).toBeHidden(); },
  });

  await step(page, `Haz clic en la cita de Camila (${camilaHH}) y presiona Cancelar`, d().locator("button", { hasText: /^Cancelar$/ }), {
    before: async () => { await tomorrowEvent(camilaHH).click(); await expect(d()).toBeVisible(); },
    after: async () => { await lastToast(page, /Cancelada/); await expect(d()).toBeHidden(); },
  });

  await step(page, "Haz clic en Hoja del día", page.locator("main a", { hasText: "Hoja del día" }), {
    after: async () => { await expect(page.locator("main")).toContainText("Esteticista:"); },
  });

  await step(page, "Cambia la fecha a ayer con el campo de fecha", null, {
    before: async () => { await page.locator("main input[type=date]").fill(localDate(dayAt(-1))); },
    after: async () => { await expect(page.locator("main")).toContainText("Esteticista:"); },
  });

  await step(page, "Cambia la fecha a mañana", null, {
    before: async () => { await page.locator("main input[type=date]").fill(localDate(dayAt(1))); },
    after: async () => { await expect(page.locator("main")).toContainText("Esteticista:"); },
  });

  await step(page, "Abre la ficha de Juliana y haz clic en Paquetes: la sesión que atendió Laura ya está descontada (1 / 2)", tab(page, "Paquetes"), {
    before: async () => {
      const st = readState() as { julianaId?: string };
      if (!st.julianaId) throw new Error("No hay estado del Rol 3 (Laura no completó la sesión en esta corrida)");
      await page.goto(`/patients/${st.julianaId}`);
      await expect(page.locator("main h1")).toContainText("Juliana");
    },
    after: async () => {
      const st = readState() as { walkPackageName?: string };
      const card = activePanel(page).locator("[data-slot=card], .rounded-xl", { hasText: st.walkPackageName ?? "" }).first();
      await expect(card).toContainText("1 / 2");
    },
  });

  endChapter();
});
