import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";

export interface ReportStatusStat {
  label: string;
  count: number;
}

export interface ReportFinancialStat {
  label: string;
  count: number;
  total_amount_cents: number;
}

export interface ReportProcedureStat {
  name: string;
  count: number;
}

export interface ReportLowStockItem {
  item_id: string;
  name: string;
  quantity: number;
  minimum_quantity: number;
}

export interface ReportsOverview {
  appointments_by_status: ReportStatusStat[];
  messages_by_status: ReportStatusStat[];
  financial_by_type: ReportFinancialStat[];
  top_procedures: ReportProcedureStat[];
  low_stock_items: ReportLowStockItem[];
}

export function useReportsOverviewQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["reports-overview", activeClinicId],
    queryFn: async () => {
      const response = await apiRequest<ReportsOverview>("/reports/overview", { clinic: true });
      return {
        appointments_by_status: ensureArray(response.appointments_by_status),
        messages_by_status: ensureArray(response.messages_by_status),
        financial_by_type: ensureArray(response.financial_by_type),
        top_procedures: ensureArray(response.top_procedures),
        low_stock_items: ensureArray(response.low_stock_items),
      };
    },
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}
