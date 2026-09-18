// ============================================================
// ConsentsTab.tsx — Consentimientos firmados del paciente (tab de la ficha)
//
// Lista los PDF firmados (se abren con su URL firmada en otra pestaña) y
// permite firmar uno nuevo eligiendo el procedimiento.
// ============================================================
import { useState } from "react";
import { FileSignature, FileText, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsentSignDialog } from "@/components/consent/ConsentSignDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePatientConsents } from "@/api/consents.api";
import { fetchSignedImage } from "@/api/files.api";
import { useProcedures } from "@/api/procedures.api";
import { usePermissions } from "@/hooks/use-permissions";
import { useToastStore } from "@/stores/toast.store";

/** El PDF es un adjunto privado: se pide su URL firmada y se abre en otra pestaña. */
async function openPdf(attachmentId: string) {
  // La pestaña se abre ANTES del await: si no, el navegador la trata como popup y la bloquea
  const tab = window.open("", "_blank");
  try {
    const signed = await fetchSignedImage(attachmentId);
    if (tab) tab.location.href = signed.url;
    else window.location.href = signed.url;
  } catch (error) {
    tab?.close();
    useToastStore.report(error);
  }
}

export function ConsentsTab({ patientId }: { patientId: string }) {
  const { can } = usePermissions();
  const { data: consents, isLoading } = usePatientConsents(patientId);
  const { data: procedures } = useProcedures();
  const [procedureId, setProcedureId] = useState("");
  const [signing, setSigning] = useState(false);

  const active = procedures?.filter((p) => p.activo) ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Consentimientos informados</CardTitle>
          <CardDescription>Documentos firmados por el paciente. Un consentimiento vale un año para el mismo procedimiento.</CardDescription>
        </div>
        {can("consents.sign") && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger className="w-56" aria-label="Procedimiento a consentir">
                <SelectValue placeholder="Procedimiento" />
              </SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                    {p.requiereConsentimiento ? " · obligatorio" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!procedureId} onClick={() => setSigning(true)}>
              <PenLine className="mr-2 h-4 w-4" />
              Firmar consentimiento
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {consents && consents.length === 0 && (
          <EmptyState
            illustration="generic"
            title="Sin consentimientos firmados"
            description="Elige el procedimiento y pásale la tablet o el celular al paciente para que lea y firme."
          />
        )}
        {consents && consents.length > 0 && (
          <ul className="divide-y">
            {consents.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileSignature className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.procedimiento}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(c.fechaFirma).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })} · {c.esteticista}
                  </p>
                </div>
                <Badge variant="success">Firmado</Badge>
                <Button variant="outline" size="sm" onClick={() => void openPdf(c.attachmentId)}>
                  <FileText className="mr-1.5 h-4 w-4" />
                  Ver PDF
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {signing && procedureId && (
        <ConsentSignDialog patientId={patientId} procedureId={procedureId} onClose={() => setSigning(false)} />
      )}
    </Card>
  );
}
