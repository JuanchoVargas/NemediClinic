// ============================================================
// SecureImage.tsx — <img> de un adjunto privado
//
// Recibe el id del Attachment, pide la URL firmada (useSignedImage) y pinta
// la miniatura o el original. Mientras carga muestra un skeleton; si no hay
// id o falla, el `fallback`.
// ============================================================
import { useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignedImage } from "@/hooks/use-signed-image";
import { cn } from "@/lib/utils";

interface SecureImageProps {
  id: string | null | undefined;
  alt: string;
  /** "thumb" = miniatura de 400 px (tablas, tarjetas, avatares); "full" = original. */
  size?: "thumb" | "full";
  className?: string;
  fallback?: ReactNode;
  onClick?: () => void;
}

export function SecureImage({ id, alt, size = "thumb", className, fallback, onClick }: SecureImageProps) {
  const { data, isLoading, isError } = useSignedImage(id);
  // Se guarda la URL que falló (no un booleano): al renovarse la URL firmada se reintenta sola.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const src = data ? (size === "thumb" ? data.thumbUrl : data.url) : null;
  const missing = !id || isError || (src !== null && failedSrc === src);

  if (missing) {
    return (
      <>
        {fallback ?? (
          <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
            <ImageOff className="h-5 w-5" aria-hidden />
          </div>
        )}
      </>
    );
  }

  if (isLoading || !src) return <Skeleton className={className} />;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onClick={onClick}
      onError={() => setFailedSrc(src)}
      className={cn("object-cover", onClick && "cursor-zoom-in", className)}
    />
  );
}
