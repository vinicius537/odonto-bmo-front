import type { Membership, StoredSession, UserRole } from "@/features/auth/types";

const SESSION_EVENT = "odonto-bmo:session-updated";
const SESSION_STORAGE_KEY = "odonto-bmo:session";
const VALID_ROLES: UserRole[] = ["admin", "doutor", "secretaria"];

let memorySession: StoredSession | null = null;

function emitSessionChanged() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

function isValidMembership(value: unknown): value is Membership {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.clinic_id) &&
    isNonEmptyString(value.clinic_name) &&
    isUserRole(value.role) &&
    isNonEmptyString(value.status) &&
    (value.settings === undefined || isRecord(value.settings))
  );
}

function isValidUser(value: unknown): value is StoredSession["user"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.email) &&
    isNonEmptyString(value.status) &&
    isNonEmptyString(value.created_at)
  );
}

function sanitizeStoredSession(value: unknown): StoredSession | null {
  if (!isRecord(value) || !isValidUser(value.user)) {
    return null;
  }

  if (!Array.isArray(value.memberships) || !value.memberships.every(isValidMembership)) {
    return null;
  }

  if (!isNonEmptyString(value.accessToken) || !isNonEmptyString(value.refreshToken)) {
    return null;
  }

  return {
    user: value.user,
    memberships: value.memberships,
    activeClinicId: normalizeActiveClinicId(
      value.memberships,
      typeof value.activeClinicId === "string" ? value.activeClinicId : null,
    ),
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
  };
}

export function getSessionEventName() {
  return SESSION_EVENT;
}

export function loadStoredSession(): StoredSession | null {
  if (memorySession) {
    return memorySession;
  }

  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    const sanitized = sanitizeStoredSession(parsed);
    if (!sanitized) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    memorySession = sanitized;
    return sanitized;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveStoredSession(session: StoredSession) {
  const sanitized = sanitizeStoredSession(session);
  if (!sanitized) {
    throw new Error("Cannot persist an invalid auth session.");
  }

  memorySession = sanitized;
  getStorage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitized));
  emitSessionChanged();
}

export function clearStoredSession() {
  memorySession = null;
  getStorage()?.removeItem(SESSION_STORAGE_KEY);
  emitSessionChanged();
}

export function resolveActiveMembership(session: Pick<StoredSession, "memberships" | "activeClinicId">): Membership | null {
  if (!session.activeClinicId) {
    return null;
  }
  return session.memberships.find((membership) => membership.clinic_id === session.activeClinicId) ?? null;
}

export function resolveRole(session: Pick<StoredSession, "memberships" | "activeClinicId">): UserRole | null {
  return resolveActiveMembership(session)?.role ?? null;
}

export function normalizeActiveClinicId(memberships: Membership[], activeClinicId: string | null): string | null {
  if (activeClinicId && memberships.some((membership) => membership.clinic_id === activeClinicId)) {
    return activeClinicId;
  }

  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return memberships[0].clinic_id;
  }

  return null;
}
