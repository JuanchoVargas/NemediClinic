// ============================================================
// file.ts — Adjuntos (imágenes; comprobantes y consentimientos también en PDF)
//
// Backend: FilesController (/api/v1/files) y GET /patients/{id}/evolution.
// Espejo de NemediClinic.Application/DTOs/Files/AttachmentDtos.cs.
// ============================================================

export type AttachmentEntityType = "Patient" | "ClinicalNote" | "Product" | "Procedure" | "Tenant" | "Valuation" | "Payment";
export type AttachmentKind = "Perfil" | "Antes" | "Despues" | "Producto" | "Procedimiento" | "Logo" | "Consentimiento" | "Comprobante";

export interface Attachment {
  id: string;
  entityType: AttachmentEntityType;
  entityId: string | null;
  kind: AttachmentKind;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

/** URLs firmadas ya absolutas (con la base del API) y listas para un <img>. */
export interface SignedImage {
  url: string;
  thumbUrl: string;
  expiresInSeconds: number;
}

import type { ClinicalNoteProduct } from "@/types/clinical-record";

export interface EvolutionPhoto {
  id: string;
  kind: "Antes" | "Despues";
  fileName: string;
}

export interface EvolutionSession {
  noteId: string;
  appointmentId: string | null;
  fecha: string;
  procedimiento: string;
  esteticista: string;
  observaciones: string;
  productosUsados: string | null;
  productos: ClinicalNoteProduct[];
  fotos: EvolutionPhoto[];
}
