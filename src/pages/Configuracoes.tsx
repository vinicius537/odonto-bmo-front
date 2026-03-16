import { useEffect, useMemo, useState } from "react";
import { Building2, Clock3, PencilLine, Users } from "lucide-react";

import { InfoTooltip } from "@/components/InfoTooltip";
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
  type Clinic,
  type ClinicSettings,
  type ClinicUpsertInput,
  type ClinicUser,
} from "@/features/clinics/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import {
  digitsOnly,
  formatCNPJ,
  formatPhoneBR,
  isValidBrazilPhone,
  isValidCNPJ,
  normalizeBrazilPhoneDigits,
} from "@/lib/masks";
import { pushNotification } from "@/lib/notifications";
import { translateGenericStatus, translateUserRole } from "@/lib/status-labels";

const roleStyles: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  doutor: "bg-success/10 text-success",
  secretaria: "bg-warning/10 text-warning",
};

const DAY_OPTIONS = [
  { key: "seg", label: "Segunda-feira" },
  { key: "ter", label: "Terça-feira" },
  { key: "qua", label: "Quarta-feira" },
  { key: "qui", label: "Quinta-feira" },
  { key: "sex", label: "Sexta-feira" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
] as const;

type DayKey = (typeof DAY_OPTIONS)[number]["key"];

interface DaySchedule {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

type WorkSchedule = Record<DayKey, DaySchedule>;

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

function normalizeWorkSchedule(settings?: ClinicSettings): WorkSchedule {
  const startTime = typeof settings?.start_time === "string" ? settings.start_time : "08:00";
  const endTime = typeof settings?.end_time === "string" ? settings.end_time : "18:00";
  const workDays = Array.isArray(settings?.work_days) ? settings.work_days.map(String) : ["seg", "ter", "qua", "qui", "sex"];
  const rawSchedule = settings?.work_schedule;

  return DAY_OPTIONS.reduce((schedule, day) => {
    const currentDay =
      rawSchedule && typeof rawSchedule === "object" && day.key in rawSchedule
        ? rawSchedule[day.key]
        : undefined;

    schedule[day.key] = {
      enabled:
        typeof currentDay?.enabled === "boolean" ? currentDay.enabled : workDays.includes(day.key),
      start_time:
        typeof currentDay?.start_time === "string" && currentDay.start_time
          ? currentDay.start_time
          : startTime,
      end_time:
        typeof currentDay?.end_time === "string" && currentDay.end_time
          ? currentDay.end_time
          : endTime,
    };

    return schedule;
  }, {} as WorkSchedule);
}

function normalizeClinicForm(settings?: ClinicSettings): ClinicSettings {
  const startTime = typeof settings?.start_time === "string" ? settings.start_time : "08:00";
  const endTime = typeof settings?.end_time === "string" ? settings.end_time : "18:00";
  const workSchedule = normalizeWorkSchedule({
    ...settings,
    start_time: startTime,
    end_time: endTime,
  });

  return {
    ...settings,
    start_time: startTime,
    end_time: endTime,
    work_days: DAY_OPTIONS.filter((day) => workSchedule[day.key].enabled).map((day) => day.key),
    slot_interval_minutes:
      typeof settings?.slot_interval_minutes === "number" ? settings.slot_interval_minutes : 30,
    work_schedule: workSchedule,
  };
}

const Configuracoes = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ClinicUpsertInput>(emptyClinicForm);
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);
  const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([]);
  const [isLoadingClinic, setIsLoadingClinic] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { activeClinicId, activeMembership } = useAuth();

  useEffect(() => {
    if (!activeClinicId) {
      setActiveClinic(null);
      setClinicUsers([]);
      setIsLoadingClinic(false);
      setIsLoadingUsers(false);
      return;
    }

    let cancelled = false;

    const loadClinicData = async () => {
      setIsLoadingClinic(true);
      setIsLoadingUsers(true);

      try {
        const [clinicResponse, usersResponse] = await Promise.all([
          apiRequest<Clinic>(`/clinics/${activeClinicId}`),
          apiRequest<ClinicUser[] | null>("/clinic-users", { clinic: true }),
        ]);

        if (cancelled) {
          return;
        }

        setActiveClinic({
          ...clinicResponse,
          settings: clinicResponse.settings ?? {},
        });
        setClinicUsers(ensureArray(usersResponse));
      } catch {
        if (!cancelled) {
          setActiveClinic(null);
          setClinicUsers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingClinic(false);
          setIsLoadingUsers(false);
        }
      }
    };

    void loadClinicData();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId]);

  useEffect(() => {
    if (activeClinic && !dialogOpen) {
      setForm({
        name: activeClinic.name,
        timezone: activeClinic.timezone,
        cnpj: formatCNPJ(activeClinic.cnpj ?? ""),
        phone: formatPhoneBR(activeClinic.phone ?? ""),
        email: activeClinic.email ?? "",
        address: activeClinic.address ?? "",
        website: activeClinic.website ?? "",
        settings: normalizeClinicForm(activeClinic.settings),
      });
    }
  }, [activeClinic, dialogOpen]);

  const clinicSettings = useMemo(() => normalizeClinicForm(activeClinic?.settings), [activeClinic?.settings]);
  const workSchedule = useMemo(() => normalizeWorkSchedule(form.settings), [form.settings]);

  const updateSettings = (nextSettings: ClinicSettings) => {
    setForm((current) => ({
      ...current,
      settings: normalizeClinicForm(nextSettings),
    }));
  };

  const updateDaySchedule = (day: DayKey, patch: Partial<DaySchedule>) => {
    const currentSettings = normalizeClinicForm(form.settings);
    const currentSchedule = normalizeWorkSchedule(currentSettings);
    const nextSchedule: WorkSchedule = {
      ...currentSchedule,
      [day]: {
        ...currentSchedule[day],
        ...patch,
      },
    };

    updateSettings({
      ...currentSettings,
      work_days: DAY_OPTIONS.filter((item) => nextSchedule[item.key].enabled).map((item) => item.key),
      work_schedule: nextSchedule,
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const cnpj = digitsOnly(form.cnpj);
    const phone = normalizeBrazilPhoneDigits(form.phone);

    if (cnpj && !isValidCNPJ(cnpj)) {
      toast({
        title: "CNPJ inválido",
        description: "Informe um CNPJ com 14 dígitos válidos para salvar as configurações.",
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
      if (!activeClinicId) {
        return;
      }

      setIsSaving(true);
      const normalizedSettings = normalizeClinicForm(form.settings);
      const updatedClinic = await apiRequest<Clinic>(`/clinics/${activeClinicId}`, {
        method: "PATCH",
        body: {
          ...form,
          name: form.name.trim(),
          cnpj: cnpj || undefined,
          phone: phone || undefined,
          email: form.email?.trim() || undefined,
          address: form.address?.trim() || undefined,
          website: form.website?.trim() || undefined,
          settings: normalizedSettings,
        },
      });
      setActiveClinic({
        ...updatedClinic,
        settings: updatedClinic.settings ?? {},
      });
      pushNotification({
        title: "Configurações atualizadas",
        description: `As preferências operacionais da clínica ${updatedClinic.name} foram salvas.`,
        level: "success",
      });
      toast({ title: "Clínica atualizada", description: "As configurações foram salvas com sucesso." });
      setDialogOpen(false);
    } catch (error) {
      pushNotification({
        title: "Falha ao salvar configurações",
        description: error instanceof Error ? error.message : "Não foi possível atualizar a clínica agora.",
        level: "error",
      });
      toast({
        title: "Falha ao salvar configurações",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingClinic || isLoadingUsers) {
    return <div className="animate-fade-in text-sm text-muted-foreground">Carregando configurações reais da clínica...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Configurações</h1>
            <InfoTooltip content="Reúne os dados principais da clínica ativa, horários da agenda e a equipe vinculada ao contexto atual." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Contexto ativo, agenda operacional e equipe sincronizados com o backend.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setDialogOpen(true)} disabled={!activeClinicId}>
          <PencilLine className="h-4 w-4" />
          Editar clínica
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">{activeClinic?.name ?? activeMembership?.clinic_name ?? "Clínica ativa"}</h2>
            <p className="text-sm text-muted-foreground">Dados retornados pela API para a clínica selecionada.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">{activeClinic?.timezone ?? "Não informado"}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Intervalo da agenda</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">
              {typeof clinicSettings.slot_interval_minutes === "number"
                ? `${clinicSettings.slot_interval_minutes} minutos`
                : "Não informado"}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">CNPJ</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">{activeClinic?.cnpj ? formatCNPJ(activeClinic.cnpj) : "Não informado"}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Telefone</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">{activeClinic?.phone ? formatPhoneBR(activeClinic.phone) : "Não informado"}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">{activeClinic?.email || "Não informado"}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Website</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">{activeClinic?.website || "Não informado"}</div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Endereço</label>
            <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">{activeClinic?.address || "Não informado"}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">Dias e horários de atendimento</h2>
              <InfoTooltip content="Cada dia pode ser ativado ou desativado e receber uma faixa horária própria de funcionamento." />
            </div>
            <p className="text-sm text-muted-foreground">Horários efetivos usados para orientar o funcionamento operacional da clínica.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DAY_OPTIONS.map((day) => {
            const schedule = normalizeWorkSchedule(clinicSettings)[day.key];
            return (
              <div key={day.key} className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{day.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.enabled ? `${schedule.start_time} às ${schedule.end_time}` : "Fechado"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      schedule.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {schedule.enabled ? "aberto" : "fechado"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Equipe da clínica</h2>
            <p className="text-sm text-muted-foreground">Usuários vinculados ao contexto ativo.</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium text-muted-foreground">Nome</th>
                <th className="pb-3 font-medium text-muted-foreground">Perfil</th>
                <th className="pb-3 font-medium text-muted-foreground">E-mail</th>
                <th className="pb-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clinicUsers.map((user) => (
                <tr key={user.user_id}>
                  <td className="py-3 font-medium">{user.name}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleStyles[user.role] ?? "bg-muted text-muted-foreground"}`}>
                      {translateUserRole(user.role)}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{user.email}</td>
                  <td className="py-3 text-muted-foreground">{translateGenericStatus(user.status)}</td>
                </tr>
              ))}
              {clinicUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado para esta clínica.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar clínica</DialogTitle>
            <DialogDescription>Atualize os dados reais da clínica ativa e a configuração operacional da agenda.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
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
                  <InfoTooltip content="Use o CNPJ oficial da clínica. São esperados 14 dígitos com máscara automática." />
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
                  <InfoTooltip content="Informe o telefone principal com DDD. São aceitos 10 ou 11 dígitos." />
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
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Início padrão</span>
                  <InfoTooltip content="Hora base sugerida para dias novos ou dias ainda não personalizados." />
                </div>
                <Input
                  type="time"
                  value={normalizeClinicForm(form.settings).start_time ?? ""}
                  onChange={(event) =>
                    updateSettings({
                      ...normalizeClinicForm(form.settings),
                      start_time: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Fim padrão</span>
                  <InfoTooltip content="Hora final padrão para novos dias ou para dias sem horário específico." />
                </div>
                <Input
                  type="time"
                  value={normalizeClinicForm(form.settings).end_time ?? ""}
                  onChange={(event) =>
                    updateSettings({
                      ...normalizeClinicForm(form.settings),
                      end_time: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Intervalo</span>
                  <InfoTooltip content="Define o intervalo padrão entre horários da agenda em minutos." />
                </div>
                <Input
                  type="number"
                  min="5"
                  value={String(normalizeClinicForm(form.settings).slot_interval_minutes ?? 30)}
                  onChange={(event) =>
                    updateSettings({
                      ...normalizeClinicForm(form.settings),
                      slot_interval_minutes: Number(event.target.value) || 30,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold">Dias e horários de atendimento</h3>
                <InfoTooltip content="Ative apenas os dias em que a clínica funciona e configure uma faixa horária para cada um deles." />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {DAY_OPTIONS.map((day) => {
                  const schedule = workSchedule[day.key];
                  return (
                    <div key={day.key} className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{day.label}</p>
                          <p className="text-xs text-muted-foreground">Defina se a clínica atende neste dia e em qual faixa horária.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateDaySchedule(day.key, { enabled: !schedule.enabled })}
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                            schedule.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {schedule.enabled ? "Aberto" : "Fechado"}
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Abre às</label>
                          <Input
                            type="time"
                            value={schedule.start_time}
                            disabled={!schedule.enabled}
                            onChange={(event) => updateDaySchedule(day.key, { start_time: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Fecha às</label>
                          <Input
                            type="time"
                            value={schedule.end_time}
                            disabled={!schedule.enabled}
                            onChange={(event) => updateDaySchedule(day.key, { end_time: event.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar configurações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Configuracoes;
