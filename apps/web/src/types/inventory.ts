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
// ── Trazabilidad sanitaria ───────────────────────────────────────
/** Cómo clasifica el INVIMA el producto: define qué hay que reportarle a la Secretaría de Salud. */
export const RegulatoryType = {
  Insumo: "Insumo",
  Medicamento: "Medicamento",
  DispositivoMedico: "DispositivoMedico",
  Cosmetico: "Cosmetico",
} as const;
export type RegulatoryType = (typeof RegulatoryType)[keyof typeof RegulatoryType];

export const REGULATORY_LABELS: Record<RegulatoryType, string> = {
  Insumo: "Insumo",
  Medicamento: "Medicamento",
  DispositivoMedico: "Dispositivo médico",
  Cosmetico: "Cosmético",
};

/** Plural, para pestañas y títulos de reporte. */
export const REGULATORY_PLURAL: Record<RegulatoryType, string> = {
  Insumo: "Insumos",
  Medicamento: "Medicamentos",
  DispositivoMedico: "Dispositivos médicos",
  Cosmetico: "Cosméticos",
};

/** Semáforo de vencimiento de un lote (lo calcula el backend). */
export const LotStatus = {
  Vigente: "Vigente",
  PorVencer: "PorVencer",
  Critico: "Critico",
  Vencido: "Vencido",
} as const;
export type LotStatus = (typeof LotStatus)[keyof typeof LotStatus];

/** Mismo criterio de color que el semáforo de stock: verde bien, ámbar atención, rojo urgente. */
export const LOT_STATUS_COLORS: Record<LotStatus, "success" | "warning" | "destructive"> = {
  Vigente: "success",
  PorVencer: "warning",
  Critico: "destructive",
  Vencido: "destructive",
};

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  Vigente: "Vigente",
  PorVencer: "Por vencer",
  Critico: "Crítico",
  Vencido: "Vencido",
};

export interface ProductLot {
  id: string;
  productId: string;
  numeroLote: string | null;
  fechaVencimiento: string | null;
  /** Negativo si ya venció; null si no vence. */
  diasParaVencer: number | null;
  estado: LotStatus;
  cantidadInicial: number;
  cantidadDisponible: number;
  fechaIngreso: string;
  proveedor: string | null;
  numeroFactura: string | null;
  registroSanitario: string | null;
}

export interface LotAlerta extends ProductLot {
  productoNombre: string;
  unidadMedida: string;
  tipoRegulatorio: RegulatoryType;
}

// ── Reporte para la Secretaría de Salud ──
export interface RegulatoryProduct {
  productId: string;
  nombre: string;
  registroSanitarioInvima: string | null;
  principioActivo: string | null;
  concentracion: string | null;
  requiereCadenaFrio: boolean;
  unidadMedida: string;
  cantidadDisponible: number;
  consumoPeriodo: number;
  lotes: ProductLot[];
}

export interface RegulatoryReport {
  desde: string;
  hasta: string;
  grupos: { tipoRegulatorio: RegulatoryType; productos: RegulatoryProduct[] }[];
}

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
  // ── Trazabilidad sanitaria ──
  tipoRegulatorio: RegulatoryType;
  registroSanitarioInvima: string | null;
  principioActivo: string | null;
  concentracion: string | null;
  requiereCadenaFrio: boolean;
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
  /** Lote que crea la entrada. Todo opcional, pero un medicamento sin lote no se puede reportar. */
  lote?: {
    numeroLote?: string;
    /** YYYY-MM-DD */
    fechaVencimiento?: string;
    proveedor?: string;
    numeroFactura?: string;
  };
}

export interface InventoryMovement {
  id: string;
  productId: string;
  /** De qué lote salió o entró; null en movimientos anteriores a la trazabilidad. */
  productLotId?: string | null;
  numeroLote?: string | null;
  fechaVencimientoLote?: string | null;
  /** Paciente de la sesión en la que se gastó (solo en las salidas de cabina). */
  pacienteNombre?: string | null;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
  tipoMovimiento: string; // "Entrada" | "Salida"
  referencia?: string | null;
  appointmentId?: string | null;
  patientId?: string | null;
  fechaMovimiento: string;
}
