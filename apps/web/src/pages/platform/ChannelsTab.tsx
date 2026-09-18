// ============================================================
// ChannelsTab.tsx — Canales comerciales y su marca blanca
//
// Cada canal define el branding que se sirve en su dominio
// (GET /branding) y su porcentaje sobre lo facturado.
// ============================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";

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

import { useChannels, useDeleteChannel, useSaveChannel } from "@/api/platform.api";
import { formatPercent } from "@/lib/format-platform";
import { useToastStore } from "@/stores/toast.store";
import type { Channel } from "@/types/platform";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const channelSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  nombreComercial: z.string().min(1, "Requerido"),
  logoUrl: z.string().url("URL inválida").or(z.literal("")),
  colorPrimario: z.string().regex(HEX_COLOR, "Formato #RRGGBB"),
  colorSecundario: z.string().regex(HEX_COLOR, "Formato #RRGGBB"),
  dominio: z.string().regex(/^[a-z0-9.-]+$/i, "Solo el dominio, sin https:// ni rutas"),
  porcentajePct: z.number().min(0, "Entre 0 y 100").max(100, "Entre 0 y 100"),
  activo: z.boolean(),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

export function ChannelsTab() {
  const { data: channels, isLoading } = useChannels();
  const [formState, setFormState] = useState<{ open: boolean; editing?: Channel }>({ open: false });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setFormState({ open: true })}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo canal
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Dominio</TableHead>
              <TableHead>% canal</TableHead>
              <TableHead>Tenants</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {channels?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-xs text-muted-foreground">{c.slug}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: c.branding.colorPrimario }}
                      title={`Primario ${c.branding.colorPrimario}`}
                    />
                    <span
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: c.branding.colorSecundario }}
                      title={`Secundario ${c.branding.colorSecundario}`}
                    />
                    {c.branding.nombreComercial}
                  </div>
                </TableCell>
                <TableCell>{c.branding.dominio}</TableCell>
                <TableCell>{formatPercent(c.porcentajeCanal)}</TableCell>
                <TableCell>{c.tenants}</TableCell>
                <TableCell>
                  {c.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormState({ open: true, editing: c })}
                      aria-label={`Editar ${c.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteChannelButton channel={c} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {formState.open && (
        <ChannelFormDialog
          key={formState.editing?.id ?? "new"}
          editing={formState.editing}
          onClose={() => setFormState({ open: false })}
        />
      )}
    </div>
  );
}

function ChannelFormDialog({ editing, onClose }: { editing?: Channel; onClose: () => void }) {
  const save = useSaveChannel();

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      nombre: editing?.nombre ?? "",
      slug: editing?.slug ?? "",
      nombreComercial: editing?.branding.nombreComercial ?? "",
      logoUrl: editing?.branding.logoUrl ?? "",
      colorPrimario: editing?.branding.colorPrimario ?? "#171717",
      colorSecundario: editing?.branding.colorSecundario ?? "#737373",
      dominio: editing?.branding.dominio ?? "",
      porcentajePct: editing ? editing.porcentajeCanal * 100 : 0,
      activo: editing?.activo ?? true,
    },
  });

  const onSubmit = async ({ porcentajePct, logoUrl, ...rest }: ChannelFormValues) => {
    try {
      await save.mutateAsync({
        id: editing?.id,
        body: { ...rest, logoUrl: logoUrl || null, porcentajeCanal: porcentajePct / 100 },
      });
      useToastStore.success(editing ? "Canal actualizado" : "Canal creado", rest.nombre);
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={editing ? "Editar canal" : "Nuevo canal"}
      description="Marca blanca que se sirve en el dominio del canal y su participación."
      dirty={form.formState.isDirty}
      actions={
        <Button form="channel-form" type="submit" disabled={save.isPending}>
          {save.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="channel-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl><Input placeholder="infotex" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="nombreComercial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre comercial *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormDescription>Aparece en el encabezado, el login y el título de la pestaña.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dominio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dominio *</FormLabel>
                <FormControl><Input placeholder="app.infotex.co" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL del logo</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="colorPrimario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color primario *</FormLabel>
                  <FormControl><Input type="color" className="h-9 p-1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colorSecundario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color secundario *</FormLabel>
                  <FormControl><Input type="color" className="h-9 p-1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="porcentajePct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>% del canal *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
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
            name="activo"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <FormLabel>Activo</FormLabel>
                  <FormDescription>Un canal inactivo no recibe tenants ni oportunidades nuevas.</FormDescription>
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

function DeleteChannelButton({ channel }: { channel: Channel }) {
  const del = useDeleteChannel();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(channel.id);
      useToastStore.success("Canal eliminado", channel.nombre);
    } catch {
      // toast global (409 si tiene tenants u oportunidades)
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={del.isPending} aria-label={`Eliminar ${channel.nombre}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el canal "{channel.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Solo se puede eliminar un canal sin tenants ni oportunidades. Si ya tiene, desactívalo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
