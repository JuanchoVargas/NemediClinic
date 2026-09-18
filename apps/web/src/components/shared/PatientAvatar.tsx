// ============================================================
// PatientAvatar.tsx — Foto de perfil con fallback a iniciales
//
// Si el paciente tiene imagenId pinta la foto (SecureImage); si no, sus
// iniciales sobre un tono derivado del nombre. Todo local: antes las
// iniciales se pedían a un servicio externo, enviándole nombres de pacientes.
// ============================================================
import { SecureImage } from "@/components/shared/SecureImage";
import { cn } from "@/lib/utils";

interface PatientAvatarProps {
  nombre: string;
  apellido: string;
  imagenId?: string | null;
  className?: string;
  onClick?: () => void;
}

// Tonos suaves de la paleta (fondo / texto) — se elige uno estable por nombre
const TONES = [
  "bg-primary/12 text-primary",
  "bg-sand-soft text-sand-foreground",
  "bg-success-soft text-success",
  "bg-secondary text-secondary-foreground",
];

function initials(nombre: string, apellido: string): string {
  return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase() || "?";
}

function toneFor(text: string): string {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export function PatientAvatar({ nombre, apellido, imagenId, className, onClick }: PatientAvatarProps) {
  const fallback = (
    <span
      aria-hidden
      className={cn(
        "flex h-full w-full select-none items-center justify-center font-heading font-semibold",
        toneFor(nombre + apellido),
      )}
    >
      {initials(nombre, apellido)}
    </span>
  );

  return (
    <span
      role="img"
      aria-label={`${nombre} ${apellido}`}
      className={cn("inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full text-sm", className)}
    >
      {imagenId ? (
        <SecureImage
          id={imagenId}
          alt=""
          className="h-full w-full"
          fallback={fallback}
          onClick={onClick}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
