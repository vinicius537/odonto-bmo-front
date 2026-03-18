import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, MessageCircle, PencilLine, Phone, Plus, X } from "lucide-react";

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
  type Appointment,
  type AppointmentStatus,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/features/appointments/api";
import { useAuth } from "@/features/auth/use-auth";
import type { ClinicUser } from "@/features/clinics/api";
import type { Patient } from "@/features/patients/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray, pageItems, type Page } from "@/lib/collections";
import { formatDateValue, toValidDate } from "@/lib/date";
import { translateAppointmentStatus, translateUserRole } from "@/lib/status-labels";

type ViewMode = "day" | "week" | "month";

interface AppointmentFormState {
  patientId: string;
  doctorUserId: string;
  title: string;
  procedureName: string;
  status: AppointmentStatus;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
}

const emptyForm = (date: Date): AppointmentFormState => ({
  patientId: "",
  doctorUserId: "",
  title: "",
  procedureName: "",
  status: "scheduled",
  notes: "",
  date: format(date, "yyyy-MM-dd"),
  startTime: "09:00",
  endTime: "09:30",
});

function toFormState(appointment: Appointment): AppointmentFormState {
  return {
    patientId: appointment.patient_id,
    doctorUserId: appointment.doctor_user_id,
    title: appointment.title ?? "",
    procedureName: appointment.procedure_name,
    status: appointment.status,
    notes: appointment.notes ?? "",
    date: formatDateValue(appointment.start_at, "yyyy-MM-dd", { fallback: format(new Date(), "yyyy-MM-dd") }),
    startTime: formatDateValue(appointment.start_at, "HH:mm", { fallback: "09:00" }),
    endTime: formatDateValue(appointment.end_at, "HH:mm", { fallback: "09:30" }),
  };
}

function getRange(viewMode: ViewMode, currentDate: Date) {
  if (viewMode === "week") {
    return {
      from: startOfWeek(currentDate, { weekStartsOn: 1 }),
      to: endOfWeek(currentDate, { weekStartsOn: 1 }),
    };
  }

  if (viewMode === "month") {
    return {
      from: startOfMonth(currentDate),
      to: endOfMonth(currentDate),
    };
  }

  return {
    from: startOfDay(currentDate),
    to: endOfDay(currentDate),
  };
}

function getNextDate(currentDate: Date, viewMode: ViewMode) {
  if (viewMode === "week") {
    return addWeeks(currentDate, 1);
  }
  if (viewMode === "month") {
    return addMonths(currentDate, 1);
  }
  return addDays(currentDate, 1);
}

function getPreviousDate(currentDate: Date, viewMode: ViewMode) {
  if (viewMode === "week") {
    return subWeeks(currentDate, 1);
  }
  if (viewMode === "month") {
    return subMonths(currentDate, 1);
  }
  return subDays(currentDate, 1);
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-success/10 text-success";
    case "pending":
      return "bg-warning/10 text-warning";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-primary/10 text-primary";
  }
}

function formatHeaderDate(viewMode: ViewMode, date: Date) {
  if (viewMode === "week") {
    const range = getRange(viewMode, date);
    return `${format(range.from, "dd MMM", { locale: ptBR })} - ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`;
  }
  if (viewMode === "month") {
    return format(date, "MMMM yyyy", { locale: ptBR });
  }
  return format(date, "dd 'de' MMMM yyyy", { locale: ptBR });
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

const Agenda = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => emptyForm(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { activeClinicId, status } = useAuth();
  const range = useMemo(() => getRange(viewMode, currentDate), [currentDate, viewMode]);

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setAppointments([]);
      setClinicUsers([]);
      setPatients([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadAgendaData = async () => {
      setIsLoading(true);

      try {
        const [appointmentsResponse, clinicUsersResponse, patientsResponse] = await Promise.all([
          apiRequest<Page<Appointment>>("/appointments", {
            clinic: true,
            query: {
              date_from: range.from.toISOString(),
              date_to: range.to.toISOString(),
            },
          }),
          apiRequest<ClinicUser[] | null>("/clinic-users", { clinic: true }),
          apiRequest<Page<Patient>>("/patients", {
            clinic: true,
            query: { search: "" },
          }),
        ]);

        if (cancelled) {
          return;
        }

        setAppointments(pageItems(appointmentsResponse));
        setClinicUsers(ensureArray(clinicUsersResponse));
        setPatients(
          pageItems(patientsResponse).map((patient) => ({
            ...patient,
            consents: ensureArray(patient.consents),
            procedures_count: Number.isFinite(patient.procedures_count) ? patient.procedures_count : 0,
          })),
        );
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setClinicUsers([]);
          setPatients([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAgendaData();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, range.from, range.to, status]);

  const groupedAppointments = useMemo(() => {
    return appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
      const startAt = toValidDate(appointment.start_at);
      if (!startAt) {
        return groups;
      }
      const key = format(startAt, "yyyy-MM-dd");
      groups[key] = groups[key] ?? [];
      groups[key].push(appointment);
      return groups;
    }, {});
  }, [appointments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      if (editingAppointmentId) {
        const input: UpdateAppointmentInput = {
          doctor_user_id: form.doctorUserId,
          title: form.title,
          procedure_name: form.procedureName,
          status: form.status,
          notes: form.notes,
          start_at: toIso(form.date, form.startTime),
          end_at: toIso(form.date, form.endTime),
        };
        await apiRequest<Appointment>(`/appointments/${editingAppointmentId}`, {
          clinic: true,
          method: "PATCH",
          body: input,
        });
        toast({ title: "Consulta atualizada", description: "A agenda foi atualizada com sucesso." });
      } else {
        const input: CreateAppointmentInput = {
          patient_id: form.patientId,
          doctor_user_id: form.doctorUserId,
          title: form.title,
          procedure_name: form.procedureName,
          status: form.status,
          notes: form.notes,
          start_at: toIso(form.date, form.startTime),
          end_at: toIso(form.date, form.endTime),
        };
        await apiRequest<Appointment>("/appointments", {
          clinic: true,
          method: "POST",
          body: input,
        });
        toast({ title: "Consulta criada", description: "A agenda foi atualizada com sucesso." });
      }
      const refreshedAppointments = await apiRequest<Page<Appointment>>("/appointments", {
        clinic: true,
        query: {
          date_from: range.from.toISOString(),
          date_to: range.to.toISOString(),
        },
      });
      setAppointments(pageItems(refreshedAppointments));
      setDialogOpen(false);
      setEditingAppointmentId(null);
      setForm(emptyForm(currentDate));
    } catch (error) {
      toast({
        title: editingAppointmentId ? "Falha ao atualizar consulta" : "Falha ao criar consulta",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async (appointmentId: string) => {
    try {
      setIsUpdatingStatus(true);
      await apiRequest<Appointment>(`/appointments/${appointmentId}/confirm`, {
        clinic: true,
        method: "POST",
      });
      const refreshedAppointments = await apiRequest<Page<Appointment>>("/appointments", {
        clinic: true,
        query: {
          date_from: range.from.toISOString(),
          date_to: range.to.toISOString(),
        },
      });
      setAppointments(pageItems(refreshedAppointments));
      toast({ title: "Consulta confirmada", description: "O status foi atualizado." });
    } catch (error) {
      toast({
        title: "Falha ao confirmar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      setIsUpdatingStatus(true);
      await apiRequest<Appointment>(`/appointments/${appointmentId}/cancel`, {
        clinic: true,
        method: "POST",
      });
      const refreshedAppointments = await apiRequest<Page<Appointment>>("/appointments", {
        clinic: true,
        query: {
          date_from: range.from.toISOString(),
          date_to: range.to.toISOString(),
        },
      });
      setAppointments(pageItems(refreshedAppointments));
      toast({ title: "Consulta cancelada", description: "A agenda foi atualizada." });
    } catch (error) {
      toast({
        title: "Falha ao cancelar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/55${phone}`, "_blank", "noopener,noreferrer");
  };

  const openCreateDialog = () => {
    setEditingAppointmentId(null);
    setForm(emptyForm(currentDate));
    setDialogOpen(true);
  };

  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointmentId(appointment.id);
    setForm(toFormState(appointment));
    setDialogOpen(true);
  };

  const saving = isSaving || isUpdatingStatus;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consultas reais sincronizadas com a API da clínica.</p>
        </div>
        <Button className="gradient-primary gap-2 text-primary-foreground" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nova Consulta
        </Button>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
            onClick={() => setCurrentDate((current) => getPreviousDate(current, viewMode))}
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 className="font-display text-lg font-semibold capitalize">{formatHeaderDate(viewMode, currentDate)}</h2>
          <button
            type="button"
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
            onClick={() => setCurrentDate((current) => getNextDate(current, viewMode))}
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                viewMode === mode ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Carregando agenda...</div>
        ) : appointments.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
            Nenhuma consulta encontrada para este período.
          </div>
        ) : viewMode === "day" ? (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold">{appointment.patient?.name ?? "Paciente"}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(appointment.status)}`}>
                        {translateAppointmentStatus(appointment.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{appointment.procedure_name}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{formatDateValue(appointment.start_at, "HH:mm", { locale: ptBR })} - {formatDateValue(appointment.end_at, "HH:mm", { locale: ptBR })}</span>
                      <span>{appointment.doctor?.name ?? "Profissional"}</span>
                      <span>{appointment.patient?.phone ?? "Sem telefone"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appointment.patient?.phone && openWhatsApp(appointment.patient.phone)}
                      className="rounded-md p-2 text-success transition-colors hover:bg-success/10"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <a
                      href={`tel:${appointment.patient?.phone ?? ""}`}
                      className="rounded-md p-2 text-info transition-colors hover:bg-info/10"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEditDialog(appointment)}
                      className="rounded-md p-2 text-primary transition-colors hover:bg-primary/10"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    {appointment.status !== "confirmed" && appointment.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => void handleConfirm(appointment.id)}
                        className="rounded-md p-2 text-success transition-colors hover:bg-success/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {appointment.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => void handleCancel(appointment.id)}
                        className="rounded-md p-2 text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedAppointments).map(([day, dayAppointments]) => (
              <section key={day} className="rounded-xl border bg-card p-4 shadow-card">
                <h3 className="font-display text-lg font-semibold capitalize">
                  {format(new Date(`${day}T00:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="mt-4 space-y-3">
                  {dayAppointments.map((appointment) => (
                    <div key={appointment.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{appointment.patient?.name ?? "Paciente"}</p>
                          <p className="text-sm text-muted-foreground">{appointment.procedure_name}</p>
                        </div>
                        <div className="flex items-center gap-3 text-right text-sm">
                          <div>
                            <p>{formatDateValue(appointment.start_at, "HH:mm", { locale: ptBR })}</p>
                            <p className="text-muted-foreground">{appointment.doctor?.name ?? "Profissional"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditDialog(appointment)}
                            className="rounded-md p-2 text-primary transition-colors hover:bg-primary/10"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAppointmentId ? "Editar consulta" : "Nova consulta"}</DialogTitle>
            <DialogDescription>
              {editingAppointmentId
                ? "Atualize os dados da consulta usando os registros reais da clínica."
                : "Agende um atendimento com paciente e profissional reais da clínica."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Paciente</label>
                <select
                  value={form.patientId}
                  onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={Boolean(editingAppointmentId)}
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Profissional</label>
                <select
                  value={form.doctorUserId}
                  onChange={(event) => setForm((current) => ({ ...current, doctorUserId: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione um profissional</option>
                  {clinicUsers
                    .filter((user) => user.role === "admin" || user.role === "doutor")
                    .map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.name} ({translateUserRole(user.role)})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Procedimento</label>
                <Input
                  value={form.procedureName}
                  onChange={(event) => setForm((current) => ({ ...current, procedureName: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Título</label>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="scheduled">Agendada</option>
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Concluída</option>
                  <option value="no_show">No-show</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Início</label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Fim</label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingAppointmentId ? "Salvar alterações" : "Criar consulta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
