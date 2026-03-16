import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";

export interface DashboardRecentMessage {
  id: string;
  patient_id?: string;
  patient_name: string;
  appointment_id?: string;
  status: string;
  body: string;
  recipient: string;
  kind: string;
  created_at: string;
}

export interface DashboardUpcomingAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_user_id: string;
  doctor_name: string;
  procedure_name: string;
  status: string;
  start_at: string;
  end_at: string;
}

export interface DashboardSummary {
  appointments_today: number;
  confirmed_today: number;
  pending_today: number;
  active_patients: number;
  recent_messages: DashboardRecentMessage[];
  upcoming_appointments: DashboardUpcomingAppointment[];
}

interface DashboardSummaryApiResponse extends Omit<DashboardSummary, "recent_messages" | "upcoming_appointments"> {
  recent_messages: DashboardRecentMessage[] | null;
  upcoming_appointments: DashboardUpcomingAppointment[] | null;
}

export function useDashboardSummaryQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["dashboard", activeClinicId],
    queryFn: async () => {
      const response = await apiRequest<DashboardSummaryApiResponse>("/dashboard/summary", { clinic: true });
      return {
        ...response,
        recent_messages: response.recent_messages ?? [],
        upcoming_appointments: response.upcoming_appointments ?? [],
      } satisfies DashboardSummary;
    },
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}
