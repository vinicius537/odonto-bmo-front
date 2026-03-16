import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";

export interface MessageTemplate {
  id: string;
  clinic_id: string;
  name: string;
  kind: string;
  channel: string;
  body: string;
  active: boolean;
  created_at: string;
}

export interface MessageDispatch {
  id: string;
  clinic_id: string;
  patient_id?: string;
  appointment_id?: string;
  template_id?: string;
  provider: string;
  provider_message_id?: string;
  recipient: string;
  body: string;
  status: string;
  error_message?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
}

export interface SendAppointmentMessageInput {
  template_id?: string;
  body?: string;
  kind?: string;
}

export interface CreateMessageTemplateInput {
  name: string;
  kind: string;
  channel: string;
  body: string;
  active: boolean;
}

export function useMessagesQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["messages", activeClinicId],
    queryFn: async () => ensureArray(await apiRequest<MessageDispatch[] | null>("/messages", { clinic: true })),
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useMessageTemplatesQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["message-templates", activeClinicId],
    queryFn: async () => ensureArray(await apiRequest<MessageTemplate[] | null>("/message-templates", { clinic: true })),
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useSendAppointmentMessageMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: ({ appointmentId, input }: { appointmentId: string; input: SendAppointmentMessageInput }) =>
      apiRequest<MessageDispatch>(`/appointments/${appointmentId}/messages/send`, {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", activeClinicId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", activeClinicId] });
    },
  });
}

export function useCreateMessageTemplateMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: CreateMessageTemplateInput) =>
      apiRequest<MessageTemplate>("/message-templates", {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates", activeClinicId] });
    },
  });
}
