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
  Product,
  ProductType,
  RegisterEntryRequest,
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
) {
  return useQuery({
    queryKey: ["products", { page, pageSize, search, tipo, semaforo }],
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<Product>>(PRODUCTS, {
        params: {
          Page: page,
          PageSize: pageSize,
          Search: search || undefined,
          tipo: tipo || undefined,
          semaforo: semaforo || undefined,
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
