// Reglas de negocio que no deben romperse, verificadas por API contra el tenant demo (gate de push,
// junto con el aislamiento multi-tenant). Cada bloque crea sus propios datos y los elimina al final.
//
//   · Pagos: un pago no puede superar el saldo (422), guarda quién lo registró, referencia y
//     comprobante; POST /files acepta PDF solo por magic bytes y solo para Comprobante/Consentimiento.
//
// Requisitos: los mismos del gate de aislamiento (API en 5055 y el seed demo).
import { test, expect, type APIRequestContext } from "@playwright/test";
import { samplePng } from "./ui/helpers/sample-image";
import { samplePdf } from "./ui/helpers/sample-pdf";

const ADMIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL ?? "juandiegov2002@gmail.com";
const ADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? "Admin2026!";
const RUN = Date.now().toString().slice(-8);

const pad = (n: number) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function login(api: APIRequestContext, email: string, password: string) {
  const res = await api.post("/api/v1/auth/login", { data: { email, password } });
  expect(res.status(), `login ${email}`).toBe(200);
  return (await res.json()) as { token: string; userInfo: { id: string; nombre: string; apellido: string } };
}

async function post<T>(api: APIRequestContext, token: string, url: string, data: unknown): Promise<T> {
  const res = await api.post(url, { ...auth(token), data });
  expect(res.status(), `POST ${url} → ${await res.text()}`).toBeLessThan(300);
  return (await res.json()) as T;
}

async function get<T>(api: APIRequestContext, token: string, url: string): Promise<T> {
  const res = await api.get(url, auth(token));
  expect(res.status(), `GET ${url}`).toBe(200);
  return (await res.json()) as T;
}

function upload(api: APIRequestContext, token: string, file: { name: string; mimeType: string; buffer: Buffer }, fields: Record<string, string>) {
  return api.post("/api/v1/files", { ...auth(token), multipart: { file, ...fields } });
}

test.describe("Pagos con trazabilidad", () => {
  let token = "";
  let adminName = "";
  let patientId = "";
  let patientPackageId = "";
  const PRECIO = 400_000;

  test.beforeAll(async ({ request: api }) => {
    const session = await login(api, ADMIN_EMAIL, ADMIN_PASSWORD);
    token = session.token;
    adminName = `${session.userInfo.nombre} ${session.userInfo.apellido}`.trim();

    const patient = await post<{ id: string }>(api, token, "/api/v1/patients", {
      nombre: "Pagos", apellido: `E2E ${RUN}`, cedula: `77${RUN}`, telefono: "3000000000",
    });
    patientId = patient.id;

    const packages = await get<{ items: { id: string; nombre: string }[] }>(api, token, "/api/v1/packages?page=1&pageSize=50");
    const pkg = packages.items[0];
    expect(pkg, "el seed demo debe tener paquetes").toBeTruthy();

    const assigned = await post<{ id: string }>(api, token, "/api/v1/patient-packages", {
      patientId, packageId: pkg.id, precioAcordado: PRECIO, fechaInicio: today(),
    });
    patientPackageId = assigned.id;
  });

  test.afterAll(async ({ request: api }) => {
    if (patientPackageId) await api.delete(`/api/v1/patient-packages/${patientPackageId}`, auth(token));
    if (patientId) await api.delete(`/api/v1/patients/${patientId}`, auth(token));
  });

  test("sin pagos: 0 % y estado SinPagos", async ({ request: api }) => {
    const pp = await get<{ porcentajePagado: number; estadoPago: string; saldoPendiente: number }>(api, token, `/api/v1/patient-packages/${patientPackageId}`);
    expect(pp).toMatchObject({ porcentajePagado: 0, estadoPago: "SinPagos", saldoPendiente: PRECIO });
  });

  test("un pago mayor al saldo responde 422 con el saldo en el mensaje y no guarda nada", async ({ request: api }) => {
    const res = await api.post(`/api/v1/patient-packages/${patientPackageId}/payments`, {
      ...auth(token), data: { monto: PRECIO + 1, fechaPago: today(), metodoPago: "Efectivo" },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toBe("El pago supera el saldo pendiente ($400.000)");

    const payments = await get<unknown[]>(api, token, `/api/v1/patient-packages/${patientPackageId}/payments`);
    expect(payments).toHaveLength(0);
  });

  test("abono con referencia y comprobante PDF: queda Parcial, con quién lo registró", async ({ request: api }) => {
    const pdf = await upload(api, token, { name: "transferencia.pdf", mimeType: "application/pdf", buffer: samplePdf() }, { entityType: "Payment", kind: "Comprobante" });
    expect(pdf.status(), await pdf.text()).toBe(201);
    const attachment = (await pdf.json()) as { id: string; contentType: string };
    expect(attachment.contentType).toBe("application/pdf");

    const payment = await post<Record<string, unknown>>(api, token, `/api/v1/patient-packages/${patientPackageId}/payments`, {
      monto: 256_000, fechaPago: today(), metodoPago: "Transferencia", referencia: "  TRF-998877  ", comprobanteId: attachment.id,
    });
    expect(payment).toMatchObject({
      monto: 256_000, referencia: "TRF-998877", registradoPor: adminName,
      comprobanteId: attachment.id, comprobanteContentType: "application/pdf",
    });

    const pp = await get<{ porcentajePagado: number; estadoPago: string; saldoPendiente: number }>(api, token, `/api/v1/patient-packages/${patientPackageId}`);
    expect(pp).toMatchObject({ porcentajePagado: 64, estadoPago: "Parcial", saldoPendiente: 144_000 });

    // El PDF se sirve con su URL firmada y su tipo real
    const signed = await get<{ url: string }>(api, token, `/api/v1/files/${attachment.id}/url`);
    const file = await api.get(signed.url);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toContain("application/pdf");
    expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("adjuntar el comprobante después, desde la fila (imagen)", async ({ request: api }) => {
    const payment = await post<{ id: string; comprobanteId: string | null }>(api, token, `/api/v1/patient-packages/${patientPackageId}/payments`, {
      monto: 44_000, fechaPago: today(), metodoPago: "Efectivo",
    });
    expect(payment.comprobanteId).toBeNull();

    const img = await upload(api, token, { name: "recibo.png", mimeType: "image/png", buffer: samplePng([31, 78, 121], [217, 164, 65]) },
      { entityType: "Payment", kind: "Comprobante", entityId: payment.id });
    expect(img.status(), await img.text()).toBe(201);
    const attachment = (await img.json()) as { id: string };

    const res = await api.put(`/api/v1/patient-packages/${patientPackageId}/payments/${payment.id}/comprobante`, { ...auth(token), data: { comprobanteId: attachment.id } });
    expect(res.status(), await res.text()).toBe(200);
    expect(await res.json()).toMatchObject({ comprobanteId: attachment.id, comprobanteContentType: "image/png" });
  });

  test("saldar: el saldo exacto pasa, un peso más no; queda 100 % Pagado", async ({ request: api }) => {
    const over = await api.post(`/api/v1/patient-packages/${patientPackageId}/payments`, {
      ...auth(token), data: { monto: 100_001, fechaPago: today(), metodoPago: "Tarjeta" },
    });
    expect(over.status()).toBe(422);
    expect((await over.json()).error).toContain("$100.000");

    await post(api, token, `/api/v1/patient-packages/${patientPackageId}/payments`, { monto: 100_000, fechaPago: today(), metodoPago: "Tarjeta", referencia: "Voucher 4471" });

    const list = await get<{ id: string; porcentajePagado: number; estadoPago: string; saldoPendiente: number }[]>(api, token, `/api/v1/patient-packages/patient/${patientId}`);
    expect(list.find((p) => p.id === patientPackageId)).toMatchObject({ porcentajePagado: 100, estadoPago: "Pagado", saldoPendiente: 0 });

    const patient = await get<{ paquetesActivos: { porcentajePagado: number }[] }>(api, token, `/api/v1/patients/${patientId}`);
    expect(patient.paquetesActivos[0].porcentajePagado).toBe(100);
  });

  test("POST /files: el PDF se valida por magic bytes y solo aplica a Comprobante y Consentimiento", async ({ request: api }) => {
    // Un .pdf que en realidad es texto → 415
    const fake = await upload(api, token, { name: "falso.pdf", mimeType: "application/pdf", buffer: Buffer.from("esto no es un pdf, de verdad que no") }, { entityType: "Payment", kind: "Comprobante" });
    expect(fake.status()).toBe(415);

    // Un PDF real donde solo se aceptan imágenes → 415
    const asProfile = await upload(api, token, { name: "foto.pdf", mimeType: "image/png", buffer: samplePdf() }, { entityType: "Patient", kind: "Perfil", entityId: patientId });
    expect(asProfile.status()).toBe(415);

    // Consentimiento escaneado: PDF aceptado, exige paciente y no se puede borrar
    const orphan = await upload(api, token, { name: "consentimiento.pdf", mimeType: "application/pdf", buffer: samplePdf("Consentimiento") }, { entityType: "Patient", kind: "Consentimiento" });
    expect(orphan.status()).toBe(400);
    const consent = await upload(api, token, { name: "consentimiento.pdf", mimeType: "application/pdf", buffer: samplePdf("Consentimiento") }, { entityType: "Patient", kind: "Consentimiento", entityId: patientId });
    expect(consent.status(), await consent.text()).toBe(201);
    const del = await api.delete(`/api/v1/files/${(await consent.json()).id}`, auth(token));
    expect(del.status()).toBe(409);
  });
});
