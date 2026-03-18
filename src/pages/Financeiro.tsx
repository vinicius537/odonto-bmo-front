import { useEffect, useMemo, useState } from "react";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, CreditCard, DollarSign, Plus } from "lucide-react";

import { InfoTooltip } from "@/components/InfoTooltip";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/use-auth";
import {
  type FinancialEntry,
  type FinancialEntryInput,
  type FinancialSummary,
} from "@/features/finance/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray, pageItems, type Page } from "@/lib/collections";
import { formatDateValue, toDateTimeLocalInput, toIsoDateTime } from "@/lib/date";
import { pushNotification } from "@/lib/notifications";

const emptyForm: FinancialEntryInput = {
  type: "income",
  category: "",
  description: "",
  amount_cents: 0,
  due_at: "",
  occurred_at: "",
  status: "pending",
  notes: "",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function toFormState(entry: FinancialEntry): FinancialEntryInput {
  return {
    type: entry.type,
    category: entry.category,
    description: entry.description,
    amount_cents: entry.amount_cents,
    due_at: toDateTimeLocalInput(entry.due_at),
    occurred_at: toDateTimeLocalInput(entry.occurred_at),
    status: entry.status,
    notes: entry.notes ?? "",
  };
}

const Financeiro = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState<FinancialEntryInput>(emptyForm);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { activeClinicId, status } = useAuth();

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setSummary(null);
      setEntries([]);
      setIsLoadingSummary(false);
      setIsLoadingEntries(false);
      return;
    }

    let cancelled = false;

    const loadFinancialData = async () => {
      setIsLoadingSummary(true);
      setIsLoadingEntries(true);

      try {
        const [summaryResponse, entriesResponse] = await Promise.all([
          apiRequest<FinancialSummary>("/financial/summary", { clinic: true }),
          apiRequest<Page<FinancialEntry>>("/financial/entries", {
            clinic: true,
            query: {
              type: typeFilter,
              status: statusFilter,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setSummary({
          ...summaryResponse,
          recent_entries: ensureArray(summaryResponse.recent_entries),
        });
        setEntries(pageItems(entriesResponse));
      } catch {
        if (!cancelled) {
          setSummary(null);
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSummary(false);
          setIsLoadingEntries(false);
        }
      }
    };

    void loadFinancialData();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, status, statusFilter, typeFilter]);

  const stats = useMemo(
    () => ({
      revenue: summary?.revenue_received_cents ?? 0,
      expenses: summary?.expenses_paid_cents ?? 0,
      pending: summary?.pending_receivables_cents ?? 0,
      overdue: summary?.overdue_count ?? 0,
    }),
    [summary],
  );

  const openCreateDialog = () => {
    setEditingEntry(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setForm(toFormState(entry));
    setDialogOpen(true);
  };

  const reloadFinancialData = async () => {
    const [summaryResponse, entriesResponse] = await Promise.all([
      apiRequest<FinancialSummary>("/financial/summary", { clinic: true }),
      apiRequest<Page<FinancialEntry>>("/financial/entries", {
        clinic: true,
        query: {
          type: typeFilter,
          status: statusFilter,
        },
      }),
    ]);

    setSummary({
      ...summaryResponse,
      recent_entries: ensureArray(summaryResponse.recent_entries),
    });
    setEntries(pageItems(entriesResponse));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSaving(true);

      const payload: FinancialEntryInput = {
        ...form,
        description: form.description.trim(),
        category: form.category.trim(),
        notes: form.notes?.trim() || undefined,
        due_at: toIsoDateTime(form.due_at),
        occurred_at: toIsoDateTime(form.occurred_at),
      };

      if (editingEntry) {
        await apiRequest<FinancialEntry>(`/financial/entries/${editingEntry.id}`, {
          clinic: true,
          method: "PATCH",
          body: payload,
        });
        toast({ title: "Lançamento atualizado", description: "O registro foi atualizado com sucesso." });
        pushNotification({
          title: "Lançamento atualizado",
          description: `O registro "${payload.description}" foi atualizado no financeiro.`,
          level: "success",
        });
      } else {
        await apiRequest<FinancialEntry>("/financial/entries", {
          clinic: true,
          method: "POST",
          body: payload,
        });
        toast({ title: "Lançamento criado", description: "O registro foi criado com sucesso." });
        pushNotification({
          title: "Lançamento criado",
          description: `O registro "${payload.description}" foi criado no financeiro.`,
          level: "success",
        });
      }

      await reloadFinancialData();
      setDialogOpen(false);
    } catch (error) {
      pushNotification({
        title: "Falha no financeiro",
        description: error instanceof Error ? error.message : "Não foi possível salvar o lançamento.",
        level: "error",
      });
      toast({
        title: "Falha ao salvar lançamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Financeiro</h1>
            <InfoTooltip content="Cadastre receitas e despesas, acompanhe vencimentos e monitore valores pagos e em atraso." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Receitas e despesas alimentadas pela API do backend.</p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Receita recebida" value={formatCurrency(stats.revenue)} icon={ArrowUpCircle} />
        <StatCard title="Despesas pagas" value={formatCurrency(stats.expenses)} icon={ArrowDownCircle} />
        <StatCard title="A receber" value={formatCurrency(stats.pending)} icon={DollarSign} />
        <StatCard title="Em atraso" value={String(stats.overdue)} icon={CreditCard} />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-lg font-semibold">Lançamentos</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {isLoadingSummary || isLoadingEntries ? (
          <p className="text-sm text-muted-foreground">Carregando financeiro...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado para os filtros atuais.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Descrição</th>
                  <th className="pb-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="pb-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Valor</th>
                  <th className="pb-3 font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => (
                  <tr key={entry.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEditDialog(entry)}>
                    <td className="py-3 font-medium">{entry.description}</td>
                    <td className="py-3 text-muted-foreground">{entry.category}</td>
                    <td className="py-3 text-muted-foreground">{entry.type === "income" ? "Receita" : "Despesa"}</td>
                    <td className="py-3 text-muted-foreground">{entry.status}</td>
                    <td className="py-3 font-medium">{formatCurrency(entry.amount_cents)}</td>
                    <td className="py-3 text-muted-foreground">
                      {formatDateValue(entry.occurred_at ?? entry.due_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription>Registre uma receita ou despesa diretamente no módulo financeiro.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tipo</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FinancialEntryInput["type"] }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FinancialEntryInput["status"] }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Descrição</label>
                <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Categoria</label>
                <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount_cents ? String(form.amount_cents / 100) : ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount_cents: Math.round(Number(event.target.value || 0) * 100),
                    }))
                  }
                  required
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Vencimento</span>
                  <InfoTooltip content="Use data e hora. O valor é convertido para o formato completo que a API espera." />
                </div>
                <Input
                  type="datetime-local"
                  value={form.due_at ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Ocorrência</span>
                  <InfoTooltip content="Preencha quando quiser registrar o momento real do pagamento ou da despesa." />
                </div>
                <Input
                  type="datetime-local"
                  value={form.occurred_at ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, occurred_at: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Observações</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : editingEntry ? "Salvar alterações" : "Criar lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financeiro;
