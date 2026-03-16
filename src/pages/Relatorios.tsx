import { useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, DollarSign, Download, MessageCircle, PackageSearch, Search, Stethoscope } from "lucide-react";

import { InfoTooltip } from "@/components/InfoTooltip";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/use-auth";
import type { ReportsOverview } from "@/features/reports/api";
import { buildReportExportRows, filterReportsOverview, toCsv, type ReportSectionKey } from "@/features/reports/export";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { pushNotification } from "@/lib/notifications";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const Relatorios = () => {
  const { activeClinicId, status } = useAuth();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [sections, setSections] = useState<Record<ReportSectionKey, boolean>>({
    appointments: true,
    messages: true,
    financial: true,
    procedures: true,
    low_stock: true,
  });

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setData(null);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    let cancelled = false;

    const loadReports = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const response = await apiRequest<ReportsOverview>("/reports/overview", { clinic: true });
        if (!cancelled) {
          setData({
            appointments_by_status: ensureArray(response.appointments_by_status),
            messages_by_status: ensureArray(response.messages_by_status),
            financial_by_type: ensureArray(response.financial_by_type),
            top_procedures: ensureArray(response.top_procedures),
            low_stock_items: ensureArray(response.low_stock_items),
          });
        }
      } catch {
        if (!cancelled) {
          setIsError(true);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, status]);

  const filteredData = useMemo(() => {
    if (!data) {
      return null;
    }

    return filterReportsOverview(data, { search, sections });
  }, [data, search, sections]);

  const { appointmentTotal, messageTotal, financialTotal, lowStockTotal } = useMemo(() => {
    return {
      appointmentTotal: filteredData?.appointments_by_status.reduce((total, item) => total + item.count, 0) ?? 0,
      messageTotal: filteredData?.messages_by_status.reduce((total, item) => total + item.count, 0) ?? 0,
      financialTotal: filteredData?.financial_by_type.reduce((total, item) => total + item.total_amount_cents, 0) ?? 0,
      lowStockTotal: filteredData?.low_stock_items.length ?? 0,
    };
  }, [filteredData]);

  const toggleSection = (section: ReportSectionKey) => {
    setSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const resetFilters = () => {
    setSearch("");
    setSections({
      appointments: true,
      messages: true,
      financial: true,
      procedures: true,
      low_stock: true,
    });
  };

  const downloadText = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!filteredData) {
      return;
    }
    downloadText(toCsv(buildReportExportRows(filteredData)), "relatorios-odonto-bmo.csv", "text/csv;charset=utf-8");
    pushNotification({
      title: "Relatório exportado",
      description: "Foi gerado um arquivo CSV com os dados filtrados do relatório.",
      level: "info",
    });
  };

  const handleExportJson = () => {
    if (!filteredData) {
      return;
    }
    downloadText(JSON.stringify(filteredData, null, 2), "relatorios-odonto-bmo.json", "application/json;charset=utf-8");
    pushNotification({
      title: "Relatório exportado",
      description: "Foi gerado um arquivo JSON com os dados filtrados do relatório.",
      level: "info",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Relatórios</h1>
          <InfoTooltip content="Escolha as seções que deseja analisar, filtre os dados e exporte o resultado em CSV ou JSON." />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidados operacionais produzidos diretamente pelos endpoints de relatório do backend.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filtrar por nome, status, procedimento ou item..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={!filteredData}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportJson} disabled={!filteredData}>
              <Download className="h-4 w-4" />
              Exportar JSON
            </Button>
            <Button variant="ghost" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "appointments", label: "Consultas" },
            { key: "messages", label: "Mensagens" },
            { key: "financial", label: "Financeiro" },
            { key: "procedures", label: "Procedimentos" },
            { key: "low_stock", label: "Estoque baixo" },
          ].map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => toggleSection(section.key as ReportSectionKey)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                sections[section.key as ReportSectionKey]
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Consultas mapeadas" value={String(appointmentTotal)} icon={ClipboardList} />
        <StatCard title="Mensagens mapeadas" value={String(messageTotal)} icon={MessageCircle} />
        <StatCard title="Volume financeiro" value={formatCurrency(financialTotal)} icon={DollarSign} />
        <StatCard title="Itens em alerta" value={String(lowStockTotal)} icon={PackageSearch} />
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-card">Carregando relatórios...</div>
      ) : isError || !filteredData ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-card">
          Não foi possível carregar os relatórios agora.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-xl border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Consultas por status</h2>
            </div>
            <div className="space-y-3">
              {filteredData.appointments_by_status.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
              {filteredData.appointments_by_status.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado de consultas encontrado.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Mensagens por status</h2>
            </div>
            <div className="space-y-3">
              {filteredData.messages_by_status.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
              {filteredData.messages_by_status.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado de mensagens encontrado.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Financeiro por tipo</h2>
            </div>
            <div className="space-y-3">
              {filteredData.financial_by_type.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/20 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.count} lançamentos</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(item.total_amount_cents)}</p>
                </div>
              ))}
              {filteredData.financial_by_type.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado financeiro encontrado.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Procedimentos mais frequentes</h2>
            </div>
            <div className="space-y-3">
              {filteredData.top_procedures.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
              {filteredData.top_procedures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum procedimento encontrado.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-card xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Itens com estoque baixo</h2>
            </div>
            <div className="space-y-3">
              {filteredData.low_stock_items.map((item) => (
                <div key={item.item_id} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.quantity} / minimo {item.minimum_quantity}
                  </span>
                </div>
              ))}
              {filteredData.low_stock_items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item em alerta no momento.</p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
