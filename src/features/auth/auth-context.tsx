import { useCallback, useEffect, useMemo, useState } from "react";

import { loginRequest, logoutWithRefreshToken, meRequest, registerRequest } from "@/features/auth/api";
import { AuthContext } from "@/features/auth/context";
import type { AuthStatus } from "@/features/auth/context";
import type { AuthContextValue } from "@/features/auth/context";
import type { AuthSessionResponse, StoredSession } from "@/features/auth/types";
import {
  clearStoredSession,
  getSessionEventName,
  loadStoredSession,
  normalizeActiveClinicId,
  resolveActiveMembership,
  resolveRole,
  saveStoredSession,
} from "@/lib/session";
import { pushNotification } from "@/lib/notifications";

function toStoredSession(
  response: AuthSessionResponse,
  previousActiveClinicId: string | null,
  previousTokens?: Pick<StoredSession, "accessToken" | "refreshToken"> | null,
) {
  const accessToken = response.access_token ?? previousTokens?.accessToken;
  const refreshToken = response.refresh_token ?? previousTokens?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("A API não retornou tokens válidos para a sessão.");
  }

  const session: StoredSession = {
    user: response.user,
    memberships: response.memberships,
    activeClinicId: normalizeActiveClinicId(response.memberships, previousActiveClinicId),
    accessToken,
    refreshToken,
  };

  return session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<StoredSession | null>(() => loadStoredSession());

  const syncFromStorage = useCallback(() => {
    const stored = loadStoredSession();
    setSession(stored);
    setStatus(stored ? "authenticated" : "unauthenticated");
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentSession = loadStoredSession();
    if (!currentSession?.accessToken) {
      clearStoredSession();
      setSession(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const response = await meRequest();
      const nextSession = toStoredSession(response, currentSession.activeClinicId ?? null, currentSession);
      saveStoredSession(nextSession);
      setSession(nextSession);
      setStatus("authenticated");
    } catch (error) {
      const isUnauthorized = error instanceof Error && "status" in error && error.status === 401;

      if (!isUnauthorized) {
        if (import.meta.env.DEV) {
          console.error("Failed to refresh auth session:", error);
        }
        setSession(currentSession);
        setStatus(currentSession ? "authenticated" : "unauthenticated");
        return;
      }

      clearStoredSession();
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const eventName = getSessionEventName();
    const handleChange = () => syncFromStorage();
    window.addEventListener(eventName, handleChange);
    return () => {
      window.removeEventListener(eventName, handleChange);
    };
  }, [syncFromStorage]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    const nextSession = toStoredSession(response, loadStoredSession()?.activeClinicId ?? null);
    saveStoredSession(nextSession);
    setSession(nextSession);
    setStatus("authenticated");
    pushNotification({
      title: "Login realizado",
      description: `Você entrou na plataforma como ${nextSession.user.name}.`,
      level: "success",
    });
    return nextSession;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await registerRequest({ name, email, password });
    pushNotification({
      title: "Conta criada",
      description: `O cadastro de ${email} foi enviado para a API.`,
      level: "success",
    });
  }, []);

  const logout = useCallback(async () => {
    const currentSession = loadStoredSession();
    try {
      if (currentSession?.refreshToken) {
        await logoutWithRefreshToken(currentSession.refreshToken);
      }
    } finally {
      clearStoredSession();
      setSession(null);
      setStatus("unauthenticated");
      pushNotification({
        title: "Sessão encerrada",
        description: "Você saiu da plataforma.",
        level: "info",
      });
    }
  }, []);

  const selectClinic = useCallback((clinicId: string) => {
    const current = loadStoredSession();
    if (!current) {
      return;
    }
    if (!current.memberships.some((membership) => membership.clinic_id === clinicId)) {
      return;
    }
    const nextSession = {
      ...current,
      activeClinicId: clinicId,
    };
    saveStoredSession(nextSession);
    setSession(nextSession);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const activeMembership = session ? resolveActiveMembership(session) : null;
    return {
      status,
      session,
      user: session?.user ?? null,
      memberships: session?.memberships ?? [],
      activeClinicId: session?.activeClinicId ?? null,
      activeMembership,
      activeRole: session ? resolveRole(session) : null,
      login,
      register,
      logout,
      selectClinic,
      refreshProfile,
    };
  }, [login, logout, refreshProfile, register, selectClinic, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
