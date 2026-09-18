// ============================================================
// InstallBanner.tsx — "Instalar la app" (PWA)
//
// Chrome/Edge/Android disparan `beforeinstallprompt` cuando la app se puede
// instalar. Se guarda ese evento y se ofrece un banner discreto abajo; al
// aceptar se llama a prompt(). Si la persona lo descarta no se vuelve a
// mostrar en ese dispositivo (preferencia de UI en localStorage).
// iOS/Safari no emite el evento: allí se instala desde Compartir → "Añadir a
// pantalla de inicio" y este banner simplemente no aparece.
// ============================================================
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_BRANDING, useBranding } from "@/api/branding.api";

const DISMISSED_KEY = "install-banner-dismissed";

/** Evento no estándar (aún sin tipos en lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const { data: branding = DEFAULT_BRANDING } = useBranding();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      if (localStorage.getItem(DISMISSED_KEY)) return;
      event.preventDefault(); // evita el mini-infobar del navegador: se ofrece con este banner
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setInstallEvent(null);
  };

  return (
    <div
      role="region"
      aria-label="Instalar la aplicación"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-lift"
    >
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate font-medium">Instalar {branding.nombreComercial}</p>
        <p className="text-xs text-muted-foreground">Ábrela desde tu pantalla de inicio, a pantalla completa.</p>
      </div>
      <Button size="sm" onClick={() => void install()}>
        <Download className="mr-1.5 h-4 w-4" />
        Instalar
      </Button>
      <Button variant="ghost" size="icon" aria-label="Ahora no" onClick={dismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
