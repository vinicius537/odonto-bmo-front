import type { Appointment } from "@/features/appointments/api";
import type { MessageDispatch, MessageTemplate } from "@/features/messaging/api";

export interface SatisfactionMetrics {
  completedAppointments: number;
  followUpsSent: number;
  followUpsRead: number;
  coverageRate: number;
  pendingFollowUps: Appointment[];
  postCareMessages: MessageDispatch[];
  templates: MessageTemplate[];
}

export function buildSatisfactionMetrics(
  appointments: Appointment[],
  messages: MessageDispatch[],
  templates: MessageTemplate[],
): SatisfactionMetrics {
  const completedAppointments = appointments.filter((appointment) => appointment.status === "completed");
  const postCareMessages = messages.filter((message) => String(message.metadata?.kind ?? "") === "post_care");
  const postCareTemplates = templates.filter((template) => template.kind === "post_care");

  const sentAppointmentIds = new Set(
    postCareMessages
      .map((message) => message.appointment_id)
      .filter((appointmentId): appointmentId is string => Boolean(appointmentId)),
  );

  const pendingFollowUps = completedAppointments.filter((appointment) => !sentAppointmentIds.has(appointment.id));
  const followUpsRead = postCareMessages.filter((message) => message.status === "read").length;
  const coverageRate = completedAppointments.length
    ? Math.round(((completedAppointments.length - pendingFollowUps.length) / completedAppointments.length) * 100)
    : 0;

  return {
    completedAppointments: completedAppointments.length,
    followUpsSent: postCareMessages.length,
    followUpsRead,
    coverageRate,
    pendingFollowUps,
    postCareMessages,
    templates: postCareTemplates,
  };
}
