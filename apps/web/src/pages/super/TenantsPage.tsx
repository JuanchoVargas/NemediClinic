// ============================================================
// TenantsPage.tsx — Gestión de tenants/clínicas (/super/tenants)
//
// El SuperAdmin ve y edita SOLO su clínica (el backend filtra por el tenant del JWT).
// Crear, suspender o eliminar tenants es del PlatformAdmin → /platform.
// Solo accesible para SuperAdmin (guard en el router).
// ============================================================

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/shared/FormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer } from "@/components/shared/PageContainer";

import { useTenantsPaged, useUpdateTenant } from "@/api/tenants.api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { usePageReset } from "@/hooks/use-page-reset";
import { useToastStore } from "@/stores/toast.store";
import type { Tenant } from "@/types/tenant";

const PAGE_SIZE = 20;

const tenantSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  nit: z.string().min(1, "Requerido"),
  email: z.string().min(1, "Requerido").email("Email inválido"),
  telefono: z.string().optional().or(z.literal("")),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

const EMPTY: TenantFormValues = { nombre: "", nit: "", email: "", telefono: "" };

export function TenantsPage() {
  const { can } = usePermissions();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [page, setPage] = usePageReset(search);

  const { data, isLoading } = useTenantsPaged(page, PAGE_SIZE, search);

  const [sheetState, setSheetState] = useState<{ open: boolean; editing?: Tenant }>({
    open: false,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mi clínica</h1>
          <p className="text-muted-foreground">
            Datos de tu clínica en la plataforma.
          </p>
        </div>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre o NIT..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {search ? `Sin resultados para "${search}".` : "Aún no hay tenants registrados."}
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{t.nit}</TableCell>
                <TableCell className="text-muted-foreground">{t.email}</TableCell>
                <TableCell>
                  {t.isActive ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {can("tenants.update") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSheetState({ open: true, editing: t })}
                        aria-label={`Editar ${t.nombre}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.totalCount} tenants
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <TenantSheet
        open={sheetState.open}
        editing={sheetState.editing}
        onClose={() => setSheetState({ open: false })}
      />
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Diálogo con form (solo edición)
// ────────────────────────────────────────────────────────────
function TenantSheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: Tenant;
  onClose: () => void;
}) {
  const update = useUpdateTenant();
  const isPending = update.isPending;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              nombre: editing.nombre,
              nit: editing.nit,
              email: editing.email,
              telefono: editing.telefono ?? "",
            }
          : EMPTY,
      );
    }
  }, [open, editing, form]);

  const onSubmit = async (values: TenantFormValues) => {
    const body = {
      nombre: values.nombre,
      nit: values.nit,
      email: values.email,
      telefono: values.telefono || "",
    };
    try {
      if (!editing) return;
      await update.mutateAsync({ id: editing.id, body });
      useToastStore.success("Clínica actualizada");
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Editar clínica"
      description="Modifica los datos de la clínica."
      dirty={form.formState.isDirty}
      actions={
        <Button form="tenant-form" type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
      }
    >
        <div className="pt-1">
          <Form {...form}>
            <form id="tenant-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </form>
          </Form>
        </div>

        </FormDialog>
  );
}
