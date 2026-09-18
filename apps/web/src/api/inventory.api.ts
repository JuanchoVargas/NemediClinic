// ============================================================
// inventory.api.ts — Hooks del módulo de Inventario
//
// Backend:
//   /api/v1/products      → CRUD de productos + /alerts
//   /api/v1/inventory     → entries, movements
// Policy: lectura cualquier autenticado; mutaciones requieren Admin.
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PagedResponse } from "@/types/api";
import type {
  CreateProductRequest,
  InventoryEntry,
  InventoryMovement,
  LotAlerta,
  Product,
  ProductLot,
  ProductType,
  RegisterEntryRequest,
  RegulatoryReport,
  RegulatoryType,
  UpdateProductRequest,
} from "@/types/inventory";

const PRODUCTS = "/api/v1/products";
const INVENTORY = "/api/v1/inventory";

// ────────────────────────────────────────────────────────────
// Products
// ────────────────────────────────────────────────────────────

export function useProducts(
  page: number,
  pageSize: number,
  search?: string,
  tipo?: ProductType,
  semaforo?: "Verde" | "Amarillo" | "Rojo",
  tipoRegulatorio?: RegulatoryType,
) {
  return useQuery({
    queryKey: ["products", { page, pageSize, search, tipo, semaforo, tipoRegulatorio }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Product>>(PRODUCTS, {
        params: {
          Page: page,
          PageSize: pageSize,
          Search: search || undefined,
          tipo: tipo || undefined,
          semaforo: semaforo || undefined,
          tipoRegulatorio: tipoRegulatorio || undefined,
        },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data } = await api.get<Product>(`${PRODUCTS}/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ["products", "alerts"],
    queryFn: async () => {
      const { data } = await api.get<Product[]>(`${PRODUCTS}/alerts`);
      return data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateProductRequest) => {
      const { data } = await api.post<Product>(PRODUCTS, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateProductRequest;
    }) => {
      await api.put(`${PRODUCTS}/${id}`, body);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${PRODUCTS}/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Inventory entries + movements
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// Lotes y trazabilidad sanitaria
// ────────────────────────────────────────────────────────────

/** Lotes de un producto, del que vence antes al que vence después. */
export function useProductLots(productId: string | undefined) {
  return useQuery({
    queryKey: ["products", productId, "lots"],
    queryFn: async () => {
      const { data } = await api.get<ProductLot[]>(`${PRODUCTS}/${productId}/lots`);
      return data;
    },
    enabled: !!productId,
  });
}

/** Lotes vencidos o que vencen en 90 días o menos, con existencia. */
export function useLotAlerts() {
  return useQuery({
    queryKey: ["products", "lot-alerts"],
    queryFn: async () => {
      const { data } = await api.get<LotAlerta[]>(`${PRODUCTS}/lot-alerts`);
      return data;
    },
  });
}

/** Reporte de inventario para la Secretaría de Salud (vista previa en pantalla). */
export function useRegulatoryReport(desde: string, hasta: string, tipo?: RegulatoryType) {
  return useQuery({
    queryKey: ["products", "regulatory-report", { desde, hasta, tipo }],
    queryFn: async () => {
      const { data } = await api.get<RegulatoryReport>(`${PRODUCTS}/regulatory-report`, {
        params: { desde, hasta, tipo: tipo || undefined },
      });
      return data;
    },
    enabled: !!desde && !!hasta,
  });
}

/** Descarga el mismo reporte en Excel. El archivo lo arma el backend (una hoja por tipo). */
export async function downloadRegulatoryReport(desde: string, hasta: string, tipo?: RegulatoryType) {
  const { data, headers } = await api.get<Blob>(`${PRODUCTS}/regulatory-report`, {
    params: { desde, hasta, tipo: tipo || undefined, formato: "xlsx" },
    responseType: "blob",
  });

  // El nombre viene en Content-Disposition; si no, uno con el rango
  const disposition = String(headers["content-disposition"] ?? "");
  const nombre = /filename="?([^";]+)"?/.exec(disposition)?.[1]
    ?? `inventario-secretaria-salud-${desde}-a-${hasta}.xlsx`;

  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export function useRegisterEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegisterEntryRequest) => {
      const { data } = await api.post<{ id: string }>(
        `${INVENTORY}/entries`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      // El stock del producto cambió → invalidar listados de products + entries + movements
      // Prefix-match: cubre el listado, el detalle, los lotes y sus alertas
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory-entries"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
    },
  });
}

export function useInventoryEntries(
  page: number,
  pageSize: number,
  productId?: string,
  from?: string,
  to?: string,
) {
  return useQuery({
    queryKey: ["inventory-entries", { page, pageSize, productId, from, to }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<InventoryEntry>>(
        `${INVENTORY}/entries`,
        {
          params: {
            Page: page,
            PageSize: pageSize,
            productId: productId || undefined,
            from: from || undefined,
            to: to || undefined,
          },
        },
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useInventoryMovements(productId?: string) {
  return useQuery({
    queryKey: ["inventory-movements", productId ?? "all"],
    queryFn: async () => {
      if (productId) {
        const { data } = await api.get<InventoryMovement[]>(
          `${INVENTORY}/movements/product/${productId}`,
        );
        return { items: data, page: 1, pageSize: data.length, totalCount: data.length };
      }
      const { data } = await api.get<PagedResponse<InventoryMovement>>(
        `${INVENTORY}/movements`,
        { params: { Page: 1, PageSize: 50 } },
      );
      return data;
    },
  });
}
