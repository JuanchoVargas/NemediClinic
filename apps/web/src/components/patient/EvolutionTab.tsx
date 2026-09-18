// ============================================================
// EvolutionTab.tsx — Evolución del paciente, agrupada por paquete
//
//   · un acordeón por paquete: cabecera con estado, progreso de sesiones,
//     porcentaje pagado y rango de fechas. El paquete activo abre expandido;
//     los demás, colapsados (una paciente con tres tratamientos no necesita
//     ver treinta sesiones a la vez).
//   · dentro, la línea de tiempo de sesiones: comparador Antes/Después a la
//     izquierda y el detalle clínico a la derecha (SessionDetail).
//   · las notas que no vienen de una sesión de paquete caen en el último
//     grupo, "Sesiones sueltas".
//
// El backend ya entrega todo agrupado y ordenado (EvolutionService).
// ============================================================
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ReactCompareSlider } from "react-compare-slider";
import { CalendarDays, ChevronDown, Package, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsumptionSummary } from "@/components/patient/ConsumptionSummary";
import { PackageStatusBadge } from "@/components/patient/PackageStatusBadge";
import { SessionDetail } from "@/components/patient/SessionDetail";
import { EmptyState } from "@/components/shared/EmptyState";
import { SignedLightbox } from "@/components/shared/SignedLightbox";
import { SecureImage } from "@/components/shared/SecureImage";
import { MotionDiv, MotionLi, EASE, staggerProps } from "@/components/shared/motion-elements";
import { usePatientEvolution } from "@/api/files.api";
import { useSignedImage } from "@/hooks/use-signed-image";
import { formatShortDate } from "@/lib/format-platform";
import { cn } from "@/lib/utils";
import type { EvolutionPackage, EvolutionSession } from "@/types/clinical-record";
import type { EvolutionPhoto } from "@/types/file";

interface EvolutionTabProps {
  patientId: string;
  /** Abre el diálogo de nueva nota; undefined si el rol no puede crear notas. */
  onNewNote?: () => void;
}

export function EvolutionTab({ patientId, onNewNote }: EvolutionTabProps) {
  const { data, isLoading } = usePatientEvolution(patientId);
  const [lightbox, setLightbox] = useState<{ photos: EvolutionPhoto[]; index: number } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const grupos = data?.grupos ?? [];

  if (grupos.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            illustration="photos"
            title="Aún no hay sesiones registradas"
            description="Cada nota clínica con sus fotos de antes y después aparece aquí, agrupada por el paquete del tratamiento, para ver la evolución."
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

  const hayActivo = grupos.some((g) => g.estado === "Activo");

  return (
    <>
      <div className="mb-6">
        <ConsumptionSummary patientId={patientId} />
      </div>

      <div className="space-y-4">
        {grupos.map((grupo, index) => (
          <PackageAccordion
            key={grupo.patientPackageId ?? "sueltas"}
            grupo={grupo}
            patientId={patientId}
            // Abierto de entrada: el tratamiento en curso. Si no hay ninguno activo, el primero.
            defaultOpen={grupo.estado === "Activo" || (index === 0 && !hayActivo)}
            onNewNote={onNewNote}
            onOpenPhoto={(photos, i) => setLightbox({ photos, index: i })}
          />
        ))}
      </div>

      {lightbox && (
        <SignedLightbox
          items={lightbox.photos.map((p) => ({ id: p.id, alt: p.kind === "Antes" ? "Antes" : "Después" }))}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

function PackageAccordion({
  grupo,
  patientId,
  defaultOpen,
  onNewNote,
  onOpenPhoto,
}: {
  grupo: EvolutionPackage;
  patientId: string;
  defaultOpen: boolean;
  onNewNote?: () => void;
  onOpenPhoto: (photos: EvolutionPhoto[], index: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const esSueltas = grupo.patientPackageId === null;
  const panelId = `evolucion-${grupo.patientPackageId ?? "sueltas"}`;

  const rango = [
    grupo.fechaInicio && formatShortDate(grupo.fechaInicio),
    grupo.fechaUltimaSesion && formatShortDate(grupo.fechaUltimaSesion),
  ]
    .filter(Boolean)
    .join(" → ");

  return (
    <Card className="overflow-hidden py-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown
          aria-hidden
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-2 font-heading text-lg font-semibold">
            {!esSueltas && <Package className="h-4 w-4 text-muted-foreground" aria-hidden />}
            {grupo.nombre}
          </span>
          {!esSueltas && <PackageStatusBadge estado={grupo.estado} />}
        </span>

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {esSueltas
              ? `${grupo.sesiones.length} ${grupo.sesiones.length === 1 ? "sesión" : "sesiones"}`
              : `${grupo.sesionesCompletadas} / ${grupo.sesionesTotales} sesiones`}
          </span>
          {grupo.porcentajePagado != null && (
            <Badge variant={grupo.porcentajePagado === 100 ? "success" : "warning"}>
              {grupo.porcentajePagado}% pagado
            </Badge>
          )}
          {rango && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {rango}
            </span>
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <MotionDiv
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t p-4">
              {grupo.sesiones.length === 0 ? (
                <EmptyState
                  illustration="photos"
                  title="Este paquete aún no tiene sesiones"
                  description="Cuando registres la primera nota clínica del tratamiento, aparecerá aquí."
                  action={
                    onNewNote && (
                      <Button onClick={onNewNote}>
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar primera sesión
                      </Button>
                    )
                  }
                />
              ) : (
                <ol className="relative space-y-6 border-l-2 border-border pl-6">
                  {grupo.sesiones.map((session, index) => (
                    <MotionLi key={session.noteId} className="relative" {...staggerProps(index)}>
                      {/* Punto de la línea de tiempo */}
                      <span
                        aria-hidden
                        className="absolute top-5 -left-[33px] h-4 w-4 rounded-full border-2 border-background bg-primary"
                      />
                      <SessionCard
                        session={session}
                        patientId={patientId}
                        number={session.numeroSesion ?? index + 1}
                        onOpenPhoto={(photoIndex) => onOpenPhoto(session.fotos, photoIndex)}
                      />
                    </MotionLi>
                  ))}
                </ol>
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </Card>
  );
}

function SessionCard({
  session,
  patientId,
  number,
  onOpenPhoto,
}: {
  session: EvolutionSession;
  patientId: string;
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
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden />
            {formatShortDate(session.fecha)}
          </span>
        </header>

        {/* Sin fotos no se reserva la columna izquierda: el detalle ocupa todo el ancho */}
        <div className={cn("grid gap-5", session.fotos.length > 0 && "lg:grid-cols-[minmax(0,22rem)_1fr]")}>
          {antes && despues && <BeforeAfter antes={antes} despues={despues} />}

          <div className="space-y-4">
            <SessionDetail session={session} patientId={patientId} />

            {session.fotos.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Fotos de la sesión">
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
