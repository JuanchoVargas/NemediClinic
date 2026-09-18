// ============================================================
// FormDialog.tsx — Diálogo centrado para formularios
//
// Reemplaza los <Sheet> laterales. Reglas:
//   - Centrado, max-w-lg, el cuerpo hace scroll si excede la altura.
//   - En móvil (< 640 px) ocupa toda la pantalla.
//   - Footer: "Cancelar" a la izquierda del botón primario (derecha).
//   - Escape, click fuera, la X y Cancelar cierran directo si `dirty`
//     es false; si hay cambios, piden confirmación antes de descartar.
//   - Las confirmaciones de eliminar siguen usando AlertDialog aparte.
//
// EQUIVALENTE A: el modal de formulario genérico de SINERGIA
// ============================================================
import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  open: boolean;
  /** Se llama con `false` cuando el diálogo debe cerrarse (ya confirmado si había cambios). */
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** true si el formulario tiene cambios sin guardar → cerrar pide confirmación. */
  dirty?: boolean;
  /** Botón(es) primario(s); se renderizan a la derecha de "Cancelar". */
  actions?: ReactNode;
  cancelLabel?: string;
  /** Ancho máximo. Por defecto max-w-lg. */
  className?: string;
  children: ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  dirty = false,
  actions,
  cancelLabel = "Cancelar",
  className,
  children,
}: FormDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = () => {
    if (dirty) setConfirmOpen(true);
    else onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Escape, click fuera y la X llegan aquí con next=false
          if (next) onOpenChange(true);
          else requestClose();
        }}
      >
        <DialogContent
          className={cn(
            // Móvil: pantalla completa (el formulario hace scroll, el pie con las acciones queda fijo).
            // Desde sm: diálogo centrado de ancho máximo lg.
            "flex w-full flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[90vh] sm:max-w-lg",
            className,
          )}
        >
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

          <DialogFooter className="m-0 rounded-b-xl max-sm:flex-row max-sm:rounded-none max-sm:*:flex-1">
            <Button type="button" variant="outline" onClick={requestClose}>
              {cancelLabel}
            </Button>
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si cierras, se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
