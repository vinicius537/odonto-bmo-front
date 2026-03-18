import { useEffect, useMemo, useState } from "react";
import { ptBR } from "date-fns/locale";
import { MessageCircle, Plus, Search } from "lucide-react";

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
import { type Patient, type PatientInput } from "@/features/patients/api";
import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray, pageItems, type Page } from "@/lib/collections";
import { formatDateValue, toDateInput, toIsoDate } from "@/lib/date";
import { formatPhoneBR, isValidBrazilPhone, normalizeBrazilPhoneDigits } from "@/lib/masks";
import { translatePatientStatus } from "@/lib/status-labels";

const emptyPatientForm: PatientInput = {
  name: "",
  email: "",
  phone: "",
  status: "ativo",
  history: "",
  observations: "",
  consents: [],
};

function formatDate(value?: string) {
  return formatDateValue(value, "dd/MM/yyyy", { locale: ptBR, fallback: "-" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const statusStyles: Record<string, string> = {
  ativo: "bg-success/10 text-success",
  "em tratamento": "bg-info/10 text-info",
  finalizado: "bg-muted text-muted-foreground",
};

const Pacientes = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientInput>(emptyPatientForm);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeClinicId, status } = useAuth();

  useEffect(() => {
    if (!dialogOpen) {
      setEditingPatient(null);
      setForm(emptyPatientForm);
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setPatients([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPatients = async () => {
      setIsLoading(true);

      try {
        const response = await apiRequest<Page<Patient>>("/patients", {
          clinic: true,
          query: { search },
        });

        if (!cancelled) {
          setPatients(
            pageItems(response).map((patient) => ({
              ...patient,
              consents: ensureArray(patient.consents),
              procedures_count: Number.isFinite(patient.procedures_count) ? patient.procedures_count : 0,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setPatients([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPatients();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, search, status]);

  const patientCountLabel = useMemo(() => {
    if (isLoading) {
      return "Carregando pacientes...";
    }
    return `${patients.length} pacientes encontrados`;
  }, [isLoading, patients.length]);

  const openCreateDialog = () => {
    setEditingPatient(null);
    setForm(emptyPatientForm);
    setDialogOpen(true);
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.name,
      email: patient.email ?? "",
      phone: formatPhoneBR(patient.phone),
      birth_date: toDateInput(patient.birth_date),
      status: patient.status,
      history: patient.history ?? "",
      observations: patient.observations ?? "",
      consents: patient.consents,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = normalizeBrazilPhoneDigits(form.phone);

    if (!isValidBrazilPhone(phone)) {
      toast({
        title: "Telefone inválido",
        description: "Informe o telefone do paciente com DDD e 10 ou 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        name: form.name.trim(),
        phone,
        birth_date: toIsoDate(form.birth_date),
        email: form.email?.trim() || undefined,
        history: form.history?.trim() || undefined,
        observations: form.observations?.trim() || undefined,
      };
      if (editingPatient) {
        await apiRequest<Patient>(`/patients/${editingPatient.id}`, {
          clinic: true,
          method: "PATCH",
          body: payload,
        });
        toast({ title: "Paciente atualizado", description: "Os dados foram salvos com sucesso." });
      } else {
        await apiRequest<Patient>("/patients", {
          clinic: true,
          method: "POST",
          body: payload,
        });
        toast({ title: "Paciente criado", description: "Cadastro realizado com sucesso." });
      }
      const refreshedPatients = await apiRequest<Page<Patient>>("/patients", {
        clinic: true,
        query: { search },
      });
      setPatients(
        pageItems(refreshedPatients).map((patient) => ({
          ...patient,
          consents: ensureArray(patient.consents),
          procedures_count: Number.isFinite(patient.procedures_count) ? patient.procedures_count : 0,
        })),
      );
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Falha ao salvar paciente",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitting = isSubmitting;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Pacientes</h1>
            <InfoTooltip content="Cadastre pacientes, mantenha o histórico clínico organizado e acesse rapidamente contato e status do atendimento." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{patientCountLabel}</p>
        </div>
        <Button className="gradient-primary gap-2 text-primary-foreground" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paciente</th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Telefone</th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Ultima Consulta</th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Proximo Retorno</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Proced.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => openEditDialog(patient)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(patient.name)}
                      </div>
                    <div>
                      <p className="text-sm font-medium">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.email || formatPhoneBR(patient.phone)}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-5 py-3.5 md:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{formatPhoneBR(patient.phone)}</span>
                    {isValidBrazilPhone(patient.phone) ? (
                      <a
                        href={`https://wa.me/55${normalizeBrazilPhoneDigits(patient.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="rounded p-1 text-success transition-colors hover:bg-success/10"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </td>
                  <td className="hidden px-5 py-3.5 text-sm text-muted-foreground lg:table-cell">
                    {formatDate(patient.last_appointment_at)}
                  </td>
                  <td className="hidden px-5 py-3.5 text-sm text-muted-foreground lg:table-cell">
                    {formatDate(patient.next_appointment_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[patient.status] ?? "bg-muted text-muted-foreground"}`}>
                      {translatePatientStatus(patient.status)}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3.5 text-sm font-medium sm:table-cell">{patient.procedures_count}</td>
                </tr>
              ))}
              {patients.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Nenhum paciente encontrado para esta busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Editar paciente" : "Novo paciente"}</DialogTitle>
              <DialogDescription>
                Preencha os dados básicos para manter o cadastro clínico atualizado.
              </DialogDescription>
            </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: formatPhoneBR(event.target.value) }))}
                  inputMode="tel"
                  maxLength={15}
                  pattern="\(\d{2}\)\s\d{4,5}-\d{4}"
                  placeholder="(00) 00000-0000"
                  title="Informe um telefone com DDD e 10 ou 11 dígitos."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nascimento</label>
                <Input
                  type="date"
                  value={form.birth_date ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, birth_date: event.target.value || undefined }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={form.status ?? "ativo"}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ativo">Ativo</option>
                  <option value="em tratamento">Em tratamento</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Histórico clínico</label>
                <textarea
                  value={form.history ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, history: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Observações</label>
                <textarea
                  value={form.observations ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editingPatient ? "Salvar alterações" : "Criar paciente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pacientes;
