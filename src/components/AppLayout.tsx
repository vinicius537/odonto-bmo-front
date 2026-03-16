import { Outlet } from "react-router-dom";
import { Building2 } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/features/auth/use-auth";
import { getSubscriptionPlanLabel } from "@/features/subscriptions/presentation";
import { useSubscription } from "@/features/subscriptions/use-subscription";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppLayout() {
  const { activeMembership, user, activeRole } = useAuth();
  const { current } = useSubscription();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-none">Painel operacional</p>
                <p className="text-[11px] text-muted-foreground">Dados sincronizados com a API</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              {activeMembership && (
                <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:flex">
                  <Building2 className="h-3.5 w-3.5" />
                  {activeMembership.clinic_name}
                </div>
              )}
              {current?.is_active && (
                <div className="hidden rounded-full border bg-card px-3 py-1 text-xs font-semibold text-foreground lg:block">
                  {getSubscriptionPlanLabel(current.plan_code, current.plan_name)}
                </div>
              )}
              <div className="flex items-center gap-2 border-l pl-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                  {user?.name
                    ?.split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() ?? "US"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium leading-none">{user?.name ?? "Usuário"}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">{activeRole ?? "sem perfil"}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
