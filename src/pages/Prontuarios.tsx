import { useEffect, useMemo, useRef, useState } from "react";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileClock,
  FileText,
  Paperclip,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";

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
  type CreateEntryInput,
  type CreateProcedureInput,
  type MedicalRecord,
  type Procedure,
  type MedicalRecordEntry,
} from "@/features/medical-records/api";
import { useAuth } from "@/features/auth/use-auth";
import { type Patient, type PatientTimeline } from "@/features/patients/api";
import { apiRequest, getApiBaseUrl } from "@/lib/api/client";
import { ensureArray, pageItems, type Page } from "@/lib/collections";
import { formatDateValue, toValidDate } from "@/lib/date";
import { pushNotification } from "@/lib/notifications";
import { loadStoredSession } from "@/lib/session";
import { resolveBrowserStorageUrl } from "@/lib/storage-url";
import { translateMessageStatus, translatePatientStatus } from "@/lib/status-labels";

function formatDateTime(value: string) {
  return formatDateValue(value, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

const emptyEntry: CreateEntryInput = {
  kind: "evolucao",
  title: "",
  body: "",
  metadata: {},
};

const emptyProcedure: CreateProcedureInput = {
  name: "",
  tooth: "",
  notes: "",
  performed_at: new Date().toISOString(),
};

function normalizeMedicalRecord(response: MedicalRecord | null): MedicalRecord {
  return {
    entries: ensureArray(response?.entries),
    procedures: ensureArray(response?.procedures),
  };
}

function normalizeTimeline(response: PatientTimeline | null): PatientTimeline {
  return {
    patient: response?.patient
      ? {
          ...response.patient,
          consents: ensureArray(response.patient.consents),
          procedures_count: Number.isFinite(response.patient.procedures_count)
            ? response.patient.procedures_count
            : 0,
        }
      : (null as unknown as Patient),
    appointments: ensureArray(response?.appointments),
    entries: ensureArray(response?.entries),
    procedures: ensureArray(response?.procedures),
    messages: ensureArray(response?.messages),
    attachments: ensureArray(response?.attachments),
  };
}

const Prontuarios = () => {
  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<CreateEntryInput>(emptyEntry);
  const [procedureForm, setProcedureForm] = useState<CreateProcedureInput>(emptyProcedure);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isSavingProcedure, setIsSavingProcedure] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { activeClinicId, status } = useAuth();

  const fetchSelectedPatientData = async (patientId: string) => {
    const [medicalRecordResponse, timelineResponse] = await Promise.all([
      apiRequest<MedicalRecord | null>(`/patients/${patientId}/medical-record`, { clinic: true }),
      apiRequest<PatientTimeline | null>(`/patients/${patientId}/timeline`, { clinic: true }),
    ]);

    return {
      medicalRecord: normalizeMedicalRecord(medicalRecordResponse),
      timeline: normalizeTimeline(timelineResponse),
    };
  };

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setPatients([]);
      setMedicalRecord(null);
      setTimeline(null);
      setIsLoadingPatients(false);
      setIsLoading(false);
      setIsLoadingTimeline(false);
      return;
    }

    let cancelled = false;

    const loadPatients = async () => {
      setIsLoadingPatients(true);

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
          setIsLoadingPatients(false);
        }
      }
    };

    void loadPatients();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, search, status]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId || !selectedPatientId) {
      setMedicalRecord(null);
      setTimeline(null);
      setIsLoading(false);
      setIsLoadingTimeline(false);
      return;
    }

    let cancelled = false;

    const loadPatientRecord = async () => {
      setIsLoading(true);
      setIsLoadingTimeline(true);

      try {
        if (cancelled) {
          return;
        }

        const nextData = await fetchSelectedPatientData(selectedPatientId);

        if (cancelled) {
          return;
        }

        setMedicalRecord(nextData.medicalRecord);
        setTimeline(nextData.timeline);
      } catch {
        if (!cancelled) {
          setMedicalRecord(normalizeMedicalRecord(null));
          setTimeline(normalizeTimeline(null));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingTimeline(false);
        }
      }
    };

    void loadPatientRecord();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, selectedPatientId, status]);

  const stats = useMemo(() => {
    const activeRecords = patients.filter((patient) => patient.status !== "finalizado").length;
    const inTreatment = patients.filter((patient) => patient.status === "em tratamento").length;
    const completed = patients.filter((patient) => patient.status === "finalizado").length;
    return { activeRecords, inTreatment, completed };
  }, [patients]);

  const timelineItems = useMemo(() => {
    if (!timeline) {
      return [];
    }

    return [
      ...timeline.appointments.map((item) => ({ ...item, group: "Consulta" })),
      ...timeline.entries.map((item) => ({ ...item, group: "Entrada" })),
      ...timeline.procedures.map((item) => ({ ...item, group: "Procedimento" })),
      ...timeline.messages.map((item) => ({ ...item, group: "Mensagem" })),
    ].sort((left, right) => {
      const leftDate = toValidDate(left.occurred_at)?.getTime() ?? 0;
      const rightDate = toValidDate(right.occurred_at)?.getTime() ?? 0;
      return rightDate - leftDate;
    });
  }, [timeline]);

  const handleCreateEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!selectedPatientId) {
        return;
      }

      setIsSavingEntry(true);
      await apiRequest<MedicalRecordEntry>(`/patients/${selectedPatientId}/medical-record/entries`, {
        clinic: true,
        method: "POST",
        body: entryForm,
      });
      const nextData = await fetchSelectedPatientData(selectedPatientId);
      setMedicalRecord(nextData.medicalRecord);
      setTimeline(nextData.timeline);
      toast({ title: "Entrada criada", description: "O prontuario foi atualizado." });
      setEntryDialogOpen(false);
      setEntryForm(emptyEntry);
    } catch (error) {
      toast({
        title: "Falha ao criar entrada",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleCreateProcedure = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!selectedPatientId) {
        return;
      }

      setIsSavingProcedure(true);
      await apiRequest<Procedure>(`/patients/${selectedPatientId}/procedures`, {
        clinic: true,
        method: "POST",
        body: procedureForm,
      });
      const nextData = await fetchSelectedPatientData(selectedPatientId);
      setMedicalRecord(nextData.medicalRecord);
      setTimeline(nextData.timeline);
      toast({ title: "Procedimento registrado", description: "O prontuario foi atualizado." });
      setProcedureDialogOpen(false);
      setProcedureForm(emptyProcedure);
    } catch (error) {
      toast({
        title: "Falha ao registrar procedimento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProcedure(false);
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !selectedPatientId || !activeClinicId) {
      return;
    }

    try {
      setIsUploadingAttachment(true);

      const session = loadStoredSession();
      if (!session?.accessToken) {
        throw new Error("Sua sessao expirou. Entre novamente para enviar anexos.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const apiBaseUrl = getApiBaseUrl().replace(/\/$/, "");
      const uploadTarget = apiBaseUrl.startsWith("http")
        ? `${apiBaseUrl}/patients/${selectedPatientId}/attachments`
        : new URL(`${apiBaseUrl}/patients/${selectedPatientId}/attachments`, window.location.origin).toString();

      const uploadResponse = await fetch(uploadTarget, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "X-Clinic-ID": activeClinicId,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const rawMessage = await uploadResponse.text();
        let message = rawMessage.trim() || "Tente novamente.";

        try {
          const parsed = JSON.parse(rawMessage) as { error?: string };
          if (parsed?.error) {
            message = parsed.error;
          }
        } catch {
          // Keep the raw response when the API does not return JSON.
        }

        throw new Error(message);
      }

      const nextData = await fetchSelectedPatientData(selectedPatientId);
      setMedicalRecord(nextData.medicalRecord);
      setTimeline(nextData.timeline);

      pushNotification({
        title: "Anexo enviado",
        description: `O arquivo ${file.name} foi anexado ao prontuario.`,
        level: "success",
      });
      toast({
        title: "Anexo enviado",
        description: "O arquivo foi anexado ao prontuario com sucesso.",
      });
    } catch (error) {
      pushNotification({
        title: "Falha ao anexar arquivo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        level: "error",
      });
      toast({
        title: "Falha ao anexar arquivo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!selectedPatientId) {
      return;
    }

    const confirmed = window.confirm(`Deseja apagar o anexo "${fileName}" do prontuario?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingAttachmentId(attachmentId);

      await apiRequest<void>(`/patients/${selectedPatientId}/attachments/${attachmentId}`, {
        clinic: true,
        method: "DELETE",
      });

      const nextData = await fetchSelectedPatientData(selectedPatientId);
      setMedicalRecord(nextData.medicalRecord);
      setTimeline(nextData.timeline);

      pushNotification({
        title: "Anexo apagado",
        description: `O arquivo ${fileName} foi removido do prontuario.`,
        level: "success",
      });
      toast({
        title: "Anexo apagado",
        description: "O arquivo foi removido com sucesso.",
      });
    } catch (error) {
      pushNotification({
        title: "Falha ao apagar anexo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        level: "error",
      });
      toast({
        title: "Falha ao apagar anexo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Prontuários</h1>
            <InfoTooltip content="Acompanhe a evolução clínica, registre procedimentos e anexe arquivos diretamente ao paciente selecionado." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Fichas clínicas, timeline e evolução dos pacientes sincronizadas com a API.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!selectedPatient}
            onClick={() => setEntryDialogOpen(true)}
            title="Abra o formulário para registrar evolução, anamnese ou orientação do paciente."
          >
            <Plus className="h-4 w-4" />
            Nova entrada
          </Button>
          <Button
            disabled={!selectedPatient}
            onClick={() => setProcedureDialogOpen(true)}
            title="Registre um procedimento executado e associe data, dente e observações."
          >
            <Plus className="h-4 w-4" />
            Novo procedimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Prontuários Ativos" value={String(stats.activeRecords)} icon={FileText} />
        <StatCard title="Em Tratamento" value={String(stats.inTreatment)} icon={ClipboardList} />
        <StatCard title="Finalizados" value={String(stats.completed)} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="border-b p-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-[520px] divide-y overflow-y-auto">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => setSelectedPatientId(patient.id)}
                className={`w-full p-4 text-left transition-colors hover:bg-muted/30 ${
                  selectedPatientId === patient.id ? "border-l-2 border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{translatePatientStatus(patient.status)}</p>
                  </div>
                </div>
              </button>
            ))}
            {patients.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">Nenhum paciente encontrado.</div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {selectedPatient ? (
            <>
              <div className="rounded-xl border bg-card p-5 shadow-card">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold">{selectedPatient.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatDateValue(selectedPatient.birth_date, "dd/MM/yyyy", { locale: ptBR, fallback: "Sem nascimento" })}</span>
                        <a
                          href={`https://wa.me/55${selectedPatient.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-success hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {selectedPatient.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                    {translatePatientStatus(selectedPatient.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-5 shadow-card">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Histórico clínico
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.history || "Nenhum historico clinico cadastrado."}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-card">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Observações
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.observations || "Nenhuma observação registrada."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-display font-semibold">Timeline do paciente</h3>
                  <FileClock className="h-4 w-4 text-muted-foreground" />
                </div>
                {isLoadingTimeline ? (
                  <p className="text-sm text-muted-foreground">Carregando timeline...</p>
                ) : timelineItems.length ? (
                  <div className="space-y-3">
                    {timelineItems.map((item) => (
                      <div key={`${item.group}-${item.id}`} className="rounded-lg bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {item.group === "Mensagem" ? translateMessageStatus(item.title) : item.title}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.group}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDateTime(item.occurred_at)}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.body || "Sem detalhes adicionais."}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum evento na timeline ate o momento.</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border bg-card p-5 shadow-card">
                  <h3 className="mb-4 font-display font-semibold">Entradas do prontuario</h3>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando prontuario...</p>
                  ) : medicalRecord?.entries.length ? (
                    <div className="space-y-3">
                      {medicalRecord.entries.map((entry) => (
                        <div key={entry.id} className="rounded-lg bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{entry.title}</p>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.kind}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{entry.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma entrada cadastrada ate o momento.</p>
                  )}
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-card">
                  <h3 className="mb-4 font-display font-semibold">Procedimentos realizados</h3>
                  {medicalRecord?.procedures.length ? (
                    <div className="space-y-3">
                      {medicalRecord.procedures.map((procedure) => (
                        <div key={procedure.id} className="rounded-lg bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{procedure.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {procedure.tooth ? `Dente ${procedure.tooth}` : "Sem dente informado"}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTime(procedure.performed_at)}</span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                            {procedure.notes || "Sem observacoes para este procedimento."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum procedimento registrado ainda.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">Anexos</h3>
                    <InfoTooltip content="Envie imagens, PDFs e documentos pela URL pré-assinada gerada pela API para este paciente." />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!selectedPatient || isUploadingAttachment}
                      onClick={() => fileInputRef.current?.click()}
                      title="Selecione um arquivo para anexar ao prontuário do paciente."
                    >
                      <Paperclip className="h-4 w-4" />
                      {isUploadingAttachment ? "Enviando..." : "Anexar arquivo"}
                    </Button>
                  </div>
                </div>
                {timeline?.attachments.length ? (
                  <div className="space-y-3">
                    {timeline.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex flex-col gap-3 rounded-lg bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">{attachment.content_type}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {attachment.download_url ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              asChild
                              title="Abra o anexo em uma nova aba para conferir o que foi enviado ao prontuario."
                            >
                              <a
                                href={resolveBrowserStorageUrl(attachment.download_url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye className="h-4 w-4" />
                                Visualizar
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deletingAttachmentId === attachment.id}
                            onClick={() => void handleDeleteAttachment(attachment.id, attachment.file_name)}
                            title="Apague o anexo selecionado quando ele nao for mais necessario no prontuario."
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingAttachmentId === attachment.id ? "Apagando..." : "Apagar"}
                          </Button>
                          <span className="text-xs text-muted-foreground">{formatDateTime(attachment.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum anexo disponível para este paciente.</p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center shadow-card">
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Selecione um paciente para visualizar o prontuario.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova entrada clínica</DialogTitle>
            <DialogDescription>Registre a evolução ou observação do atendimento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEntry} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tipo</label>
              <select
                value={entryForm.kind}
                onChange={(event) => setEntryForm((current) => ({ ...current, kind: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="evolucao">Evolucao</option>
                <option value="anamnese">Anamnese</option>
                <option value="orientacao">Orientação</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Titulo</label>
              <Input
                value={entryForm.title}
                onChange={(event) => setEntryForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descricao</label>
              <textarea
                value={entryForm.body}
                onChange={(event) => setEntryForm((current) => ({ ...current, body: event.target.value }))}
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEntryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingEntry}>
                {isSavingEntry ? "Salvando..." : "Registrar entrada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo procedimento</DialogTitle>
            <DialogDescription>Registre o procedimento executado no prontuario do paciente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProcedure} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Procedimento</label>
                <Input
                  value={procedureForm.name}
                  onChange={(event) => setProcedureForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Dente</label>
                <Input
                  value={procedureForm.tooth ?? ""}
                  onChange={(event) => setProcedureForm((current) => ({ ...current, tooth: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Data e hora</label>
                <Input
                  type="datetime-local"
                  value={formatDateValue(procedureForm.performed_at, "yyyy-MM-dd'T'HH:mm", { fallback: "" })}
                  onChange={(event) =>
                    setProcedureForm((current) => ({
                      ...current,
                      performed_at: toValidDate(event.target.value)?.toISOString() ?? current.performed_at,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Observações</label>
                <textarea
                  value={procedureForm.notes ?? ""}
                  onChange={(event) => setProcedureForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProcedureDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingProcedure}>
                {isSavingProcedure ? "Salvando..." : "Registrar procedimento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prontuarios;
