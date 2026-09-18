// ============================================================
// ConfirmDeleteButton.tsx — Botón de borrado con confirmación (AlertDialog)
//
// Para borrados dentro de una ficha (asignaciones, pagos). El error lo reporta
// el toast global; aquí solo se evita el "unhandled rejection".
// ============================================================
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteButtonProps {
  label: string;
  title: string;
  description: string;
  pending: boolean;
  onConfirm: () => Promise<void>;
  iconOnly?: boolean;
}

export function ConfirmDeleteButton({ label, title, description, pending, onConfirm, iconOnly = false }: ConfirmDeleteButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" className="text-destructive" disabled={pending} aria-label={label}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive" disabled={pending}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              // el toast global reporta el error
              onConfirm().catch(() => undefined);
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
