import { useEffect, useMemo, useState } from "react";
import { Boxes, PackagePlus, TriangleAlert } from "lucide-react";

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
import {
  type InventoryItem,
  type InventoryItemInput,
  type InventoryMovementInput,
  type InventoryMovement,
  type InventorySummary,
} from "@/features/inventory/api";
import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { formatDateValue } from "@/lib/date";

const emptyItem: InventoryItemInput = {
  name: "",
  sku: "",
  category: "",
  unit: "un",
  quantity: 0,
  minimum_quantity: 0,
  location: "",
  notes: "",
};

const emptyMovement: InventoryMovementInput = {
  kind: "in",
  quantity: 1,
  reason: "",
  notes: "",
};

function toItemState(item: InventoryItem): InventoryItemInput {
  return {
    name: item.name,
    sku: item.sku ?? "",
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    minimum_quantity: item.minimum_quantity,
    location: item.location ?? "",
    notes: item.notes ?? "",
  };
}

const Estoque = () => {
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<InventoryItemInput>(emptyItem);
  const [movementForm, setMovementForm] = useState<InventoryMovementInput>(emptyMovement);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isSavingMovement, setIsSavingMovement] = useState(false);
  const { activeClinicId, status } = useAuth();

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setSummary(null);
      setItems([]);
      setMovements([]);
      setIsLoadingSummary(false);
      setIsLoadingItems(false);
      return;
    }

    let cancelled = false;

    const loadInventoryData = async () => {
      setIsLoadingSummary(true);
      setIsLoadingItems(true);

      try {
        const [summaryResponse, itemsResponse] = await Promise.all([
          apiRequest<InventorySummary>("/inventory/summary", { clinic: true }),
          apiRequest<InventoryItem[] | null>("/inventory/items", { clinic: true }),
        ]);

        if (cancelled) {
          return;
        }

        setSummary({
          ...summaryResponse,
          recent_movements: ensureArray(summaryResponse.recent_movements),
        });
        setItems(ensureArray(itemsResponse));
      } catch {
        if (!cancelled) {
          setSummary(null);
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSummary(false);
          setIsLoadingItems(false);
        }
      }
    };

    void loadInventoryData();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, status]);

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId || !movementItem?.id) {
      setMovements([]);
      return;
    }

    let cancelled = false;

    const loadMovements = async () => {
      try {
        const response = await apiRequest<InventoryMovement[] | null>(`/inventory/items/${movementItem.id}/movements`, {
          clinic: true,
        });
        if (!cancelled) {
          setMovements(ensureArray(response));
        }
      } catch {
        if (!cancelled) {
          setMovements([]);
        }
      }
    };

    void loadMovements();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, movementItem?.id, status]);

  const stats = useMemo(
    () => ({
      totalItems: summary?.total_items ?? 0,
      lowStock: summary?.low_stock_count ?? 0,
      zeroStock: summary?.zero_stock_count ?? 0,
      recentMovements: summary?.recent_movements.length ?? 0,
    }),
    [summary],
  );

  const openCreateDialog = () => {
    setEditingItem(null);
    setItemForm(emptyItem);
    setItemDialogOpen(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm(toItemState(item));
    setItemDialogOpen(true);
  };

  const openMovementDialog = (item: InventoryItem) => {
    setMovementItem(item);
    setMovementForm(emptyMovement);
    setMovementDialogOpen(true);
  };

  const handleSaveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSavingItem(true);
      if (editingItem) {
        await apiRequest<InventoryItem>(`/inventory/items/${editingItem.id}`, {
          clinic: true,
          method: "PATCH",
          body: itemForm,
        });
        toast({ title: "Item atualizado", description: "O estoque foi atualizado com sucesso." });
      } else {
        await apiRequest<InventoryItem>("/inventory/items", {
          clinic: true,
          method: "POST",
          body: itemForm,
        });
        toast({ title: "Item criado", description: "O estoque foi atualizado com sucesso." });
      }
      const [summaryResponse, itemsResponse] = await Promise.all([
        apiRequest<InventorySummary>("/inventory/summary", { clinic: true }),
        apiRequest<InventoryItem[] | null>("/inventory/items", { clinic: true }),
      ]);
      setSummary({
        ...summaryResponse,
        recent_movements: ensureArray(summaryResponse.recent_movements),
      });
      setItems(ensureArray(itemsResponse));
      setItemDialogOpen(false);
    } catch (error) {
      toast({
        title: "Falha ao salvar item",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleSaveMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movementItem) {
      return;
    }
    try {
      setIsSavingMovement(true);
      await apiRequest<InventoryMovement>(`/inventory/items/${movementItem.id}/movements`, {
        clinic: true,
        method: "POST",
        body: movementForm,
      });
      const [summaryResponse, itemsResponse, movementsResponse] = await Promise.all([
        apiRequest<InventorySummary>("/inventory/summary", { clinic: true }),
        apiRequest<InventoryItem[] | null>("/inventory/items", { clinic: true }),
        apiRequest<InventoryMovement[] | null>(`/inventory/items/${movementItem.id}/movements`, { clinic: true }),
      ]);
      setSummary({
        ...summaryResponse,
        recent_movements: ensureArray(summaryResponse.recent_movements),
      });
      setItems(ensureArray(itemsResponse));
      setMovements(ensureArray(movementsResponse));
      toast({ title: "Movimentacao registrada", description: "O saldo do item foi atualizado." });
      setMovementDialogOpen(false);
    } catch (error) {
      toast({
        title: "Falha ao registrar movimentacao",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingMovement(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Estoque</h1>
            <InfoTooltip content="Cadastre materiais, acompanhe saldo, defina estoque mínimo e registre entradas, saídas e ajustes." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Materiais e movimentacoes consumidos diretamente da API.</p>
        </div>
        <Button
          className="gap-2"
          onClick={openCreateDialog}
          title="Cadastre um novo item do estoque com nome, SKU, unidade e saldo inicial."
        >
          <PackagePlus className="h-4 w-4" />
          Novo item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Itens cadastrados" value={String(stats.totalItems)} icon={Boxes} />
        <StatCard title="Estoque baixo" value={String(stats.lowStock)} icon={TriangleAlert} />
        <StatCard title="Sem saldo" value={String(stats.zeroStock)} icon={TriangleAlert} />
        <StatCard title="Movimentacoes recentes" value={String(stats.recentMovements)} icon={PackagePlus} />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg font-semibold">Itens do estoque</h2>

        {isLoadingSummary || isLoadingItems ? (
          <p className="text-sm text-muted-foreground">Carregando estoque...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Item</th>
                  <th className="pb-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="pb-3 font-medium text-muted-foreground">Saldo</th>
                  <th className="pb-3 font-medium text-muted-foreground">Minimo</th>
                  <th className="pb-3 font-medium text-muted-foreground">Local</th>
                  <th className="pb-3 font-medium text-muted-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3">
                      <button type="button" className="text-left" onClick={() => openEditDialog(item)}>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku || item.unit}</p>
                      </button>
                    </td>
                    <td className="py-3 text-muted-foreground">{item.category}</td>
                    <td className="py-3 font-medium">{item.quantity} {item.unit}</td>
                    <td className="py-3 text-muted-foreground">{item.minimum_quantity} {item.unit}</td>
                    <td className="py-3 text-muted-foreground">{item.location || "Não informado"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                          Editar
                        </Button>
                        <Button size="sm" onClick={() => openMovementDialog(item)}>
                          Movimentar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg font-semibold">Movimentacoes recentes</h2>
        {summary?.recent_movements.length ? (
          <div className="space-y-3">
            {summary.recent_movements.map((movement) => (
              <div key={movement.id} className="rounded-lg bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{movement.item_name}</p>
                    <p className="text-sm text-muted-foreground">{movement.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateValue(movement.created_at, "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {movement.kind} {movement.quantity}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma movimentacao registrada.</p>
        )}
      </section>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar item" : "Novo item"}</DialogTitle>
            <DialogDescription>Cadastre ou atualize um item do estoque da clínica.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>SKU</span>
                  <InfoTooltip content="SKU é o código interno do item. Ele ajuda a localizar e diferenciar materiais parecidos." />
                </div>
                <Input value={itemForm.sku ?? ""} onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value }))} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Categoria</span>
                  <InfoTooltip content="Use uma categoria para agrupar materiais, como descartáveis, instrumentais ou limpeza." />
                </div>
                <Input value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} required />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Unidade</span>
                  <InfoTooltip content="Informe como o item é contado, por exemplo: un, cx, ml, pct ou kit." />
                </div>
                <Input value={itemForm.unit} onChange={(event) => setItemForm((current) => ({ ...current, unit: event.target.value }))} required />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Local</span>
                  <InfoTooltip content="Indique onde o material fica guardado, como armário, sala, gaveta ou depósito." />
                </div>
                <Input value={itemForm.location ?? ""} onChange={(event) => setItemForm((current) => ({ ...current, location: event.target.value }))} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Quantidade</span>
                  <InfoTooltip content="Saldo atual disponível no estoque no momento do cadastro ou da edição." />
                </div>
                <Input
                  type="number"
                  min="0"
                  value={String(itemForm.quantity)}
                  onChange={(event) => setItemForm((current) => ({ ...current, quantity: Number(event.target.value) || 0 }))}
                  required
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Mínimo</span>
                  <InfoTooltip content="Quantidade mínima desejada antes de o item entrar em alerta de reposição." />
                </div>
                <Input
                  type="number"
                  min="0"
                  value={String(itemForm.minimum_quantity)}
                  onChange={(event) => setItemForm((current) => ({ ...current, minimum_quantity: Number(event.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Observações</span>
                  <InfoTooltip content="Use este campo para lote, fornecedor, validade ou qualquer detalhe importante do material." />
                </div>
                <textarea
                  value={itemForm.notes ?? ""}
                  onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingItem}>
                {isSavingItem ? "Salvando..." : editingItem ? "Salvar alterações" : "Criar item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentar item</DialogTitle>
            <DialogDescription>Atualize o saldo do item usando a movimentação registrada na API.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMovement} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Item</label>
              <Input value={movementItem?.name ?? ""} disabled />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Tipo</span>
                  <InfoTooltip content="Entrada aumenta o saldo, saída reduz o saldo e ajuste corrige divergências de inventário." />
                </div>
                <select
                  value={movementForm.kind}
                  onChange={(event) => setMovementForm((current) => ({ ...current, kind: event.target.value as InventoryMovementInput["kind"] }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="in">Entrada</option>
                  <option value="out">Saida</option>
                  <option value="adjustment">Ajuste</option>
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Quantidade</span>
                  <InfoTooltip content="Informe quantas unidades serão movimentadas nesta operação." />
                </div>
                <Input
                  type="number"
                  min="1"
                  value={String(movementForm.quantity)}
                  onChange={(event) => setMovementForm((current) => ({ ...current, quantity: Number(event.target.value) || 1 }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Motivo</span>
                  <InfoTooltip content="Descreva a razão da movimentação, como compra, consumo clínico, perda ou acerto de estoque." />
                </div>
                <Input value={movementForm.reason} onChange={(event) => setMovementForm((current) => ({ ...current, reason: event.target.value }))} required />
              </div>
              <div className="md:col-span-2">
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Observações</span>
                  <InfoTooltip content="Use para registrar detalhes adicionais, como número da nota, lote ou contexto do ajuste." />
                </div>
                <textarea
                  value={movementForm.notes ?? ""}
                  onChange={(event) => setMovementForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {movements.length > 0 ? (
              <div className="rounded-lg bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Últimas movimentações deste item</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {movements.slice(0, 4).map((movement) => (
                    <div key={movement.id}>
                      {movement.kind} {movement.quantity} - {movement.reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMovementDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingMovement}>
                {isSavingMovement ? "Salvando..." : "Registrar movimentação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estoque;
