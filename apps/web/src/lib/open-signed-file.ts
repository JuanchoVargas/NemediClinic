// ============================================================
// open-signed-file.ts — Abre un adjunto privado (PDF) en otra pestaña
//
// El archivo no tiene URL pública: se pide su URL firmada (10 min) y se abre.
// Lo usan los consentimientos firmados y los comprobantes de pago en PDF.
// ============================================================
import { fetchSignedImage } from "@/api/files.api";
import { useToastStore } from "@/stores/toast.store";

export async function openSignedFile(attachmentId: string) {
  // La pestaña se abre ANTES del await: si no, el navegador la trata como popup y la bloquea
  const tab = window.open("", "_blank");
  try {
    const signed = await fetchSignedImage(attachmentId);
    if (tab) tab.location.href = signed.url;
    else window.location.href = signed.url;
  } catch (error) {
    tab?.close();
    useToastStore.report(error);
  }
}
