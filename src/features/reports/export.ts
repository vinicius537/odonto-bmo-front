import type { ReportsOverview } from "@/features/reports/api";

export type ReportSectionKey = "appointments" | "messages" | "financial" | "procedures" | "low_stock";

export interface ReportFilterState {
  search: string;
  sections: Record<ReportSectionKey, boolean>;
}

export interface ReportExportRow {
  section: string;
  label: string;
  value: string;
  details?: string;
}

function includesSearch(values: Array<string | number | undefined>, search: string) {
  if (!search.trim()) {
    return true;
  }

  const normalizedSearch = search.trim().toLowerCase();
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
}

export function filterReportsOverview(data: ReportsOverview, filters: ReportFilterState): ReportsOverview {
  const { search, sections } = filters;

  return {
    appointments_by_status: sections.appointments
      ? data.appointments_by_status.filter((item) => includesSearch([item.label, item.count], search))
      : [],
    messages_by_status: sections.messages
      ? data.messages_by_status.filter((item) => includesSearch([item.label, item.count], search))
      : [],
    financial_by_type: sections.financial
      ? data.financial_by_type.filter((item) => includesSearch([item.label, item.count, item.total_amount_cents], search))
      : [],
    top_procedures: sections.procedures
      ? data.top_procedures.filter((item) => includesSearch([item.name, item.count], search))
      : [],
    low_stock_items: sections.low_stock
      ? data.low_stock_items.filter((item) => includesSearch([item.name, item.quantity, item.minimum_quantity], search))
      : [],
  };
}

export function buildReportExportRows(data: ReportsOverview): ReportExportRow[] {
  return [
    ...data.appointments_by_status.map((item) => ({
      section: "consultas",
      label: item.label,
      value: String(item.count),
    })),
    ...data.messages_by_status.map((item) => ({
      section: "mensagens",
      label: item.label,
      value: String(item.count),
    })),
    ...data.financial_by_type.map((item) => ({
      section: "financeiro",
      label: item.label,
      value: String(item.total_amount_cents),
      details: `${item.count} lancamentos`,
    })),
    ...data.top_procedures.map((item) => ({
      section: "procedimentos",
      label: item.name,
      value: String(item.count),
    })),
    ...data.low_stock_items.map((item) => ({
      section: "estoque_baixo",
      label: item.name,
      value: String(item.quantity),
      details: `minimo ${item.minimum_quantity}`,
    })),
  ];
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export function toCsv(rows: ReportExportRow[]) {
  const header = ["secao", "rotulo", "valor", "detalhes"];
  const lines = rows.map((row) => [
    escapeCsv(row.section),
    escapeCsv(row.label),
    escapeCsv(row.value),
    escapeCsv(row.details ?? ""),
  ]);

  return [header.join(","), ...lines.map((line) => line.join(","))].join("\n");
}
