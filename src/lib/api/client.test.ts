import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/lib/api/client";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "@/lib/session";

describe("api client", () => {
  beforeEach(() => {
    clearStoredSession();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearStoredSession();
  });

  it("sends bearer auth and clinic headers for clinic scoped requests", async () => {
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

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }));

    await apiRequest("/patients", { clinic: true });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(init?.credentials).toBeUndefined();
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Clinic-ID")).toBe("clinic-1");
  });

  it("refreshes the bearer session and retries the request after a 401", async () => {
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
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
    });

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: "user-1",
              name: "Administrador",
              email: "admin@odonto.local",
              status: "active",
              created_at: new Date().toISOString(),
            },
            memberships: [{ clinic_id: "clinic-1", clinic_name: "Odonto", role: "admin", status: "active" }],
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "patient-1" }]), { status: 200, headers: { "Content-Type": "application/json" } }));

    const response = await apiRequest<Array<{ id: string }>>("/patients", { clinic: true });

    expect(response).toEqual([{ id: "patient-1" }]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/auth/refresh");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ refresh_token: "refresh-token" }));
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer new-access-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears the cached session when cookie refresh fails", async () => {
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
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
    });

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }));

    await expect(apiRequest("/patients", { clinic: true })).rejects.toMatchObject({ status: 401 });
    expect(loadStoredSession()).toBeNull();
  });

  it("returns plain text API errors without crashing the JSON parser", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("404 page not found", { status: 404, statusText: "Not Found", headers: { "Content-Type": "text/plain" } }),
    );

    await expect(apiRequest("/auth/register", { auth: false, method: "POST" })).rejects.toEqual(
      expect.objectContaining<ApiError>({
        status: 404,
        message: "404 page not found",
      }),
    );
  });
});
