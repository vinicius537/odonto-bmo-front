import { clearStoredSession, loadStoredSession, saveStoredSession } from "@/lib/session";
import type { AuthSessionResponse } from "@/features/auth/types";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "/v1";

let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  clinic?: boolean;
  retryOnUnauthorized?: boolean;
  query?: Record<string, string | number | boolean | null | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const target = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = path.startsWith("http") ? new URL(target) : new URL(target, baseOrigin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const contentType = response.headers.get("Content-Type") ?? "";
  let data: unknown = null;

  if (text) {
    if (contentType.includes("application/json")) {
      data = JSON.parse(text);
    } else {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: string }).error)
        : typeof data === "string" && data.trim()
          ? data
          : response.statusText || "API request failed";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

async function refreshStoredSession(): Promise<boolean> {
  const session = loadStoredSession();
  if (!session?.refreshToken) {
    clearStoredSession();
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: session.refreshToken,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          clearStoredSession();
          return false;
        }

        const nextSession = (await parseResponse<AuthSessionResponse>(response));
        saveStoredSession({
          user: nextSession.user,
          memberships: nextSession.memberships,
          activeClinicId: session.activeClinicId,
          accessToken: nextSession.access_token ?? session.accessToken,
          refreshToken: nextSession.refresh_token ?? session.refreshToken,
        });

        return true;
      })
      .catch(() => {
        clearStoredSession();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    clinic = false,
    retryOnUnauthorized = true,
    query,
  } = options;
  const shouldRetryUnauthorized = auth && retryOnUnauthorized && !path.startsWith("/auth/");
  const url = buildUrl(path, query);

  const session = loadStoredSession();
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  if (clinic && session?.activeClinicId) {
    headers.set("X-Clinic-ID", session.activeClinicId);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && shouldRetryUnauthorized) {
    const refreshed = await refreshStoredSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  return parseResponse<T>(response);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
