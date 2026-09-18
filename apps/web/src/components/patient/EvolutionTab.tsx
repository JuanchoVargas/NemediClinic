// ============================================================
// EvolutionTab.tsx — Evolución del paciente (tab de la ficha)
//
// Línea de tiempo por sesión (fecha, procedimiento, esteticista, notas) con:
//   · comparador deslizante Antes/Después (react-compare-slider)
//   · galería de miniaturas; clic → lightbox (yet-another-react-lightbox)
// Las fotos llegan como ids; cada una se pinta con su URL firmada.
// ============================================================
import { useState } from "react";
import { ReactCompareSlider } from "react-compare-slider";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { CalendarDays, Plus, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { SecureImage } from "@/components/shared/SecureImage";
import { MotionLi, staggerProps } from "@/components/shared/motion-elements";
import { usePatientEvolution } from "@/api/files.api";
import { useSignedImage } from "@/hooks/use-signed-image";
import type { EvolutionPhoto, EvolutionSession } from "@/types/file";

interface EvolutionTabProps {
  patientId: string;
  /** Abre el diálogo de nueva nota; undefined si el rol no puede crear notas. */
  onNewNote?: () => void;
}

const formatDate = (localIso: string) =>
  new Date(localIso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export function EvolutionTab({ patientId, onNewNote }: EvolutionTabProps) {
  const { data: sessions, isLoading } = usePatientEvolution(patientId);
  const [lightbox, setLightbox] = useState<{ photos: EvolutionPhoto[]; index: number } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            illustration="photos"
            title="Aún no hay sesiones registradas"
            description="Cada nota clínica con sus fotos de antes y después aparece aquí, en orden, para ver la evolución del tratamiento."
            action={
              onNewNote && (
                <Button onClick={onNewNote}>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar primera sesión
                </Button>
              )
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ol className="relative space-y-6 border-l-2 border-border pl-6">
        {sessions.map((session, index) => (
          <MotionLi key={session.noteId} className="relative" {...staggerProps(index)}>
            {/* Punto de la línea de tiempo */}
            <span
              aria-hidden
              className="absolute top-5 -left-[33px] h-4 w-4 rounded-full border-2 border-background bg-primary"
            />
            <SessionCard
              session={session}
              number={index + 1}
              onOpenPhoto={(photoIndex) => setLightbox({ photos: session.fotos, index: photoIndex })}
            />
          </MotionLi>
        ))}
      </ol>

      {lightbox && (
        <PhotoLightbox photos={lightbox.photos} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

function SessionCard({
  session,
  number,
  onOpenPhoto,
}: {
  session: EvolutionSession;
  number: number;
  onOpenPhoto: (index: number) => void;
}) {
  const antes = session.fotos.find((f) => f.kind === "Antes");
  const despues = session.fotos.find((f) => f.kind === "Despues");

  return (
    <Card>
      <CardContent className="space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Sesión {number}</p>
            <h3 className="text-xl font-semibold">{session.procedimiento}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDate(session.fecha)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-4 w-4" aria-hidden />
              {session.esteticista}
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
          {antes && despues ? (
            <BeforeAfter antes={antes} despues={despues} />
          ) : (
            session.fotos.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Esta sesión no tiene fotos.
              </p>
            )
          )}

          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{session.observaciones}</p>
            {session.productosUsados && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Productos: </span>
                {session.productosUsados}
              </p>
            )}

            {session.fotos.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1" aria-label="Fotos de la sesión">
                {session.fotos.map((photo, i) => (
                  <li key={photo.id} className="relative">
                    <SecureImage
                      id={photo.id}
                      alt={`${photo.kind === "Antes" ? "Antes" : "Después"} · sesión ${number}`}
                      className="h-20 w-20 rounded-lg border transition-transform hover:scale-[1.03]"
                      onClick={() => onOpenPhoto(i)}
                    />
                    <Badge
                      variant={photo.kind === "Antes" ? "secondary" : "success"}
                      className="pointer-events-none absolute bottom-1 left-1 px-1.5 py-0 text-[10px]"
                    >
                      {photo.kind === "Antes" ? "Antes" : "Después"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Comparador deslizante con la primera foto Antes y la primera Después de la sesión. */
function BeforeAfter({ antes, despues }: { antes: EvolutionPhoto; despues: EvolutionPhoto }) {
  const before = useSignedImage(antes.id);
  const after = useSignedImage(despues.id);

  if (!before.data || !after.data) return <Skeleton className="aspect-[4/5] w-full rounded-xl" />;

  return (
    <figure className="overflow-hidden rounded-xl border">
      <ReactCompareSlider
        className="aspect-[4/5] w-full"
        itemOne={<img src={before.data.url} alt="Antes" className="h-full w-full object-cover" />}
        itemTwo={<img src={after.data.url} alt="Después" className="h-full w-full object-cover" />}
      />
      <figcaption className="flex justify-between bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span>Antes</span>
        <span>Desliza para comparar</span>
        <span>Después</span>
      </figcaption>
    </figure>
  );
}

/** Lightbox: pide la URL firmada (original) de cada foto de la sesión. */
function PhotoLightbox({ photos, index, onClose }: { photos: EvolutionPhoto[]; index: number; onClose: () => void }) {
  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      // El slide real lo pinta SignedSlide; `src` solo identifica la foto
      slides={photos.map((p) => ({ src: p.id, alt: p.kind === "Antes" ? "Antes" : "Después" }))}
      render={{
        slide: ({ slide }) => <SignedSlide id={slide.src} alt={slide.alt ?? ""} />,
        buttonPrev: photos.length <= 1 ? () => null : undefined,
        buttonNext: photos.length <= 1 ? () => null : undefined,
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
