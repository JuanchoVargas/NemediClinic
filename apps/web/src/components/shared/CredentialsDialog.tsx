// ============================================================
// CredentialsDialog.tsx — Muestra UNA vez una clave temporal
//
// Lo usan "Crear admin" (plataforma) y "Restablecer contraseña" (plataforma y
// usuarios de la clínica). El backend solo guarda el hash: al cerrar este
// diálogo la clave no se puede volver a consultar, solo restablecer de nuevo.
// ============================================================
import { Copy, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToastStore } from "@/stores/toast.store";

interface CredentialsDialogProps {
  title: string;
  /** A quién hay que entregarle las credenciales (nombre de la clínica o de la persona). */
  recipient: string;
  email: string;
  passwordTemporal: string;
  /** true si el backend además la envió por correo (SMTP configurado). */
  emailEnviado?: boolean;
  onClose: () => void;
}

export function CredentialsDialog({ title, recipient, email, passwordTemporal, emailEnviado, onClose }: CredentialsDialogProps) {
  const copy = async () => {
    await navigator.clipboard.writeText(`Usuario: ${email}\nContraseña temporal: ${passwordTemporal}`);
    useToastStore.success("Credenciales copiadas");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Entrega estas credenciales a {recipient}. La contraseña temporal no se vuelve a mostrar y el sistema pedirá
            cambiarla en el primer ingreso.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Usuario</dt>
            <dd className="truncate font-medium">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Contraseña temporal</dt>
            <dd className="font-mono font-medium" data-testid="temp-password">
              {passwordTemporal}
            </dd>
          </div>
        </dl>
        {emailEnviado && (
          <p className="flex items-center gap-2 text-sm text-success">
            <MailCheck className="h-4 w-4" aria-hidden />
            También se envió por correo a {email}.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
