import { useEffect, useState } from "react";
import { ptBR } from "date-fns/locale";
import { Calendar, CheckCircle2, Clock3, MessageSquare, Users } from "lucide-react";

import { InfoTooltip } from "@/components/InfoTooltip";
import { StatCard } from "@/components/StatCard";
import type { DashboardSummary } from "@/features/dashboard/api";
import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { formatDateValue } from "@/lib/date";
import { translateAppointmentStatus, translateMessageStatus } from "@/lib/status-labels";

const Dashboard = () => {
  const { activeClinicId, status } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !activeClinicId) {
      setData(null);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const response = await apiRequest<DashboardSummary>("/dashboard/summary", { clinic: true });
        if (cancelled) {
          return;
        }

        setData({
          ...response,
          recent_messages: ensureArray(response.recent_messages),
          upcoming_appointments: ensureArray(response.upcoming_appointments),
        });
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

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [activeClinicId, status]);

  if (isLoading) {
    return <div className="animate-fade-in text-sm text-muted-foreground">Carregando dashboard...</div>;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar os indicadores operacionais agora.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <InfoTooltip content="Centraliza os indicadores principais da clínica, próximos atendimentos e mensagens recentes." />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Visão operacional da clínica em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Consultas Hoje" value={String(data.appointments_today)} icon={Calendar} />
        <StatCard title="Confirmadas" value={String(data.confirmed_today)} icon={CheckCircle2} />
        <StatCard title="Pendentes" value={String(data.pending_today)} icon={Clock3} />
        <StatCard title="Pacientes Ativos" value={String(data.active_patients)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Próximas Consultas</h2>
            <span className="text-xs text-muted-foreground">{data.upcoming_appointments.length} itens</span>
          </div>
          <div className="mt-4 space-y-3">
            {data.upcoming_appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma consulta futura encontrada.</p>
            ) : (
              data.upcoming_appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{appointment.patient_name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.procedure_name}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {translateAppointmentStatus(appointment.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{formatDateValue(appointment.start_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    <span>{appointment.patient_phone}</span>
                    <span>{appointment.doctor_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Mensagens Recentes</h2>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3">
            {data.recent_messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum disparo recente encontrado.</p>
            ) : (
              data.recent_messages.map((message) => (
                <div key={message.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{message.patient_name || message.recipient}</p>
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{translateMessageStatus(message.status)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{message.body}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{message.kind || "manual"}</span>
                    <span>{formatDateValue(message.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
