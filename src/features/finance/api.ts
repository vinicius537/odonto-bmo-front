import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray, pageItems, type Page } from "@/lib/collections";

export interface FinancialEntry {
  id: string;
  clinic_id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount_cents: number;
  due_at?: string | null;
  occurred_at?: string | null;
  status: "pending" | "paid" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  revenue_received_cents: number;
  expenses_paid_cents: number;
  pending_receivables_cents: number;
  net_cents: number;
  overdue_count: number;
  recent_entries: FinancialEntry[];
}

export interface FinancialFilters {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface FinancialEntryInput {
  type: "income" | "expense";
  category: string;
  description: string;
  amount_cents: number;
  due_at?: string;
  occurred_at?: string;
  status: "pending" | "paid" | "cancelled";
  notes?: string;
}

export function useFinancialSummaryQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["financial-summary", activeClinicId],
    queryFn: async () => {
      const response = await apiRequest<FinancialSummary>("/financial/summary", { clinic: true });
      return {
        ...response,
        recent_entries: ensureArray(response.recent_entries),
      };
    },
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useFinancialEntriesQuery(filters: FinancialFilters) {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["financial-entries", activeClinicId, filters],
    queryFn: async () =>
      pageItems(
        await apiRequest<Page<FinancialEntry>>("/financial/entries", {
          clinic: true,
          query: {
            type: filters.type,
            status: filters.status,
            date_from: filters.dateFrom,
            date_to: filters.dateTo,
          },
        }),
      ),
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

function invalidateFinancialQueries(queryClient: ReturnType<typeof useQueryClient>, activeClinicId: string | null) {
  void queryClient.invalidateQueries({ queryKey: ["financial-summary", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["financial-entries", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["reports-overview", activeClinicId] });
}

export function useCreateFinancialEntryMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: FinancialEntryInput) =>
      apiRequest<FinancialEntry>("/financial/entries", {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateFinancialQueries(queryClient, activeClinicId),
  });
}

export function useUpdateFinancialEntryMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: FinancialEntryInput }) =>
      apiRequest<FinancialEntry>(`/financial/entries/${entryId}`, {
        clinic: true,
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateFinancialQueries(queryClient, activeClinicId),
  });
}
