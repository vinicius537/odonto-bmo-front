import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateValue } from "@/lib/date";
import {
  clearNotifications,
  getNotificationsEventName,
  loadNotifications,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/notifications";

const levelStyles: Record<NotificationItem["level"], string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
};

const levelLabels: Record<NotificationItem["level"], string> = {
  info: "Informação",
  success: "Sucesso",
  warning: "Aviso",
  error: "Erro",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadNotifications());
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    const eventName = getNotificationsEventName();
    const handleChange = () => setNotifications(loadNotifications());
    window.addEventListener(eventName, handleChange);
    return () => {
      window.removeEventListener(eventName, handleChange);
    };
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Abrir notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold">Notificações</h3>
              <p className="text-xs text-muted-foreground">Ações recentes e avisos da plataforma.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => markAllNotificationsAsRead()} title="Marcar todas como lidas">
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => clearNotifications()} title="Limpar notificações">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação registrada até o momento.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div key={notification.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelStyles[notification.level]}`}>
                          {levelLabels[notification.level]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.description}</p>
                    </div>
                    {!notification.read ? <span className="mt-1 h-2 w-2 rounded-full bg-primary" /> : null}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {formatDateValue(notification.createdAt, "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
