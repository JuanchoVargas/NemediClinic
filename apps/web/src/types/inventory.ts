// ============================================================
// inventory.ts — Tipos del módulo de Inventario
//
// Backend: ProductsController + InventoryController
// Enum ProductType: Venta | InsumoCabina | Ambos
// Enum EntryReason: Compra | Donacion | Ajuste | Otro
// Enum StockStatus: Verde | Amarillo | Rojo (calculado en backend)
// ============================================================

export const ProductType = {
  Venta: "Venta",
  InsumoCabina: "InsumoCabina",
  Ambos: "Ambos",
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const EntryReason = {
  Compra: "Compra",
  Donacion: "Donacion",
  Ajuste: "Ajuste",
  Otro: "Otro",
} as const;
export type EntryReason = (typeof EntryReason)[keyof typeof EntryReason];

export const StockStatus = {
  Verde: "Verde",
  Amarillo: "Amarillo",
  Rojo: "Rojo",
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

/**
 * Mapping a variants del Badge shadcn (definidos en components/ui/badge.tsx).
 */
export const STOCK_STATUS_COLORS: Record<StockStatus, "success" | "warning" | "destructive"> = {
  Verde: "success",
  Amarillo: "warning",
  Rojo: "destructive",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  Verde: "Óptimo",
  Amarillo: "Bajo",
  Rojo: "Crítico",
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  Venta: "Venta",
  InsumoCabina: "Insumo cabina",
  Ambos: "Ambos",
};

export const ENTRY_REASON_LABELS: Record<EntryReason, string> = {
  Compra: "Compra",
  Donacion: "Donación",
  Ajuste: "Ajuste",
  Otro: "Otro",
};

// ────────────────────────────────────────────────────────────
// DTOs
// ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  referencia?: string | null;
  tipoProducto: string; // ProductType serializado
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo?: number | null;
  activo: boolean;
  semaforoStock: string; // StockStatus serializado
  createdAt?: string;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
}

/** Alias por compatibilidad con la spec (ProductDto). */
export type ProductDto = Product;

export interface CreateProductRequest {
  nombre: string;
  descripcion: string;
  referencia?: string;
  tipoProducto: ProductType;
  unidadMedida: string;
  stockMinimo: number;
  stockMaximo?: number | null;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
}

export interface UpdateProductRequest {
  nombre?: string;
  descripcion?: string;
  referencia?: string;
  tipoProducto?: ProductType;
  unidadMedida?: string;
  stockMinimo?: number;
  stockMaximo?: number | null;
  activo?: boolean;
  /** Id del Attachment con la imagen (se sube antes con POST /files). */
  imagenId?: string | null;
}

export interface InventoryEntry {
  id: string;
  productId: string;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
  motivoEntrada: string;
  observacion?: string | null;
  fechaEntrada: string;
  userId: string;
  usuarioNombre: string;
}

export interface RegisterEntryRequest {
  productId: string;
  cantidad: number;
  motivoEntrada: EntryReason;
  observacion?: string;
  fechaEntrada?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
  tipoMovimiento: string; // "Entrada" | "Salida"
  referencia?: string | null;
  appointmentId?: string | null;
  patientId?: string | null;
  fechaMovimiento: string;
}
