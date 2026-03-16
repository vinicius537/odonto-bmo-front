import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/use-auth";
import type { AppModule, MembershipSettings, UserRole } from "@/features/auth/types";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";

export interface Clinic {
  id: string;
  name: string;
  timezone: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClinicSettings {
  start_time?: string;
  end_time?: string;
  work_days?: string[];
  slot_interval_minutes?: number;
  work_schedule?: Record<
    string,
    {
      enabled?: boolean;
      start_time?: string;
      end_time?: string;
    }
  >;
  [key: string]: unknown;
}

export interface ClinicUpsertInput {
  name: string;
  timezone: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  settings?: ClinicSettings;
}

export interface ClinicUser {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  settings?: MembershipSettings;
}

export interface ClinicUserCreateInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: string;
  settings?: {
    modules: Partial<Record<AppModule, boolean>>;
  };
}

export interface ClinicUserUpdateInput {
  role?: UserRole;
  status?: string;
  settings?: {
    modules: Partial<Record<AppModule, boolean>>;
  };
}

function normalizeClinic(clinic: Clinic): Clinic {
  return {
    ...clinic,
    settings: clinic.settings ?? {},
  };
}

export function useClinicsQuery() {
  const { status } = useAuth();

  return useQuery({
    queryKey: ["clinics"],
    queryFn: async () => ensureArray(await apiRequest<Clinic[] | null>("/clinics")).map(normalizeClinic),
    enabled: status === "authenticated",
  });
}

export function useClinicQuery(clinicId: string | null) {
  const { status } = useAuth();

  return useQuery({
    queryKey: ["clinic", clinicId],
    queryFn: async () => normalizeClinic(await apiRequest<Clinic>(`/clinics/${clinicId}`)),
    enabled: status === "authenticated" && Boolean(clinicId),
  });
}

export function useClinicUsersQuery() {
  const { activeClinicId, status } = useAuth();

  return useQuery({
    queryKey: ["clinic-users", activeClinicId],
    queryFn: async () => ensureArray(await apiRequest<ClinicUser[] | null>("/clinic-users", { clinic: true })),
    enabled: status === "authenticated" && Boolean(activeClinicId),
  });
}

export function useCreateClinicMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClinicUpsertInput) =>
      apiRequest<Clinic>("/clinics", {
        method: "POST",
        body: input,
      }),
    onSuccess: (clinic) => {
      void queryClient.invalidateQueries({ queryKey: ["clinics"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic", clinic.id] });
    },
  });
}

export function useUpdateClinicMutation(clinicId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClinicUpsertInput) =>
      apiRequest<Clinic>(`/clinics/${clinicId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (clinic) => {
      void queryClient.invalidateQueries({ queryKey: ["clinics"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic", clinic.id] });
    },
  });
}
