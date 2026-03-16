import { describe, expect, it } from "vitest";

import type { Appointment } from "@/features/appointments/api";
import type { MessageDispatch, MessageTemplate } from "@/features/messaging/api";
import { buildSatisfactionMetrics } from "@/features/satisfaction/utils";

const appointments: Appointment[] = [
  {
    id: "appt-1",
    clinic_id: "clinic-1",
    patient_id: "patient-1",
    doctor_user_id: "doctor-1",
    title: "Retorno",
    procedure_name: "Limpeza",
    status: "completed",
    notes: "",
    start_at: "2026-03-15T09:00:00Z",
    end_at: "2026-03-15T09:30:00Z",
    created_at: "2026-03-15T09:00:00Z",
    updated_at: "2026-03-15T09:00:00Z",
    patient: { id: "patient-1", name: "Maria", phone: "85999999999" },
    doctor: { id: "doctor-1", name: "Dr. Ana" },
  },
  {
    id: "appt-2",
    clinic_id: "clinic-1",
    patient_id: "patient-2",
    doctor_user_id: "doctor-1",
    title: "Avaliacao",
    procedure_name: "Canal",
    status: "completed",
    notes: "",
    start_at: "2026-03-16T09:00:00Z",
    end_at: "2026-03-16T09:30:00Z",
    created_at: "2026-03-16T09:00:00Z",
    updated_at: "2026-03-16T09:00:00Z",
    patient: { id: "patient-2", name: "Jose", phone: "85988888888" },
    doctor: { id: "doctor-1", name: "Dr. Ana" },
  },
];

const messages: MessageDispatch[] = [
  {
    id: "msg-1",
    clinic_id: "clinic-1",
    appointment_id: "appt-1",
    patient_id: "patient-1",
    provider: "mock",
    recipient: "Maria",
    body: "Como foi sua experiencia?",
    status: "read",
    metadata: { kind: "post_care" },
    created_at: "2026-03-15T10:00:00Z",
  },
];

const templates: MessageTemplate[] = [
  {
    id: "tpl-1",
    clinic_id: "clinic-1",
    name: "Pos atendimento",
    kind: "post_care",
    channel: "whatsapp",
    body: "Como foi sua experiencia?",
    active: true,
    created_at: "2026-03-15T10:00:00Z",
  },
];

describe("satisfaction metrics", () => {
  it("calcula cobertura e pendencias de follow-up", () => {
    const metrics = buildSatisfactionMetrics(appointments, messages, templates);

    expect(metrics.completedAppointments).toBe(2);
    expect(metrics.followUpsSent).toBe(1);
    expect(metrics.followUpsRead).toBe(1);
    expect(metrics.coverageRate).toBe(50);
    expect(metrics.pendingFollowUps).toHaveLength(1);
    expect(metrics.pendingFollowUps[0].id).toBe("appt-2");
    expect(metrics.templates).toHaveLength(1);
  });
});
