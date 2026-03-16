import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, MapPin, Plus, Settings2, Trash2 } from "lucide-react";

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
import { type Clinic, type ClinicUpsertInput } from "@/features/clinics/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { digitsOnly, formatCNPJ, formatPhoneBR, isValidBrazilPhone, isValidCNPJ, normalizeBrazilPhoneDigits } from "@/lib/masks";
import { loadStoredSession, normalizeActiveClinicId, saveStoredSession } from "@/lib/session";

const emptyClinicForm: ClinicUpsertInput = {
  name: "",
  timezone: "America/Fortaleza",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  settings: {
    start_time: "08:00",
    end_time: "18:00",
    work_days: ["seg", "ter", "qua", "qui", "sex"],
    slot_interval_minutes: 30,
  },
};

const Clinicas = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ClinicUpsertInput>(emptyClinicForm);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingClinicId, setDeletingClinicId] = useState<string | null>(null);
  const { activeClinicId, memberships, selectClinic } = useAuth();

  const loadClinics = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest<Clinic[] | null>("/clinics");
      setClinics(
        ensureArray(response).map((clinic) => ({
          ...clinic,
          settings: clinic.settings ?? {},
        })),
      );
    } catch {
      setClinics([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      setForm(emptyClinicForm);
    }
  }, [dialogOpen]);

  useEffect(() => {
    let cancelled = false;

    void loadClinics().catch(() => {
      if (!cancelled) {
        setClinics([]);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadClinics]);

  const stats = useMemo(() => {
    const withContact = clinics.filter((clinic) => Boolean(clinic.phone || clinic.email)).length;
    const withWebsite = clinics.filter((clinic) => Boolean(clinic.website)).length;
    return {
      total: clinics.length,
      linked: memberships.length,
      withContact,
      withWebsite,
    };
  }, [clinics, memberships.length]);

  const handleCreateClinic = async (event: React.FormEvent) => {
    event.preventDefault();

    const cnpj = digitsOnly(form.cnpj);
    const phone = normalizeBrazilPhoneDigits(form.phone);

    if (cnpj && !isValidCNPJ(cnpj)) {
      toast({
        title: "CNPJ inválido",
        description: "Informe um CNPJ com 14 dígitos válidos para cadastrar a clínica.",
        variant: "destructive",
      });
      return;
    }

    if (phone && !isValidBrazilPhone(phone)) {
      toast({
        title: "Telefone inválido",
        description: "Informe um telefone com DDD e 10 ou 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const clinic = await apiRequest<Clinic>("/clinics", {
        method: "POST",
        body: {
          ...form,
          name: form.name.trim(),
          cnpj: cnpj || undefined,
          phone: phone || undefined,
          email: form.email?.trim() || undefined,
          address: form.address?.trim() || undefined,
          website: form.website?.trim() || undefined,
        },
      });
      const currentSession = loadStoredSession();
      if (currentSession) {
        const alreadyLinked = currentSession.memberships.some((membership) => membership.clinic_id === clinic.id);
        const nextMemberships = alreadyLinked
          ? currentSession.memberships
          : [
              ...currentSession.memberships,
              {
                clinic_id: clinic.id,
                clinic_name: clinic.name,
                role: "admin",
                status: "active",
              },
            ];

        saveStoredSession({
          ...currentSession,
          memberships: nextMemberships,
          activeClinicId: currentSession.activeClinicId ?? clinic.id,
        });
      }

      await loadClinics();
      selectClinic(clinic.id);
      toast({
        title: "Clínica criada",
        description: "A nova clínica já foi adicionada ao sistema e ficou como ativa.",
      });
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Falha ao criar clínica",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClinic = async (clinic: Clinic) => {
    const confirmed = window.confirm(`Excluir a clínica "${clinic.name}"? Essa ação remove os dados vinculados a ela.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingClinicId(clinic.id);
      await apiRequest<void>(`/clinics/${clinic.id}`, {
        method: "DELETE",
      });
      const currentSession = loadStoredSession();
      if (currentSession) {
        const nextMemberships = currentSession.memberships.filter((membership) => membership.clinic_id !== clinic.id);
        saveStoredSession({
          ...currentSession,
          memberships: nextMemberships,
          activeClinicId: normalizeActiveClinicId(nextMemberships, currentSession.activeClinicId),
        });
      }

      await loadClinics();
      toast({
        title: "Clínica excluída",
        description: "A clínica foi removida do sistema com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Falha ao excluir clínica",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingClinicId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Clínicas</h1>
            <InfoTooltip content="Cadastre novas clínicas, altere a clínica em uso e remova unidades que não devem mais aparecer na conta." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as clínicas vinculadas à sua conta e altere o contexto ativo sem sair do sistema.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova clínica
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Clínicas listadas" value={String(stats.total)} icon={Building2} />
        <StatCard title="Vínculos ativos" value={String(stats.linked)} icon={CheckCircle2} />
        <StatCard title="Com contato" value={String(stats.withContact)} icon={Settings2} />
        <StatCard title="Com website" value={String(stats.withWebsite)} icon={MapPin} />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Lista de clínicas</h2>
          <span className="text-xs text-muted-foreground">{clinics.length} registros</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando clínicas...</p>
        ) : clinics.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma clínica retornada para a conta autenticada.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {clinics.map((clinic) => {
              const isActive = activeClinicId === clinic.id;
              const membership = memberships.find((item) => item.clinic_id === clinic.id);

              return (
                <div key={clinic.id} className="rounded-xl border bg-muted/20 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-lg font-semibold">{clinic.name}</h3>
                        {isActive ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            Ativa
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{clinic.timezone}</p>
                    </div>
                    <Button
                      variant={isActive ? "outline" : "default"}
                      onClick={() => selectClinic(clinic.id)}
                      disabled={isActive}
                    >
                      {isActive ? "Selecionada" : "Usar esta clinica"}
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Perfil</p>
                      <p className="mt-1 text-sm">{membership?.role ?? "Sem vínculo na sessão"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                      <p className="mt-1 text-sm">{membership?.status ?? "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">CNPJ</p>
                      <p className="mt-1 text-sm">{clinic.cnpj ? formatCNPJ(clinic.cnpj) : "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Telefone</p>
                      <p className="mt-1 text-sm">{clinic.phone ? formatPhoneBR(clinic.phone) : "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">E-mail</p>
                      <p className="mt-1 text-sm">{clinic.email || "Não informado"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Endereço</p>
                      <p className="mt-1 text-sm">{clinic.address || "Não informado"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Website</p>
                      <p className="mt-1 text-sm">{clinic.website || "Não informado"}</p>
                    </div>
                  </div>

                  {membership?.role === "admin" ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteClinic(clinic)}
                        disabled={deletingClinicId === clinic.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingClinicId === clinic.id ? "Excluindo..." : "Excluir clínica"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova clínica</DialogTitle>
            <DialogDescription>Cadastre uma nova clínica usando o endpoint real de criação do backend.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClinic} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Timezone</label>
                <Input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>CNPJ</span>
                  <InfoTooltip content="Use o CNPJ da clínica com 14 dígitos. A máscara é aplicada automaticamente." />
                </div>
                <Input
                  value={form.cnpj ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, cnpj: formatCNPJ(event.target.value) }))}
                  inputMode="numeric"
                  maxLength={18}
                  pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
                  placeholder="00.000.000/0000-00"
                  title="Informe um CNPJ válido com 14 dígitos."
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Telefone</span>
                  <InfoTooltip content="Informe o telefone principal da clínica com DDD. São esperados 10 ou 11 dígitos." />
                </div>
                <Input
                  value={form.phone ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, phone: formatPhoneBR(event.target.value) }))}
                  inputMode="tel"
                  maxLength={15}
                  pattern="\(\d{2}\)\s\d{4,5}-\d{4}"
                  placeholder="(00) 00000-0000"
                  title="Informe um telefone com DDD e 10 ou 11 dígitos."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">E-mail</label>
                <Input type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Endereço</label>
                <Input value={form.address ?? ""} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Website</label>
                <Input value={form.website ?? ""} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Criando..." : "Criar clínica"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clinicas;
