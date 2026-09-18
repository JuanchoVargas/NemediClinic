// ============================================================
// consent.ts — Consentimiento informado
//
// Backend: ConsentsController (/api/v1/consent-templates, /api/v1/consents).
// Variables de plantilla: {{paciente}} {{cedula}} {{procedimiento}} {{fecha}}.
// ============================================================

export const CONSENT_VARIABLES = ["{{paciente}}", "{{cedula}}", "{{procedimiento}}", "{{fecha}}"] as const;

export interface ConsentTemplate {
  procedureId: string;
  procedimiento: string;
  requiereConsentimiento: boolean;
  titulo: string;
  texto: string;
  /** true: el tenant aún no la editó (se muestra la plantilla del sistema). */
  esPorDefecto: boolean;
  updatedAt: string | null;
}

export interface ConsentPreview {
  titulo: string;
  texto: string;
  paciente: string;
  cedula: string;
  procedimiento: string;
}

export interface SignConsentRequest {
  patientId: string;
  procedureId: string;
  appointmentId?: string;
  /** data URL PNG de signature_pad */
  firmaPng: string;
}

export interface Consent {
  id: string;
  patientId: string;
  procedureId: string;
  procedimiento: string;
  appointmentId: string | null;
  esteticista: string;
  fechaFirma: string;
  titulo: string;
  /** PDF firmado (se abre con su URL firmada). */
  attachmentId: string;
}
