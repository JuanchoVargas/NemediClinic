// ============================================================
// use-signed-image.ts — URL firmada de una imagen, renovada sola
//
// La URL firmada dura 10 minutos. El query se considera fresco 8 min y se
// vuelve a pedir cada 8 min mientras haya un componente montado, así la URL
// se renueva ANTES de expirar y un <img> que se re-renderiza (o un lightbox
// que se abre tarde) nunca apunta a un token vencido.
// Cache idempotente: dos componentes con el mismo id comparten una request.
//
// EQUIVALENTE A: un getter cacheado de Pinia con TTL
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { fetchSignedImage } from "@/api/files.api";

const RENEW_MS = 8 * 60 * 1000;

export function useSignedImage(id: string | null | undefined) {
  return useQuery({
    queryKey: ["files", "url", id],
    queryFn: () => fetchSignedImage(id as string),
    enabled: !!id,
    staleTime: RENEW_MS,
    gcTime: RENEW_MS,
    refetchInterval: RENEW_MS,
    // Una miniatura que no carga no merece un toast: SecureImage muestra su fallback.
    meta: { silent: true },
  });
}
