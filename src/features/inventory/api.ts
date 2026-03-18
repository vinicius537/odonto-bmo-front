import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray, pageItems, type Page } from "@/lib/collections";

export interface InventoryItem {
  id: string;
  clinic_id: string;
  name: string;
  sku?: string;
  category: string;
  unit: string;
  quantity: number;
  minimum_quantity: number;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  clinic_id: string;
  item_id: string;
  item_name: string;
  kind: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
  notes?: string;
  created_at: string;
}

export interface InventorySummary {
  total_items: number;
  low_stock_count: number;
  zero_stock_count: number;
  recent_movements: InventoryMovement[];
}

export interface InventoryItemInput {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  quantity: number;
  minimum_quantity: number;
  location?: string;
  notes?: string;
}

export interface InventoryMovementInput {
  kind: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
  notes?: string;
}

export function useInventorySummaryQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["inventory-summary", activeClinicId],
    queryFn: async () => {
      const response = await apiRequest<InventorySummary>("/inventory/summary", { clinic: true });
      return {
        ...response,
        recent_movements: ensureArray(response.recent_movements),
      };
    },
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useInventoryItemsQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["inventory-items", activeClinicId],
    queryFn: async () => pageItems(await apiRequest<Page<InventoryItem>>("/inventory/items", { clinic: true })),
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useInventoryMovementsQuery(itemId: string | null) {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["inventory-movements", activeClinicId, itemId],
    queryFn: async () =>
      pageItems(await apiRequest<Page<InventoryMovement>>(`/inventory/items/${itemId}/movements`, { clinic: true })),
    enabled: status === "authenticated" && Boolean(activeClinicId) && Boolean(itemId),
  });
}

function invalidateInventoryQueries(queryClient: ReturnType<typeof useQueryClient>, activeClinicId: string | null, itemId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: ["inventory-summary", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["inventory-items", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["reports-overview", activeClinicId] });
  if (itemId) {
    void queryClient.invalidateQueries({ queryKey: ["inventory-movements", activeClinicId, itemId] });
  }
}

export function useCreateInventoryItemMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: InventoryItemInput) =>
      apiRequest<InventoryItem>("/inventory/items", {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateInventoryQueries(queryClient, activeClinicId),
  });
}

export function useUpdateInventoryItemMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: InventoryItemInput }) =>
      apiRequest<InventoryItem>(`/inventory/items/${itemId}`, {
        clinic: true,
        method: "PATCH",
        body: input,
      }),
    onSuccess: (_, variables) => invalidateInventoryQueries(queryClient, activeClinicId, variables.itemId),
  });
}

export function useCreateInventoryMovementMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: InventoryMovementInput }) =>
      apiRequest<InventoryMovement>(`/inventory/items/${itemId}/movements`, {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: (_, variables) => invalidateInventoryQueries(queryClient, activeClinicId, variables.itemId),
  });
}
