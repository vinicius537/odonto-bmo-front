import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";

export interface MedicalRecordEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  author_user_id: string;
  kind: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Procedure {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id?: string;
  doctor_user_id: string;
  name: string;
  tooth: string;
  notes: string;
  performed_at: string;
  created_at: string;
}

export interface MedicalRecord {
  entries: MedicalRecordEntry[];
  procedures: Procedure[];
}

export interface CreateEntryInput {
  kind: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface CreateProcedureInput {
  appointment_id?: string;
  name: string;
  tooth?: string;
  notes?: string;
  performed_at: string;
}

export function useMedicalRecordQuery(patientId: string | null) {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["medical-record", activeClinicId, patientId],
    queryFn: async () => {
      const response = await apiRequest<MedicalRecord | null>(`/patients/${patientId}/medical-record`, { clinic: true });
      return {
        entries: ensureArray(response?.entries),
        procedures: ensureArray(response?.procedures),
      };
    },
    enabled: status === "authenticated" && Boolean(activeClinicId) && Boolean(patientId),
  });
}

export function useCreateMedicalRecordEntryMutation(patientId: string | null) {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: CreateEntryInput) =>
      apiRequest<MedicalRecordEntry>(`/patients/${patientId}/medical-record/entries`, {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["medical-record", activeClinicId, patientId] });
      void queryClient.invalidateQueries({ queryKey: ["patients", activeClinicId] });
    },
  });
}

export function useCreateProcedureMutation(patientId: string | null) {
  const queryClient = useQueryClient();
  const { activeClinicId } = useAuth();

  return useMutation({
    mutationFn: (input: CreateProcedureInput) =>
      apiRequest<Procedure>(`/patients/${patientId}/procedures`, {
        clinic: true,
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["medical-record", activeClinicId, patientId] });
      void queryClient.invalidateQueries({ queryKey: ["patients", activeClinicId] });
    },
  });
}
