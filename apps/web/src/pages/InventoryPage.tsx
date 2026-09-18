// ============================================================
// InventoryPage.tsx — Módulo de Inventario (3 tabs)
//
// Tab 1 "Productos": tabla con filtros + CRUD vía Sheet
// Tab 2 "Entradas":  historial + registrar entrada manual
// Tab 3 "Alertas":   productos en Amarillo/Rojo con acción rápida
//
// La Sheet de RegisterEntry se controla a nivel page para que
// AlertsTab pueda dispararla con un producto pre-seleccionado.
// ============================================================

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Package2,
} from "lucide-react";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { SecureImage } from "@/components/shared/SecureImage";
import { MotionTableRow, staggerProps } from "@/components/shared/motion-elements";

import {
  useCreateProduct,
  useDeleteProduct,
  useInventoryEntries,
  useProducts,
  useRegisterEntry,
  useStockAlerts,
  useUpdateProduct,
} from "@/api/inventory.api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { usePageReset } from "@/hooks/use-page-reset";
import { useToastStore } from "@/stores/toast.store";
import { toLocalDate, toLocalIso } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  ENTRY_REASON_LABELS,
  EntryReason,
  PRODUCT_TYPE_LABELS,
  ProductType,
  STOCK_STATUS_COLORS,
  STOCK_STATUS_LABELS,
  type Product,
  type StockStatus,
} from "@/types/inventory";

const PAGE_SIZE = 20;

// ────────────────────────────────────────────────────────────
// Página principal con tabs
// ────────────────────────────────────────────────────────────
export function InventoryPage() {
  const [productSheet, setProductSheet] = useState<{
    open: boolean;
    editing?: Product;
  }>({ open: false });
  // `seq` remonta el formulario de entrada en cada apertura (estado limpio sin useEffect)
  const [entrySheet, setEntrySheet] = useState<{
    open: boolean;
    defaultProduct?: Product;
    seq: number;
  }>({ open: false, seq: 0 });
  const openEntry = (defaultProduct?: Product) =>
    setEntrySheet((s) => ({ open: true, defaultProduct, seq: s.seq + 1 }));

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">
          Productos en venta y consumo de cabina, entradas y alertas de stock.
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="entries">Entradas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <ProductsTab
            onNew={() => setProductSheet({ open: true })}
            onEdit={(p) => setProductSheet({ open: true, editing: p })}
          />
        </TabsContent>
        <TabsContent value="entries" className="mt-4">
          <EntriesTab onNew={() => openEntry()} />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab onRegisterEntry={(p) => openEntry(p)} />
        </TabsContent>
      </Tabs>

      <ProductSheet
        open={productSheet.open}
        editing={productSheet.editing}
        onClose={() => setProductSheet({ open: false })}
      />
      <RegisterEntrySheet
        key={entrySheet.seq}
        open={entrySheet.open}
        defaultProduct={entrySheet.defaultProduct}
        onClose={() => setEntrySheet((s) => ({ ...s, open: false }))}
      />
    </PageContainer>
  );
}

// ────────────────────────────────────────────────────────────
// Tab 1: Productos
// ────────────────────────────────────────────────────────────
function ProductsTab({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (p: Product) => void;
}) {
  const { can } = usePermissions();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [tipo, setTipo] = useState<string>("all");
  const [semaforo, setSemaforo] = useState<string>("all");
  const [page, setPage] = usePageReset(`${search}|${tipo}|${semaforo}`);

  const { data, isLoading } = useProducts(
    page,
    PAGE_SIZE,
    search,
    tipo !== "all" ? (tipo as ProductType) : undefined,
    semaforo !== "all" ? (semaforo as "Verde" | "Amarillo" | "Rojo") : undefined,
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative max-w-sm flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre o referencia..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={semaforo} onValueChange={setSemaforo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semáforo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los semáforos</SelectItem>
              <SelectItem value="Verde">Verde (óptimo)</SelectItem>
              <SelectItem value="Amarillo">Amarillo (bajo)</SelectItem>
              <SelectItem value="Rojo">Rojo (crítico)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {can("products.create") && (
          <Button onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Stock actual</TableHead>
              <TableHead>Semáforo</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    illustration="inventory"
                    title="Sin productos con esos filtros"
                    description="Ajusta la búsqueda o crea el primer producto del inventario."
                  />
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((p, i) => (
              <MotionTableRow key={p.id} {...staggerProps(i)}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <SecureImage
                      id={p.imagenId}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border"
                      fallback={
                        <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
                        >
                          <Package2 className="h-4 w-4" />
                        </span>
                      }
                    />
                    {p.nombre}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.referencia ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {PRODUCT_TYPE_LABELS[p.tipoProducto as ProductType] ?? p.tipoProducto}
                  </Badge>
                </TableCell>
                <TableCell>{p.unidadMedida}</TableCell>
                <TableCell>
                  {p.stockActual} <span className="text-xs text-muted-foreground">/ mín {p.stockMinimo}</span>
                </TableCell>
                <TableCell>
                  <SemaforoBadge estado={p.semaforoStock as StockStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {can("products.update") && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(p)} aria-label={`Editar ${p.nombre}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {can("products.delete") && <DeleteProductButton product={p} />}
                  </div>
                </TableCell>
              </MotionTableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} · {data.totalCount} productos
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
    </div>
  );
}

function SemaforoBadge({ estado }: { estado: StockStatus }) {
  const variant = STOCK_STATUS_COLORS[estado] ?? "outline";
  return <Badge variant={variant}>{estado}</Badge>;
}

function DeleteProductButton({ product }: { product: Product }) {
  const del = useDeleteProduct();
  const handleConfirm = async () => {
    try {
      await del.mutateAsync(product.id);
      useToastStore.success("Producto eliminado", product.nombre);
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
          aria-label={`Eliminar ${product.nombre}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{product.nombre}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Soft delete. El historial de entradas y movimientos se mantiene,
            pero el producto desaparece del listado.
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

// ────────────────────────────────────────────────────────────
// Sheet: crear/editar producto
// ────────────────────────────────────────────────────────────
// Zod 4: schemas con z.number() plano (sin chain) para evitar bug
// de input==unknown que rompe useForm. Validaciones por HTML attrs.
const productSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  descripcion: z.string().optional().or(z.literal("")),
  referencia: z.string().optional().or(z.literal("")),
  tipoProducto: z.enum(["Venta", "InsumoCabina", "Ambos"]),
  unidadMedida: z.string().min(1, "Requerido"),
  stockMinimo: z.number(),
  stockMaximo: z.number().optional().nullable(),
  activo: z.boolean(),
  imagenId: z.string().nullable(),
});
type ProductFormValues = z.infer<typeof productSchema>;
const EMPTY: ProductFormValues = {
  nombre: "",
  descripcion: "",
  referencia: "",
  tipoProducto: "Venta",
  unidadMedida: "",
  stockMinimo: 0,
  stockMaximo: null,
  activo: true,
  imagenId: null,
};

function ProductSheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: Product;
  onClose: () => void;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isPending = create.isPending || update.isPending;
  const isEdit = !!editing;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              nombre: editing.nombre,
              descripcion: editing.descripcion ?? "",
              referencia: editing.referencia ?? "",
              tipoProducto: editing.tipoProducto as ProductType,
              unidadMedida: editing.unidadMedida,
              stockMinimo: editing.stockMinimo,
              stockMaximo: editing.stockMaximo ?? null,
              activo: editing.activo,
              imagenId: editing.imagenId ?? null,
            }
          : EMPTY,
      );
    }
  }, [open, editing, form]);

  const onSubmit = async (values: ProductFormValues) => {
    const body = {
      nombre: values.nombre,
      descripcion: values.descripcion || "",
      referencia: values.referencia || undefined,
      tipoProducto: values.tipoProducto,
      unidadMedida: values.unidadMedida,
      stockMinimo: values.stockMinimo,
      stockMaximo: values.stockMaximo ?? null,
      imagenId: values.imagenId,
    };
    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          id: editing.id,
          body: { ...body, activo: values.activo },
        });
        useToastStore.success("Producto actualizado");
      } else {
        await create.mutateAsync(body);
        useToastStore.success("Producto creado");
      }
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={<>{isEdit ? "Editar producto" : "Nuevo producto"}</>}
      description={<>{isEdit
              ? "El stock actual no se modifica desde acá. Para ajustarlo, registrá una entrada."
              : "El stock actual arranca en 0. Para agregar inventario, registrá una entrada después de crear el producto."}</>}
      dirty={form.formState.isDirty}
      actions={
        <Button form="product-form" type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear"}
          </Button>
      }
    >
        <div className="pt-1">
          <Form {...form}>
            <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="imagenId"
                render={({ field }) => (
                  <ImageUpload
                    entityType="Product"
                    kind="Producto"
                    entityId={editing?.id}
                    value={field.value}
                    onChange={field.onChange}
                    label="Imagen del producto"
                  />
                )}
              />
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
                name="referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl><Input placeholder="Código interno, SKU..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipoProducto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unidadMedida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de medida *</FormLabel>
                      <FormControl><Input placeholder="ml, kg, unidad..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stockMinimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock mínimo *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number.isFinite(field.value) ? field.value : ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stockMaximo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock máximo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isEdit && (
                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <Label>Activo</Label>
                        <p className="text-xs text-muted-foreground">
                          Si está inactivo no aparece en las búsquedas de inventario.
                        </p>
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
// Tab 2: Entradas
// ────────────────────────────────────────────────────────────
function EntriesTab({ onNew }: { onNew: () => void }) {
  const { can } = usePermissions();
  const canRegister = can("inventory.entries.create");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInventoryEntries(page, PAGE_SIZE);
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const empty = !isLoading && data && data.items.length === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Historial cronológico de entradas registradas (más recientes primero).
        </p>
        {canRegister && (
          <Button onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar entrada
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead>Observación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {empty && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aún no hay entradas registradas.
                </TableCell>
              </TableRow>
            )}

            {data?.items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.productoNombre}</TableCell>
                <TableCell>
                  {e.cantidad} {e.unidadMedida}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ENTRY_REASON_LABELS[e.motivoEntrada as EntryReason] ?? e.motivoEntrada}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(e.fechaEntrada).toLocaleDateString("es-CO")}
                </TableCell>
                <TableCell className="text-muted-foreground">{e.usuarioNombre}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                  {e.observacion ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {data.page} de {totalPages} · {data.totalCount} entradas</span>
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet: registrar entrada
// ────────────────────────────────────────────────────────────
function RegisterEntrySheet({
  open,
  defaultProduct,
  onClose,
}: {
  open: boolean;
  defaultProduct?: Product;
  onClose: () => void;
}) {
  const register = useRegisterEntry();

  // Estado inicial por render: el padre remonta este componente (key) en cada apertura.
  const [product, setProduct] = useState<Product | null>(defaultProduct ?? null);
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState<EntryReason>("Compra");
  const [observacion, setObservacion] = useState<string>("");
  const [fecha, setFecha] = useState<string>(() => toLocalDate(new Date()));

  const entryDirty =
    (product?.id ?? null) !== (defaultProduct?.id ?? null) ||
    cantidad > 0 ||
    motivo !== "Compra" ||
    observacion !== "";

  const canSubmit = !!product && cantidad > 0 && !!fecha;

  const handleSubmit = async () => {
    if (!product) return;
    try {
      await register.mutateAsync({
        productId: product.id,
        cantidad,
        motivoEntrada: motivo,
        observacion: observacion || undefined,
        fechaEntrada: toLocalIso(new Date(`${fecha}T00:00:00`)),
      });
      useToastStore.success(
        "Entrada registrada",
        `${cantidad} ${product.unidadMedida} de ${product.nombre}`,
      );
      onClose();
    } catch {
      // toast global
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={<>Registrar entrada</>}
      description={<>Aumenta el stock del producto y deja registro en el historial.</>}
      dirty={entryDirty}
      actions={
        <Button onClick={handleSubmit} disabled={!canSubmit || register.isPending}>
            {register.isPending ? "Registrando..." : "Registrar"}
          </Button>
      }
    >
        <div className="pt-1 space-y-4">
          <ProductCombobox value={product} onChange={setProduct} />

          <div className="space-y-1.5">
            <Label>Cantidad {product && <span className="text-xs text-muted-foreground">({product.unidadMedida})</span>}</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={cantidad === 0 ? "" : cantidad}
              onChange={(e) =>
                setCantidad(e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as EntryReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ENTRY_REASON_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Observación</Label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>

        </FormDialog>
  );
}

// ────────────────────────────────────────────────────────────
// Combobox de producto con búsqueda server-side
// ────────────────────────────────────────────────────────────
function ProductCombobox({
  value,
  onChange,
}: {
  value: Product | null;
  onChange: (p: Product | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data } = useProducts(1, 20, debounced);

  return (
    <div className="space-y-1.5">
      <Label>Producto</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span>
                {value.nombre}
                {value.referencia && (
                  <span className="text-muted-foreground"> ({value.referencia})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar producto...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Nombre o referencia..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {data?.items.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      onChange(p);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{p.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {p.stockActual} {p.unidadMedida}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab 3: Alertas
// ────────────────────────────────────────────────────────────
function AlertsTab({ onRegisterEntry }: { onRegisterEntry: (p: Product) => void }) {
  const { data, isLoading } = useStockAlerts();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium">Todo el inventario está en nivel óptimo</p>
          <p className="text-sm text-muted-foreground mt-1">
            No hay productos en estado Amarillo ni Rojo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <AlertCard key={p.id} product={p} onRegisterEntry={() => onRegisterEntry(p)} />
      ))}
    </div>
  );
}

function AlertCard({
  product,
  onRegisterEntry,
}: {
  product: Product;
  onRegisterEntry: () => void;
}) {
  const { can } = usePermissions();
  const canRegister = can("inventory.entries.create");
  const estado = product.semaforoStock as StockStatus;
  const urgenciaLabel = estado === "Rojo" ? "Crítico" : STOCK_STATUS_LABELS[estado];
  const variant = STOCK_STATUS_COLORS[estado];

  const pct =
    product.stockMinimo > 0
      ? Math.min(100, (product.stockActual / product.stockMinimo) * 100)
      : 0;

  return (
    <Card className={cn("border-2", estado === "Rojo" ? "border-destructive/50" : "border-yellow-300")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                estado === "Rojo" ? "text-destructive" : "text-yellow-600",
              )}
            />
            {product.nombre}
          </CardTitle>
          <Badge variant={variant}>{urgenciaLabel}</Badge>
        </div>
        <CardDescription>
          {PRODUCT_TYPE_LABELS[product.tipoProducto as ProductType] ?? product.tipoProducto}
          {product.referencia && ` · ${product.referencia}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Stock actual</span>
            <span className="font-medium">
              {product.stockActual} / mín {product.stockMinimo} {product.unidadMedida}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                estado === "Rojo" ? "bg-destructive" : "bg-sand",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {canRegister && (
          <Button onClick={onRegisterEntry} size="sm" className="w-full">
            <Plus className="mr-1 h-4 w-4" />
            Registrar entrada
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
