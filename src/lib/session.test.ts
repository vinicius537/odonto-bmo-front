import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearStoredSession,
  loadStoredSession,
  normalizeActiveClinicId,
  saveStoredSession,
} from "@/lib/session";

describe("session cache", () => {
  beforeEach(() => {
    clearStoredSession();
    window.localStorage.clear();
  });

  it("persists and loads the session in memory", () => {
    const session = {
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: new Date().toISOString(),
      },
      memberships: [{ clinic_id: "clinic-1", clinic_name: "Odonto", role: "admin" as const, status: "active" }],
      activeClinicId: "clinic-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    };

    saveStoredSession(session);

    expect(loadStoredSession()).toEqual(session);
  });

  it("normalizes the active clinic id when saving the session", () => {
    saveStoredSession({
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: new Date().toISOString(),
      },
      memberships: [{ clinic_id: "clinic-1", clinic_name: "Odonto", role: "admin", status: "active" }],
      activeClinicId: null,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(loadStoredSession()).toEqual({
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: expect.any(String),
      },
      memberships: [{ clinic_id: "clinic-1", clinic_name: "Odonto", role: "admin", status: "active" }],
      activeClinicId: "clinic-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("accepts authenticated sessions without clinic memberships", () => {
    saveStoredSession({
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: new Date().toISOString(),
      },
      memberships: [],
      activeClinicId: null,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(loadStoredSession()).toEqual({
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: expect.any(String),
      },
      memberships: [],
      activeClinicId: null,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("normalizes the active clinic id based on memberships", () => {
    const memberships = [
      { clinic_id: "clinic-1", clinic_name: "A", role: "admin" as const, status: "active" },
      { clinic_id: "clinic-2", clinic_name: "B", role: "doutor" as const, status: "active" },
    ];

    expect(normalizeActiveClinicId(memberships, "clinic-2")).toBe("clinic-2");
    expect(normalizeActiveClinicId(memberships, "clinic-9")).toBeNull();
    expect(normalizeActiveClinicId([memberships[0]], null)).toBe("clinic-1");
  });

  it("clears the session cache", () => {
    saveStoredSession({
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: new Date().toISOString(),
      },
      memberships: [{ clinic_id: "clinic-1", clinic_name: "Odonto", role: "admin", status: "active" }],
      activeClinicId: "clinic-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    clearStoredSession();

    expect(loadStoredSession()).toBeNull();
  });

  it("restores the session from localStorage after a reload", async () => {
    const session = {
      user: {
        id: "user-1",
        name: "Administrador",
        email: "admin@odonto.local",
        status: "active",
        created_at: new Date().toISOString(),
      },
      memberships: [{ clinic_id: "clinic-1", clinic_name: "Odonto", role: "admin" as const, status: "active" }],
      activeClinicId: "clinic-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    };

    window.localStorage.setItem("odonto-bmo:session", JSON.stringify(session));

    vi.resetModules();
    const reloadedSessionModule = await import("@/lib/session");

    expect(reloadedSessionModule.loadStoredSession()).toEqual(session);
  });
});
