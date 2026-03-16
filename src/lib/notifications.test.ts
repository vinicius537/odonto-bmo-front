import { beforeEach, describe, expect, it } from "vitest";

import {
  clearNotifications,
  loadNotifications,
  markAllNotificationsAsRead,
  pushNotification,
} from "@/lib/notifications";

describe("notifications store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearNotifications();
  });

  it("stores new notifications in localStorage", () => {
    pushNotification({
      title: "Teste",
      description: "Notificação criada para validação.",
      level: "info",
    });

    const items = loadNotifications();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        title: "Teste",
        description: "Notificação criada para validação.",
        level: "info",
        read: false,
      }),
    );
  });

  it("marks all notifications as read", () => {
    pushNotification({
      title: "Primeira",
      description: "Ainda não lida.",
      level: "success",
    });
    pushNotification({
      title: "Segunda",
      description: "Também não lida.",
      level: "warning",
    });

    markAllNotificationsAsRead();

    expect(loadNotifications().every((item) => item.read)).toBe(true);
  });
});
