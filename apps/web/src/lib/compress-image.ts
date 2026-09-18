// ============================================================
// compress-image.ts — Reduce una foto en el navegador antes de subirla
//
// Una foto de celular pesa 4–8 MB y mide 4000 px; para la ficha clínica basta
// con 1600 px. Se redimensiona en un canvas y se re-codifica (JPEG, o WebP si
// el original es PNG para conservar transparencia). Si el navegador no puede
// (formato raro, canvas bloqueado), se devuelve el archivo original: el
// backend igual valida, quita metadatos y limita el tamaño.
// ============================================================

export const MAX_UPLOAD_SIDE = 1600;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface PreparedImage {
  blob: Blob;
  fileName: string;
}

function replaceExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "imagen";
  return `${base}.${ext}`;
}

export async function compressImage(file: File): Promise<PreparedImage> {
  const original: PreparedImage = { blob: file, fileName: file.name };

  try {
    // imageOrientation: aplica la rotación EXIF antes de dibujar (si no, las fotos verticales salen acostadas)
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height));

    // Ya es pequeña y liviana: no vale la pena re-codificar
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return original;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = file.type === "image/png" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
    if (!blob || blob.type !== type || blob.size >= file.size) return original;

    return { blob, fileName: replaceExtension(file.name, type === "image/webp" ? "webp" : "jpg") };
  } catch {
    return original;
  }
}

export const PDF_TYPE = "application/pdf";
/** Valor de `accept` para un <input type="file"> de comprobantes: imágenes + PDF. */
export const DOCUMENT_ACCEPT = [...ACCEPTED_IMAGE_TYPES, PDF_TYPE].join(",");

/** Comprobantes y consentimientos: imagen o PDF. El PDF no se comprime, así que aplica el tope del servidor. */
export function validateDocumentFile(file: File): string | null {
  if (file.type !== PDF_TYPE) {
    return ACCEPTED_IMAGE_TYPES.includes(file.type)
      ? validateImageFile(file)
      : "Formato no permitido. Usa un PDF o una imagen JPG, PNG o WebP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "El PDF supera el máximo de 10 MB.";
  return null;
}

/** Mensaje de error legible si el archivo no se puede subir; null si está bien. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Formato no permitido. Usa una imagen JPG, PNG o WebP.";
  if (file.size > 40 * 1024 * 1024) return "La imagen es demasiado grande (máximo 40 MB antes de comprimir).";
  return null;
}
