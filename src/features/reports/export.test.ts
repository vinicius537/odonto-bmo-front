import { describe, expect, it } from "vitest";

import type { ReportsOverview } from "@/features/reports/api";
import { buildReportExportRows, filterReportsOverview, toCsv } from "@/features/reports/export";

const overview: ReportsOverview = {
  appointments_by_status: [{ label: "confirmadas", count: 8 }],
  messages_by_status: [{ label: "entregues", count: 5 }],
  financial_by_type: [{ label: "receitas", count: 2, total_amount_cents: 150000 }],
  top_procedures: [{ name: "Limpeza", count: 4 }],
  low_stock_items: [{ item_id: "1", name: "Luva", quantity: 3, minimum_quantity: 10 }],
};

describe("reports export", () => {
  it("filtra secoes e busca textual", () => {
    const filtered = filterReportsOverview(overview, {
      search: "luva",
      sections: {
        appointments: true,
        messages: true,
        financial: true,
        procedures: true,
        low_stock: true,
      },
    });

    expect(filtered.low_stock_items).toHaveLength(1);
    expect(filtered.appointments_by_status).toHaveLength(0);
    expect(filtered.top_procedures).toHaveLength(0);
  });

  it("gera linhas exportaveis e csv", () => {
    const rows = buildReportExportRows(overview);
    const csv = toCsv(rows);

    expect(rows).toHaveLength(5);
    expect(csv).toContain("secao,rotulo,valor,detalhes");
    expect(csv).toContain("estoque_baixo,Luva,3,minimo 10");
  });
});
