import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, CheckCheck, FilePlus2, FileText, Send } from "lucide-react";

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
import {
  type CreateMessageTemplateInput,
  type MessageDispatch,
  type MessageTemplate,
  type SendAppointmentMessageInput,
} from "@/features/messaging/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { formatDateValue } from "@/lib/date";
import { translateMessageChannel, translateMessageKind, translateMessageStatus } from "@/lib/status-labels";

const statusStyle: Record<string, string> = {
  sent: "text-warning",
  delivered: "text-success",
  read: "text-success",
  queued: "text-muted-foreground",
  failed: "text-destructive",
};

const emptyTemplate: CreateMessageTemplateInput = {
  name: "",
  kind: "confirmation_request",
  channel: "whatsapp",
  body: "",
  active: true,
};

const Mensagens = () => {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [kind, setKind] = useState("confirmation_request");
  const [body, setBody] = useState("");
  const [templateForm, setTemplateForm] = useState<CreateMessageTemplateInput>(emptyTemplate);
  const [messages, setMessages] = useState<MessageDispatch[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const { activeClinicId, status } = useAuth();

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setMessages([]);
      setTemplates([]);
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadMessagingData = async () => {
      setIsLoading(true);

      try {
        const [messagesResponse, templatesResponse, appointmentsResponse] = await Promise.all([
          apiRequest<MessageDispatch[] | null>("/messages", { clinic: true }),
          apiRequest<MessageTemplate[] | null>("/message-templates", { clinic: true }),
          apiRequest<Appointment[] | null>("/appointments", {
            clinic: true,
            query: {
              date_from: new Date().toISOString(),
              date_to: addDays(new Date(), 30).toISOString(),
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setMessages(ensureArray(messagesResponse));
        setTemplates(ensureArray(templatesResponse));
        setAppointments(ensureArray(appointmentsResponse));
      } catch {
        if (!cancelled) {
          setMessages([]);
          setTemplates([]);
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMessagingData();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, status]);

  const stats = useMemo(() => {
    const delivered = messages.filter((message) => message.status === "delivered" || message.status === "read").length;
    return {
      sent: messages.length,
      deliveredRate: messages.length ? Math.round((delivered / messages.length) * 100) : 0,
      confirmations: messages.filter((message) => String(message.metadata?.kind ?? "") === "confirmation_request").length,
      activeTemplates: templates.filter((template) => template.active).length,
    };
  }, [messages, templates]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSending(true);
      const input: SendAppointmentMessageInput = {
        template_id: templateId || undefined,
        body: body || undefined,
        kind,
      };
      await apiRequest<MessageDispatch>(`/appointments/${appointmentId}/messages/send`, {
        clinic: true,
        method: "POST",
        body: input,
      });
      const refreshedMessages = await apiRequest<MessageDispatch[] | null>("/messages", { clinic: true });
      setMessages(ensureArray(refreshedMessages));
      toast({ title: "Mensagem enviada", description: "O disparo foi registrado com sucesso." });
      setSendDialogOpen(false);
      setAppointmentId("");
      setTemplateId("");
      setKind("confirmation_request");
      setBody("");
    } catch (error) {
      toast({
        title: "Falha ao enviar mensagem",
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
        body: templateForm,
      });
      const refreshedTemplates = await apiRequest<MessageTemplate[] | null>("/message-templates", { clinic: true });
      setTemplates(ensureArray(refreshedTemplates));
      toast({ title: "Template criado", description: "O novo template já está disponível para envio." });
      setTemplateDialogOpen(false);
      setTemplateForm(emptyTemplate);
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
            <h1 className="font-display text-2xl font-bold">Mensagens</h1>
            <InfoTooltip content="Dispare mensagens para consultas e gerencie templates reutilizáveis da clínica." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Disparos e templates carregados diretamente da API.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setTemplateDialogOpen(true)}
            title="Crie um modelo de mensagem para reutilizar nos envios da clínica."
          >
            <FilePlus2 className="h-4 w-4" />
            Novo template
          </Button>
          <Button
            className="gap-2"
            onClick={() => setSendDialogOpen(true)}
            title="Envie uma mensagem para a consulta selecionada usando template ou texto livre."
          >
            <Send className="h-4 w-4" />
            Enviar mensagem
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Enviadas" value={String(stats.sent)} icon={Send} />
        <StatCard title="Taxa de entrega" value={`${stats.deliveredRate}%`} icon={CheckCheck} />
        <StatCard title="Pedidos de confirmação" value={String(stats.confirmations)} icon={CalendarCheck} />
        <StatCard title="Templates ativos" value={String(stats.activeTemplates)} icon={FileText} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display font-semibold">Templates reais</h3>
            <span className="text-xs text-muted-foreground">{templates.length} itens</span>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum template cadastrado para esta clínica.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-lg bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{template.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {translateMessageKind(template.kind)} - {translateMessageChannel(template.channel)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold ${template.active ? "text-success" : "text-muted-foreground"}`}>
                      {template.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{template.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display font-semibold">Mensagens recentes</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada ainda.</p>
          ) : (
            <div className="max-h-[460px] space-y-3 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg border p-4 transition-colors hover:bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{message.recipient}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {translateMessageKind(String(message.metadata?.kind ?? "manual"))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCheck className={`h-3.5 w-3.5 ${statusStyle[message.status] ?? "text-muted-foreground"}`} />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {translateMessageStatus(message.status)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateValue(message.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{message.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo template</DialogTitle>
            <DialogDescription>Crie um template real para reutilizar nos disparos da clínica.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <span>Nome</span>
                <InfoTooltip content="Dê um nome fácil de reconhecer para reutilizar este template nos próximos envios." />
              </div>
              <Input
                value={templateForm.name}
                onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Tipo</span>
                  <InfoTooltip content="Escolha o objetivo da mensagem, como confirmação de consulta, lembrete ou pós-atendimento." />
                </div>
                <select
                  value={templateForm.kind}
                  onChange={(event) => setTemplateForm((current) => ({ ...current, kind: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="confirmation_request">Confirmação</option>
                  <option value="reminder_24h">Lembrete</option>
                  <option value="post_care">Pós-atendimento</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                  <span>Canal</span>
                  <InfoTooltip content="Define por onde o template será enviado quando a API suportar esse canal." />
                </div>
                <select
                  value={templateForm.channel}
                  onChange={(event) => setTemplateForm((current) => ({ ...current, channel: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">E-mail</option>
                </select>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <span>Mensagem</span>
                <InfoTooltip content="Escreva o conteúdo base do template que será usado no envio." />
              </div>
              <textarea
                value={templateForm.body}
                onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={templateForm.active}
                onChange={(event) => setTemplateForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Template ativo
            </label>
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
            <DialogTitle>Enviar mensagem manual</DialogTitle>
            <DialogDescription>Selecione a consulta e monte o disparo usando template ou corpo livre.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <span>Consulta</span>
                <InfoTooltip content="Selecione a consulta que receberá a mensagem. A API usará os dados desse agendamento." />
              </div>
              <select
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Selecione uma consulta</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {(appointment.patient?.name ?? "Paciente")} - {appointment.procedure_name} - {formatDateValue(appointment.start_at, "dd/MM HH:mm", { locale: ptBR })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <span>Template</span>
                <InfoTooltip content="Escolha um template pronto ou deixe vazio para enviar um texto manual." />
              </div>
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sem template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <span>Tipo</span>
                <InfoTooltip content="Indica o contexto do disparo, como confirmação, lembrete ou mensagem manual." />
              </div>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="confirmation_request">Confirmação</option>
                <option value="reminder_24h">Lembrete</option>
                <option value="post_care">Pós-atendimento</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                <span>Mensagem</span>
                <InfoTooltip content="Preencha apenas se quiser sobrescrever o template com um texto livre." />
              </div>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Deixe em branco para usar o template ou o texto padrao do tipo selecionado."
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Mensagens;
