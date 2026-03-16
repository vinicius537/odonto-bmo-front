import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  email?: string;
  phone: string;
  birth_date?: string;
  status: string;
  history?: string;
  observations?: string;
  consents: unknown[];
  created_at: string;
  updated_at: string;
  last_appointment_at?: string;
  next_appointment_at?: string;
  procedures_count: number;
}

export interface PatientInput {
  name: string;
  email?: string;
  phone: string;
  birth_date?: string;
  status?: string;
  history?: string;
  observations?: string;
  consents?: unknown[];
}

export interface TimelineItem {
  id: string;
  type: string;
  title: string;
  body: string;
  occurred_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface AttachmentRecord {
  id: string;
  object_key: string;
  file_name: string;
  content_type: string;
  download_url?: string;
  created_at: string;
}

export interface PatientTimeline {
  patient: Patient;
  appointments: TimelineItem[];
  entries: TimelineItem[];
  procedures: TimelineItem[];
  messages: TimelineItem[];
  attachments: AttachmentRecord[];
}

function normalizePatient(patient: Patient): Patient {
  return {
    ...patient,
    consents: ensureArray(patient.consents),
    procedures_count: Number.isFinite(patient.procedures_count) ? patient.procedures_count : 0,
  };
}

export function usePatientsQuery(search: string) {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["patients", activeClinicId, search],
    queryFn: async () => {
      const response = await apiRequest<Patient[] | null>("/patients", {
        clinic: true,
        query: { search },
      });
      return ensureArray(response).map(normalizePatient);
    },
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useCreatePatientMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: PatientInput) =>
      apiRequest<Patient>("/patients", {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients", activeClinicId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", activeClinicId] });
    },
  });
}

export function useUpdatePatientMutation() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: ({ patientId, input }: { patientId: string; input: PatientInput }) =>
      apiRequest<Patient>(`/patients/${patientId}`, {
        clinic: true,
        method: "PATCH",
        body: input,
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["patients", activeClinicId] });
      void queryClient.invalidateQueries({ queryKey: ["patient-timeline", activeClinicId, variables.patientId] });
      void queryClient.invalidateQueries({ queryKey: ["medical-record", activeClinicId, variables.patientId] });
    },
  });
}

export function usePatientTimelineQuery(patientId: string | null) {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["patient-timeline", activeClinicId, patientId],
    queryFn: async () => {
      const response = await apiRequest<PatientTimeline | null>(`/patients/${patientId}/timeline`, {
        clinic: true,
      });

      return {
        patient: response?.patient ? normalizePatient(response.patient) : null,
        appointments: ensureArray(response?.appointments),
        entries: ensureArray(response?.entries),
        procedures: ensureArray(response?.procedures),
        messages: ensureArray(response?.messages),
        attachments: ensureArray(response?.attachments),
      };
    },
    enabled: status === "authenticated" && Boolean(activeClinicId) && Boolean(patientId),
  });
}
