export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  level: NotificationLevel;
  createdAt: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = "odonto-bmo:notifications";
const NOTIFICATIONS_EVENT = "odonto-bmo:notifications-updated";
const MAX_NOTIFICATIONS = 50;

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

function emitNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
  }
}

function normalizeNotifications(value: unknown): NotificationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is NotificationItem => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as NotificationItem).id === "string" &&
        typeof (item as NotificationItem).title === "string" &&
        typeof (item as NotificationItem).description === "string" &&
        typeof (item as NotificationItem).level === "string" &&
        typeof (item as NotificationItem).createdAt === "string" &&
        typeof (item as NotificationItem).read === "boolean",
    );
  });
}

export function getNotificationsEventName() {
  return NOTIFICATIONS_EVENT;
}

export function loadNotifications() {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const rawValue = storage.getItem(NOTIFICATIONS_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    return normalizeNotifications(JSON.parse(rawValue));
  } catch {
    storage.removeItem(NOTIFICATIONS_KEY);
    return [];
  }
}

export function saveNotifications(items: NotificationItem[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  emitNotificationsChanged();
}

export function pushNotification(input: Omit<NotificationItem, "id" | "createdAt" | "read">) {
  const items = loadNotifications();
  saveNotifications([
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
      ...input,
    },
    ...items,
  ]);
}

export function markAllNotificationsAsRead() {
  const items = loadNotifications();
  saveNotifications(items.map((item) => ({ ...item, read: true })));
}

export function clearNotifications() {
  saveNotifications([]);
}
