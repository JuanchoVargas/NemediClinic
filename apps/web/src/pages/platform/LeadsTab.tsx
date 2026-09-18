// ============================================================
// LeadsTab.tsx — Oportunidades registradas por los canales
//
// Registrar un NIT lo protege 90 días para ese canal. Si otro canal ya
// lo tiene vigente, el backend responde 409 con el canal y la fecha de
// liberación (el toast global muestra ese mensaje tal cual).
// "Activar" crea el tenant a partir de la oportunidad.
// ============================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Rocket, Trash2, Unlock } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormDialog } from "@/components/shared/FormDialog";

import {
  useActivateLead,
  useChannels,
  useCreateLead,
  useDeleteLead,
  useLeads,
  useReleaseLead,
} from "@/api/platform.api";
import { formatShortDate } from "@/lib/format-platform";
import { useToastStore } from "@/stores/toast.store";
import type { Lead, LeadEstado } from "@/types/platform";

const ESTADO_BADGE: Record<LeadEstado, "default" | "success" | "secondary"> = {
  Registrado: "default",
  Activado: "success",
  Liberado: "secondary",
};

// Mismo patrón que el backend (CreateLeadRequest): 6–10 dígitos y DV opcional
const NIT_PATTERN = /^\d{6,10}(-\d)?$/;

const leadSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  nit: z
    .string()
    .transform((v) => v.trim().replace(/[.\s]/g, ""))
    .pipe(z.string().regex(NIT_PATTERN, "NIT inválido: 6 a 10 dígitos y, opcional, guion y dígito de verificación")),
  ciudad: z.string().min(1, "Requerido"),
  contacto: z.string().min(1, "Requerido"),
  channelId: z.string().min(1, "Elige un canal"),
});
type LeadFormInput = z.input<typeof leadSchema>;
type LeadFormValues = z.output<typeof leadSchema>;

export function LeadsTab() {
  const { data: leads, isLoading } = useLeads();
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<Lead | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Cada oportunidad protege su NIT para el canal durante 90 días.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar oportunidad
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clínica</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Protección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && leads?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Aún no hay oportunidades registradas.
                </TableCell>
              </TableRow>
            )}
            {leads?.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="font-medium">{l.nombre}</div>
                  <div className="text-xs text-muted-foreground">{l.contacto}</div>
                </TableCell>
                <TableCell>{l.nit}</TableCell>
                <TableCell>{l.ciudad}</TableCell>
                <TableCell>{l.canal}</TableCell>
                <TableCell>{formatShortDate(l.fechaRegistro)}</TableCell>
                <TableCell>
                  <ProtectionCounter lead={l} />
                </TableCell>
                <TableCell>
                  <Badge variant={ESTADO_BADGE[l.estado]}>{l.estado}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {l.estado === "Registrado" && (
                      <>
                        <Button size="sm" onClick={() => setActivating(l)} aria-label={`Activar ${l.nombre}`}>
                          <Rocket className="mr-1 h-4 w-4" />
                          Activar
                        </Button>
                        <ReleaseLeadButton lead={l} />
                      </>
                    )}
                    {l.estado !== "Activado" && <DeleteLeadButton lead={l} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {creating && <LeadFormDialog onClose={() => setCreating(false)} />}
      {activating && (
        <ActivateLeadDialog key={activating.id} lead={activating} onClose={() => setActivating(null)} />
      )}
    </div>
  );
}

/** Contador de días de protección: barra que se vacía de 90 a 0. */
function ProtectionCounter({ lead }: { lead: Lead }) {
  if (lead.estado === "Activado") return <span className="text-muted-foreground">Cliente</span>;
  if (lead.estado === "Liberado") {
    return <span className="text-muted-foreground">Liberado el {formatShortDate(lead.fechaLiberacion)}</span>;
  }

  const days = lead.diasProteccionRestantes;
  const urgent = days <= 15;
  return (
    <div className="min-w-32">
      <div className={`text-sm font-medium ${urgent ? "text-destructive" : ""}`}>
        {days} {days === 1 ? "día" : "días"}
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${urgent ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${Math.min(100, (days / 90) * 100)}%` }}
        />
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">hasta el {formatShortDate(lead.fechaLiberacion)}</div>
    </div>
  );
}

function LeadFormDialog({ onClose }: { onClose: () => void }) {
  const { data: channels } = useChannels();
  const create = useCreateLead();

  const form = useForm<LeadFormInput, unknown, LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { nombre: "", nit: "", ciudad: "", contacto: "", channelId: "" },
  });

  const onSubmit = async (values: LeadFormValues) => {
    try {
      const lead = await create.mutateAsync(values);
      useToastStore.success("Oportunidad registrada", `Protegida hasta el ${formatShortDate(lead.fechaLiberacion)}`);
      onClose();
    } catch {
      // toast global: en 409 muestra el canal que la tiene y la fecha de liberación
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Registrar oportunidad"
      description="El NIT queda protegido para el canal durante 90 días."
      dirty={form.formState.isDirty}
      actions={
        <Button form="lead-form" type="submit" disabled={create.isPending}>
          {create.isPending ? "Registrando..." : "Registrar"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la clínica *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT *</FormLabel>
                  <FormControl><Input placeholder="900123456-7" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="contacto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contacto *</FormLabel>
                <FormControl><Input placeholder="Nombre y teléfono" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="channelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un canal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {channels
                      ?.filter((c) => c.activo)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}

const activateSchema = z.object({
  email: z.string().min(1, "Requerido").email("Email inválido"),
  telefono: z.string(),
  plan: z.enum(["Basico", "Pro"]),
  sedesAdicionales: z.number().int().min(0).max(100),
  esIps: z.boolean(),
});
type ActivateFormValues = z.infer<typeof activateSchema>;

function ActivateLeadDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const activate = useActivateLead();

  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: { email: "", telefono: "", plan: "Basico", sedesAdicionales: 0, esIps: false },
  });

  const onSubmit = async (values: ActivateFormValues) => {
    try {
      const tenant = await activate.mutateAsync({ id: lead.id, body: values });
      useToastStore.success("Tenant creado", `${tenant.nombre} · crea su administrador en la pestaña Tenants`);
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Activar ${lead.nombre}`}
      description={`Crea el tenant con NIT ${lead.nit} en el canal ${lead.canal}.`}
      dirty={form.formState.isDirty}
      actions={
        <Button form="activate-lead-form" type="submit" disabled={activate.isPending}>
          {activate.isPending ? "Activando..." : "Activar"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="activate-lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de la clínica *</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Basico">Básico</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sedesAdicionales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sedes adicionales</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="esIps"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <FormLabel>Es IPS</FormLabel>
                  <FormDescription>Institución prestadora de servicios de salud habilitada.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}

function ReleaseLeadButton({ lead }: { lead: Lead }) {
  const release = useReleaseLead();

  const handleConfirm = async () => {
    try {
      await release.mutateAsync(lead.id);
      useToastStore.success("Oportunidad liberada", `El NIT ${lead.nit} queda disponible para otros canales`);
    } catch {
      // toast global
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={release.isPending} aria-label={`Liberar ${lead.nombre}`}>
          <Unlock className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Liberar "{lead.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            El canal {lead.canal} pierde la protección del NIT {lead.nit} y cualquier canal podrá registrarlo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={release.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={release.isPending}>
            Liberar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteLeadButton({ lead }: { lead: Lead }) {
  const del = useDeleteLead();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(lead.id);
      useToastStore.success("Oportunidad eliminada", lead.nombre);
    } catch {
      // toast global
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={del.isPending} aria-label={`Eliminar ${lead.nombre}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{lead.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>Se borra el registro y con él la protección del NIT.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
