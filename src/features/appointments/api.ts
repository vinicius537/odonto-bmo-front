import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { pageItems, type Page } from "@/lib/collections";

export type AppointmentStatus = "scheduled" | "pending" | "confirmed" | "cancelled" | "no_show" | "completed";

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_user_id: string;
  title: string;
  procedure_name: string;
  status: AppointmentStatus;
  notes: string;
  start_at: string;
  end_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  doctor: {
    id: string;
    name: string;
  };
}

export interface AppointmentFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  doctorUserId?: string;
}

export interface CreateAppointmentInput {
  patient_id: string;
  doctor_user_id: string;
  title?: string;
  procedure_name: string;
  status?: AppointmentStatus;
  notes?: string;
  start_at: string;
  end_at: string;
}

export interface UpdateAppointmentInput {
  doctor_user_id?: string;
  title?: string;
  procedure_name?: string;
  notes?: string;
  start_at?: string;
  end_at?: string;
  status?: AppointmentStatus;
}

function invalidateOperationalQueries(queryClient: ReturnType<typeof useQueryClient>, activeClinicId: string | null) {
  void queryClient.invalidateQueries({ queryKey: ["appointments", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["patients", activeClinicId] });
  void queryClient.invalidateQueries({ queryKey: ["messages", activeClinicId] });
}

export function useAppointmentsQuery(filters: AppointmentFilters) {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["appointments", activeClinicId, filters],
    queryFn: async () => {
      const response = await apiRequest<Page<Appointment>>("/appointments", {
        clinic: true,
        query: {
          status: filters.status,
          date_from: filters.dateFrom,
          date_to: filters.dateTo,
          doctor_user_id: filters.doctorUserId,
        },
      });
      return pageItems(response);
    },
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useCreateAppointmentMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      apiRequest<Appointment>("/appointments", {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateOperationalQueries(queryClient, activeClinicId),
  });
}

export function useUpdateAppointmentMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: ({ appointmentId, input }: { appointmentId: string; input: UpdateAppointmentInput }) =>
      apiRequest<Appointment>(`/appointments/${appointmentId}`, {
        clinic: true,
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => invalidateOperationalQueries(queryClient, activeClinicId),
  });
}

export function useConfirmAppointmentMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (appointmentId: string) =>
      apiRequest<Appointment>(`/appointments/${appointmentId}/confirm`, {
        clinic: true,
        method: "POST",
      }),
    onSuccess: () => invalidateOperationalQueries(queryClient, activeClinicId),
  });
}

export function useCancelAppointmentMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (appointmentId: string) =>
      apiRequest<Appointment>(`/appointments/${appointmentId}/cancel`, {
        clinic: true,
        method: "POST",
      }),
    onSuccess: () => invalidateOperationalQueries(queryClient, activeClinicId),
  });
}
