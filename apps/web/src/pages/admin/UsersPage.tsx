// ============================================================
// UsersPage.tsx — Gestión de usuarios del sistema (/admin/users)
//
// Tabla con búsqueda + filtro por rol, alta vía /auth/register y
// edición/borrado vía /Users/{id}. Sheet lateral para el formulario.
// Visible para SuperAdmin y Admin (guard en el router).
// ============================================================

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

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
import { FormDialog } from "@/components/shared/FormDialog";
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
import { PageContainer } from "@/components/shared/PageContainer";

import {
  ROLE_TO_INT,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsersPaged,
  type RolName,
  type UserDto,
} from "@/api/users.api";
import { useBranches } from "@/api/branches.api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { usePageReset } from "@/hooks/use-page-reset";
import { useToastStore } from "@/stores/toast.store";

const PAGE_SIZE = 20;
const NO_BRANCH = "none";

const userSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  apellido: z.string().min(1, "Requerido"),
  email: z.string().min(1, "Requerido").email("Email inválido"),
  password: z.string().optional().or(z.literal("")),
  rol: z.enum(["SuperAdmin", "Admin", "Esteticista"]),
  branchId: z.string(),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

const EMPTY: UserFormValues = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  rol: "Esteticista",
  branchId: NO_BRANCH,
  isActive: true,
};

const roleBadgeVariant = (rol: string): "default" | "secondary" | "success" => {
  if (rol === "SuperAdmin") return "default";
  if (rol === "Admin") return "success";
  return "secondary";
};

export function UsersPage() {
  const { can } = usePermissions();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [rolFilter, setRolFilter] = useState<"all" | RolName>("all");
  const [page, setPage] = usePageReset(`${search}|${rolFilter}`);

  const { data, isLoading } = useUsersPaged(
    page,
    PAGE_SIZE,
    search,
    rolFilter === "all" ? undefined : rolFilter,
  );
  const { data: branches } = useBranches();

  const branchName = (id?: string | null) =>
    branches?.find((b) => b.id === id)?.nombre ?? "—";

  const [sheetState, setSheetState] = useState<{ open: boolean; editing?: UserDto }>({
    open: false,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestión de usuarios del sistema y sus roles.
          </p>
        </div>
        {can("users.create") && (
          <Button onClick={() => setSheetState({ open: true })}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={rolFilter} onValueChange={(v) => setRolFilter(v as "all" | RolName)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Esteticista">Esteticista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search || rolFilter !== "all"
                    ? "Sin resultados para los filtros aplicados."
                    : "Aún no hay usuarios registrados."}
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nombre} {u.apellido}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant(u.rol)}>{u.rol}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {branchName(u.branchId)}
                </TableCell>
                <TableCell>
                  {u.isActive ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {can("users.update") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSheetState({ open: true, editing: u })}
                        aria-label={`Editar ${u.nombre}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {can("users.delete") && <DeleteUserButton user={u} />}
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
            Página {data.page} de {totalPages} · {data.totalCount} usuarios
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

      <UserSheet
        open={sheetState.open}
        editing={sheetState.editing}
        onClose={() => setSheetState({ open: false })}
      />
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet con form (crear o editar)
// ────────────────────────────────────────────────────────────
function UserSheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: UserDto;
  onClose: () => void;
}) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const { data: branches } = useBranches();
  const isPending = create.isPending || update.isPending;
  const isEdit = !!editing;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              nombre: editing.nombre,
              apellido: editing.apellido,
              email: editing.email,
              password: "",
              rol: editing.rol as RolName,
              branchId: editing.branchId ?? NO_BRANCH,
              isActive: editing.isActive,
            }
          : EMPTY,
      );
    }
  }, [open, editing, form]);

  const onSubmit = async (values: UserFormValues) => {
    const branchId = values.branchId === NO_BRANCH ? null : values.branchId;

    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          id: editing.id,
          body: {
            nombre: values.nombre,
            apellido: values.apellido,
            email: values.email,
            rol: ROLE_TO_INT[values.rol],
            branchId,
            isActive: values.isActive,
          },
        });
        useToastStore.success("Usuario actualizado");
      } else {
        // Contraseña obligatoria solo al crear (mín. 8, igual que el backend).
        if (!values.password || values.password.length < 8) {
          form.setError("password", {
            message: "Mínimo 8 caracteres",
          });
          return;
        }
        await create.mutateAsync({
          nombre: values.nombre,
          apellido: values.apellido,
          email: values.email,
          password: values.password,
          rol: ROLE_TO_INT[values.rol],
          branchId,
        });
        useToastStore.success("Usuario creado");
      }
      onClose();
    } catch {
      // toast global
    }
  };

  // SuperAdmin no se puede crear desde aquí; solo aparece como opción si se
  // está editando un usuario que ya lo es (para no perder su rol al guardar).
  const showSuperAdminOption = isEdit && editing?.rol === "SuperAdmin";

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={<>{isEdit ? "Editar usuario" : "Nuevo usuario"}</>}
      description={<>{isEdit
              ? "Modifica los datos del usuario."
              : "Da de alta un usuario del sistema."}</>}
      dirty={form.formState.isDirty}
      actions={
        <Button form="user-form" type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear"}
          </Button>
      }
    >
        <div className="pt-1">
          <Form {...form}>
            <form id="user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="apellido"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEdit && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña *</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {showSuperAdminOption && (
                          <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                        )}
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Esteticista">Esteticista</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sede</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin sede" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_BRANCH}>Sin sede</SelectItem>
                        {branches?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Desactivar sin borrar: el usuario no puede ingresar, pero su historial queda */}
              {isEdit && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <FormLabel>Activo</FormLabel>
                        <FormDescription>Un usuario inactivo no puede iniciar sesión.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </div>

        </FormDialog>
  );
}

// ────────────────────────────────────────────────────────────
// Eliminar con confirmación
// ────────────────────────────────────────────────────────────
function DeleteUserButton({ user }: { user: UserDto }) {
  const del = useDeleteUser();

  const handleConfirm = async () => {
    try {
      await del.mutateAsync(user.id);
      useToastStore.success("Usuario eliminado", `${user.nombre} ${user.apellido}`);
    } catch {
      // toast global
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={del.isPending}
          aria-label={`Eliminar ${user.nombre}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar a "{user.nombre} {user.apellido}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción desactiva y marca el usuario como eliminado (soft delete).
            No podrá volver a iniciar sesión.
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
