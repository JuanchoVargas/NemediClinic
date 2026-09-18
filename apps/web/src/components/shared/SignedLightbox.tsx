// ============================================================
// SignedLightbox.tsx — Lightbox de adjuntos privados
//
// Recibe ids de Attachment (no URLs): cada slide pide su URL firmada con
// useSignedImage y pinta el original. Lo usan la pestaña Evolución (fotos de
// la sesión) y los comprobantes de pago.
// ============================================================
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignedImage } from "@/hooks/use-signed-image";

export interface SignedSlideItem {
  id: string;
  alt: string;
}

interface SignedLightboxProps {
  items: SignedSlideItem[];
  index?: number;
  onClose: () => void;
}

export function SignedLightbox({ items, index = 0, onClose }: SignedLightboxProps) {
  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      // El slide real lo pinta SignedSlide; `src` solo identifica el adjunto
      slides={items.map((item) => ({ src: item.id, alt: item.alt }))}
      render={{
        slide: ({ slide }) => <SignedSlide id={slide.src} alt={slide.alt ?? ""} />,
        buttonPrev: items.length <= 1 ? () => null : undefined,
        buttonNext: items.length <= 1 ? () => null : undefined,
      }}
      styles={{ container: { backgroundColor: "rgb(18 22 28 / 0.94)" } }}
    />
  );
}

function SignedSlide({ id, alt }: { id: string; alt: string }) {
  const { data } = useSignedImage(id);
  if (!data) return <Skeleton className="h-64 w-64" />;
  return (
    <figure className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
      <img src={data.url} alt={alt} className="max-h-[85%] max-w-full rounded-lg object-contain" />
      <figcaption className="text-sm font-medium text-white/80">{alt}</figcaption>
    </figure>
  );
}
