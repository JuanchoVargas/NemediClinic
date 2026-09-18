// ============================================================
// TenantsTab.tsx — Tenants vistos desde la plataforma
//
// Tabla + alta/edición (canal, plan, IPS, estado, override del porcentaje)
// y "Crear administrador": bootstrap-admin devuelve la contraseña temporal
// UNA sola vez, por eso se muestra en un diálogo para copiarla.
// ============================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useBootstrapAdmin,
  useChannels,
  useCreatePlatformTenant,
  useDeletePlatformTenant,
  usePlatformTenants,
  useUpdatePlatformTenant,
} from "@/api/platform.api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPercent, formatShortDate } from "@/lib/format-platform";
import { useToastStore } from "@/stores/toast.store";
import type {
  BootstrapAdminResponse,
  PlatformTenant,
  TenantEstado,
} from "@/types/platform";

const ESTADO_BADGE: Record<TenantEstado, "success" | "destructive" | "secondary"> = {
  Activo: "success",
  Suspendido: "destructive",
  Exento: "secondary",
};

const tenantSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  nit: z.string().min(1, "Requerido"),
  email: z.string().min(1, "Requerido").email("Email inválido"),
  telefono: z.string(),
  channelId: z.string().min(1, "Elige un canal"),
  plan: z.enum(["Basico", "Pro"]),
  sedesAdicionales: z.number().int().min(0, "No puede ser negativo").max(100),
  esIps: z.boolean(),
  estado: z.enum(["Activo", "Suspendido", "Exento"]),
  // Texto en %, vacío = usa el porcentaje del canal
  overridePct: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), "Entre 0 y 100"),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

export function TenantsTab() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const { data: tenants, isLoading } = usePlatformTenants(search);

  const [formState, setFormState] = useState<{ open: boolean; editing?: PlatformTenant }>({ open: false });
  const [bootstrapFor, setBootstrapFor] = useState<PlatformTenant | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o NIT..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setFormState({ open: true })}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo tenant
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clínica</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>% canal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Activación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && tenants?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No hay tenants que coincidan.
                </TableCell>
              </TableRow>
            )}
            {tenants?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{t.nombre}</div>
                  <div className="text-xs text-muted-foreground">{t.email}</div>
                </TableCell>
                <TableCell>{t.nit}</TableCell>
                <TableCell>{t.canal}</TableCell>
                <TableCell>
                  {t.plan === "Basico" ? "Básico" : "Pro"}
                  {t.sedesAdicionales > 0 && (
                    <span className="text-xs text-muted-foreground"> +{t.sedesAdicionales} sedes</span>
                  )}
                  {t.esIps && (
                    <Badge variant="outline" className="ml-2">
                      IPS
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {formatPercent(t.porcentajeCanalEfectivo)}
                  {t.porcentajeCanalOverride != null && (
                    <span className="text-xs text-muted-foreground"> (propio)</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ESTADO_BADGE[t.estado]}>{t.estado}</Badge>
                </TableCell>
                <TableCell>{formatShortDate(t.fechaActivacion)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!t.tieneSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBootstrapFor(t)}
                        aria-label={`Crear administrador de ${t.nombre}`}
                      >
                        <KeyRound className="mr-1 h-4 w-4" />
                        Crear admin
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormState({ open: true, editing: t })}
                      aria-label={`Editar ${t.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteTenantButton tenant={t} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Montados solo al abrir: el form nace con los valores del tenant, sin efectos de reset */}
      {formState.open && (
        <TenantFormDialog
          key={formState.editing?.id ?? "new"}
          editing={formState.editing}
          onClose={() => setFormState({ open: false })}
        />
      )}
      {bootstrapFor && (
        <BootstrapAdminDialog
          key={bootstrapFor.id}
          tenant={bootstrapFor}
          onClose={() => setBootstrapFor(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Alta / edición
// ────────────────────────────────────────────────────────────
function TenantFormDialog({ editing, onClose }: { editing?: PlatformTenant; onClose: () => void }) {
  const { data: channels } = useChannels();
  const create = useCreatePlatformTenant();
  const update = useUpdatePlatformTenant();
  const isPending = create.isPending || update.isPending;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      nombre: editing?.nombre ?? "",
      nit: editing?.nit ?? "",
      email: editing?.email ?? "",
      telefono: editing?.telefono ?? "",
      channelId: editing?.channelId ?? "",
      plan: editing?.plan ?? "Basico",
      sedesAdicionales: editing?.sedesAdicionales ?? 0,
      esIps: editing?.esIps ?? false,
      estado: editing?.estado ?? "Activo",
      overridePct:
        editing?.porcentajeCanalOverride != null ? String(editing.porcentajeCanalOverride * 100) : "",
    },
  });

  const onSubmit = async (values: TenantFormValues) => {
    const { overridePct, ...rest } = values;
    const override = overridePct === "" ? null : Number(overridePct) / 100;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          body: { ...rest, porcentajeCanalOverride: override, quitarOverride: override === null },
        });
        useToastStore.success("Tenant actualizado", values.nombre);
      } else {
        await create.mutateAsync({ ...rest, porcentajeCanalOverride: override });
        useToastStore.success("Tenant creado", "Ahora crea su administrador");
      }
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={editing ? "Editar tenant" : "Nuevo tenant"}
      description={
        editing ? "Datos comerciales de la clínica." : "Da de alta una clínica y asígnala a un canal."
      }
      dirty={form.formState.isDirty}
      actions={
        <Button form="platform-tenant-form" type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="platform-tenant-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
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
                        ?.filter((c) => c.activo || c.id === editing?.channelId)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} ({formatPercent(c.porcentajeCanal)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Suspendido">Suspendido (solo lectura)</SelectItem>
                      <SelectItem value="Exento">Exento (no factura)</SelectItem>
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
            name="overridePct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porcentaje propio del canal (%)</FormLabel>
                <FormControl><Input inputMode="decimal" placeholder="Vacío = el del canal" {...field} /></FormControl>
                <FormDescription>
                  Solo para acuerdos distintos al del canal (p. ej. el 60/40 del Anexo A).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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

// ────────────────────────────────────────────────────────────
// Primer SuperAdmin del tenant (bootstrap-admin)
// ────────────────────────────────────────────────────────────
const adminSchema = z.object({
  adminNombre: z.string().min(1, "Requerido"),
  adminApellido: z.string().min(1, "Requerido"),
  adminEmail: z.string().min(1, "Requerido").email("Email inválido"),
});
type AdminFormValues = z.infer<typeof adminSchema>;

function BootstrapAdminDialog({ tenant, onClose }: { tenant: PlatformTenant; onClose: () => void }) {
  const bootstrap = useBootstrapAdmin();
  const [credentials, setCredentials] = useState<BootstrapAdminResponse | null>(null);

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: { adminNombre: "", adminApellido: "", adminEmail: tenant.email },
  });

  const onSubmit = async (values: AdminFormValues) => {
    try {
      setCredentials(await bootstrap.mutateAsync({ id: tenant.id, body: values }));
    } catch {
      // toast global
    }
  };

  const copy = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Usuario: ${credentials.email}\nContraseña temporal: ${credentials.passwordTemporal}`,
    );
    useToastStore.success("Credenciales copiadas");
  };

  if (credentials) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Administrador creado</DialogTitle>
            <DialogDescription>
              Entrega estas credenciales a {tenant.nombre}. La contraseña temporal no se vuelve a mostrar.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Usuario</dt>
              <dd className="font-medium">{credentials.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Contraseña temporal</dt>
              <dd className="font-mono font-medium" data-testid="temp-password">
                {credentials.passwordTemporal}
              </dd>
            </div>
          </dl>
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

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Crear administrador"
      description={`Crea la Sede Principal y el primer SuperAdmin de ${tenant.nombre}.`}
      dirty={form.formState.isDirty}
      actions={
        <Button form="bootstrap-admin-form" type="submit" disabled={bootstrap.isPending}>
          {bootstrap.isPending ? "Creando..." : "Crear administrador"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="bootstrap-admin-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="adminNombre"
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
              name="adminApellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="adminEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo de acceso *</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormDescription>Debe ser único en toda la plataforma.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}

// ────────────────────────────────────────────────────────────
// Eliminar con confirmación
// ────────────────────────────────────────────────────────────
function DeleteTenantButton({ tenant }: { tenant: PlatformTenant }) {
  const del = useDeletePlatformTenant();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(tenant.id);
      useToastStore.success("Tenant eliminado", tenant.nombre);
    } catch {
      // toast global
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={del.isPending} aria-label={`Eliminar ${tenant.nombre}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{tenant.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            El tenant se marca como eliminado (soft delete) y sale de la liquidación. Para un corte
            temporal por mora usa el estado Suspendido.
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
