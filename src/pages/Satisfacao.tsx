import { useCallback, useEffect, useMemo, useState } from "react";
import { ptBR } from "date-fns/locale";
import { CheckCheck, HeartHandshake, MessageCircleMore, Plus, Send, SmilePlus } from "lucide-react";

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
import type { Appointment } from "@/features/appointments/api";
import { useAuth } from "@/features/auth/use-auth";
import type { CreateMessageTemplateInput, MessageDispatch, MessageTemplate, SendAppointmentMessageInput } from "@/features/messaging/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { formatDateValue } from "@/lib/date";

interface SatisfactionOverview {
  completed_appointments: number;
  follow_ups_sent: number;
  follow_ups_read: number;
  coverage_rate: number;
  active_templates: number;
  pending_follow_ups: Array<{
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    patient_phone: string;
    doctor_user_id: string;
    doctor_name: string;
    procedure_name: string;
    appointment_at: string;
  }>;
  recent_follow_ups: Array<{
    dispatch_id: string;
    appointment_id?: string;
    patient_id?: string;
    patient_name: string;
    recipient: string;
    body: string;
    status: string;
    created_at: string;
    delivered_at?: string | null;
  }>;
}

const emptyTemplate: CreateMessageTemplateInput = {
  name: "",
  kind: "post_care",
  channel: "whatsapp",
  body: "",
  active: true,
};

const emptyOverview: SatisfactionOverview = {
  completed_appointments: 0,
  follow_ups_sent: 0,
  follow_ups_read: 0,
  coverage_rate: 0,
  active_templates: 0,
  pending_follow_ups: [],
  recent_follow_ups: [],
};

const Satisfacao = () => {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [templateForm, setTemplateForm] = useState<CreateMessageTemplateInput>(emptyTemplate);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [overview, setOverview] = useState<SatisfactionOverview>(emptyOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const { activeClinicId, status } = useAuth();

  const loadData = useCallback(async () => {
    if (status !== "authenticated" || !activeClinicId) {
      setAppointments([]);
      setTemplates([]);
      setOverview(emptyOverview);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [overviewResponse, appointmentsResponse, templatesResponse] = await Promise.all([
        apiRequest<SatisfactionOverview>("/satisfaction/overview", { clinic: true }),
        apiRequest<Appointment[] | null>("/appointments", {
          clinic: true,
          query: {
            status: "completed",
          },
        }),
        apiRequest<MessageTemplate[] | null>("/message-templates", { clinic: true }),
      ]);

      setOverview({
        ...overviewResponse,
        pending_follow_ups: ensureArray(overviewResponse.pending_follow_ups),
        recent_follow_ups: ensureArray(overviewResponse.recent_follow_ups),
      });
      setAppointments(ensureArray(appointmentsResponse));
      setTemplates(ensureArray(templatesResponse));
    } catch {
      setOverview(emptyOverview);
      setAppointments([]);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeClinicId, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.kind === "post_care" && template.active),
    [templates],
  );

  const openSendDialog = (appointmentId?: string) => {
    setSelectedAppointmentId(appointmentId ?? "");
    setSelectedTemplateId("");
    setMessageBody("");
    setSendDialogOpen(true);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedAppointmentId) {
      return;
    }

    try {
      setIsSending(true);
      const input: SendAppointmentMessageInput = {
        template_id: selectedTemplateId || undefined,
        body: messageBody || undefined,
        kind: "post_care",
      };

      await apiRequest<MessageDispatch>(`/appointments/${selectedAppointmentId}/messages/send`, {
        clinic: true,
        method: "POST",
        body: input,
      });

      await loadData();
      setSendDialogOpen(false);
      toast({
        title: "Follow-up enviado",
        description: "A mensagem de satisfação foi registrada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Falha ao enviar follow-up",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTemplate = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsCreatingTemplate(true);
      await apiRequest<MessageTemplate>("/message-templates", {
        clinic: true,
        method: "POST",
        body: {
          ...templateForm,
          kind: "post_care",
        },
      });

      await loadData();
      setTemplateDialogOpen(false);
      setTemplateForm(emptyTemplate);
      toast({
        title: "Template criado",
        description: "O template de satisfação já está disponível para os próximos envios.",
      });
    } catch (error) {
      toast({
        title: "Falha ao criar template",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Satisfação</h1>
            <InfoTooltip content="Acompanhe o pós-atendimento, crie templates de contato e envie follow-ups para medir a percepção do paciente." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhamento de follow-up pós-atendimento usando o resumo operacional dedicado do backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setTemplateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo template
          </Button>
          <Button className="gap-2" onClick={() => openSendDialog()}>
            <Send className="h-4 w-4" />
            Enviar follow-up
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Consultas concluídas" value={String(overview.completed_appointments)} icon={HeartHandshake} />
        <StatCard title="Follow-ups enviados" value={String(overview.follow_ups_sent)} icon={MessageCircleMore} />
        <StatCard title="Mensagens lidas" value={String(overview.follow_ups_read)} icon={CheckCheck} />
        <StatCard title="Cobertura" value={`${overview.coverage_rate}%`} icon={SmilePlus} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Templates de satisfação</h2>
            <span className="text-xs text-muted-foreground">{overview.active_templates} ativos</span>
          </div>

          {activeTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum template de pós-atendimento foi cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {activeTemplates.map((template) => (
                <div key={template.id} className="rounded-lg bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{template.name}</p>
                    <span className={`text-[10px] font-semibold ${template.active ? "text-success" : "text-muted-foreground"}`}>
                      {template.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{template.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Pendências de follow-up</h2>
            <span className="text-xs text-muted-foreground">{overview.pending_follow_ups.length} aguardando contato</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando satisfação...</p>
          ) : overview.pending_follow_ups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todas as consultas concluídas recentes já receberam follow-up.</p>
          ) : (
            <div className="space-y-3">
              {overview.pending_follow_ups.map((appointment) => (
                <div key={appointment.appointment_id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{appointment.patient_name || "Paciente"}</p>
                      <p className="text-sm text-muted-foreground">{appointment.procedure_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateValue(appointment.appointment_at, "dd/MM/yyyy HH:mm", { locale: ptBR })} • {appointment.doctor_name || "Profissional"}
                      </p>
                    </div>
                    <Button onClick={() => openSendDialog(appointment.appointment_id)}>Enviar agora</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Disparos recentes</h2>
          <span className="text-xs text-muted-foreground">{overview.recent_follow_ups.length} registros</span>
        </div>

        {overview.recent_follow_ups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum disparo de satisfação foi registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {overview.recent_follow_ups.map((message) => (
              <div key={message.dispatch_id} className="rounded-lg bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{message.patient_name || message.recipient}</p>
                    <p className="text-sm text-muted-foreground">{message.body}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{message.status}</p>
                    <p>{formatDateValue(message.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo template de satisfação</DialogTitle>
            <DialogDescription>Crie um texto padrão para follow-up pós-atendimento.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <Input value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Mensagem</label>
              <textarea
                value={templateForm.body}
                onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingTemplate}>
                {isCreatingTemplate ? "Salvando..." : "Criar template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar follow-up de satisfação</DialogTitle>
            <DialogDescription>Selecione a consulta concluída e dispare a mensagem de pós-atendimento.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Consulta</label>
              <select
                value={selectedAppointmentId}
                onChange={(event) => setSelectedAppointmentId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Selecione uma consulta concluída</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {(appointment.patient?.name ?? "Paciente")} - {appointment.procedure_name} - {formatDateValue(appointment.start_at, "dd/MM HH:mm", { locale: ptBR })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sem template</option>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Mensagem</label>
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Deixe em branco para usar o template selecionado."
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? "Enviando..." : "Enviar follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Satisfacao;
