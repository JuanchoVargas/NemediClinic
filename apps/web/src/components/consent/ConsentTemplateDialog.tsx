// ============================================================
// ConsentTemplateDialog.tsx — Plantilla de consentimiento de un procedimiento
//
// Texto editable por la clínica con variables que se reemplazan al firmar:
// {{paciente}} {{cedula}} {{procedimiento}} {{fecha}}. Si nunca se editó, se
// parte de la plantilla del sistema. Editar es de Admin/SuperAdmin.
// ============================================================
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/FormDialog";
import { useConsentTemplate, useSaveConsentTemplate } from "@/api/consents.api";
import { useToastStore } from "@/stores/toast.store";
import { CONSENT_VARIABLES, type ConsentTemplate } from "@/types/consent";

const schema = z.object({
  titulo: z.string().min(1, "Requerido").max(200),
  texto: z.string().min(20, "El texto es demasiado corto").max(12000),
});
type FormValues = z.infer<typeof schema>;

export function ConsentTemplateDialog({ procedureId, onClose }: { procedureId: string; onClose: () => void }) {
  const { data: template } = useConsentTemplate(procedureId);

  // El form se monta cuando la plantilla ya cargó: sus valores iniciales salen de props
  if (!template) {
    return (
      <FormDialog open onOpenChange={(o) => !o && onClose()} title="Plantilla de consentimiento">
        <Skeleton className="h-64 w-full" />
      </FormDialog>
    );
  }
  return <TemplateForm template={template} onClose={onClose} />;
}

function TemplateForm({ template, onClose }: { template: ConsentTemplate; onClose: () => void }) {
  const save = useSaveConsentTemplate(template.procedureId);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: template.titulo, texto: template.texto },
  });

  /** Inserta la variable donde está el cursor. */
  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    const current = form.getValues("texto");
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    form.setValue("texto", current.slice(0, start) + variable + current.slice(end), { shouldDirty: true });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await save.mutateAsync(values);
      useToastStore.success("Plantilla guardada", template.procedimiento);
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Plantilla de consentimiento"
      description={`${template.procedimiento}${template.esPorDefecto ? " · usando la plantilla del sistema" : ""}`}
      dirty={form.formState.isDirty}
      className="sm:max-w-2xl"
      actions={
        <Button form="consent-template-form" type="submit" disabled={save.isPending}>
          {save.isPending ? "Guardando..." : "Guardar plantilla"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="consent-template-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="texto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Texto *</FormLabel>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Insertar:</span>
                  {CONSENT_VARIABLES.map((v) => (
                    <button key={v} type="button" onClick={() => insertVariable(v)}>
                      <Badge variant="outline" className="cursor-pointer font-mono hover:bg-muted">{v}</Badge>
                    </button>
                  ))}
                </div>
                <FormControl>
                  <Textarea
                    rows={14}
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      textareaRef.current = el;
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Las variables se reemplazan con los datos del paciente al momento de firmar. Deja una línea en blanco
                  entre párrafos.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}
