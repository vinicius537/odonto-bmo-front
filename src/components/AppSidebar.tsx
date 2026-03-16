import {
  Calendar,
  Building2,
  Boxes,
  ChartColumnBig,
  CircleDollarSign,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Stethoscope,
  Users,
  WalletCards,
} from "lucide-react";

import { NavLink } from "@/components/NavLink";
import { hasModuleAccess } from "@/features/auth/modules";
import { useAuth } from "@/features/auth/use-auth";
import type { AppModule } from "@/features/auth/types";
import { useSubscription } from "@/features/subscriptions/use-subscription";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard", description: "Resumo da operação da clínica em tempo real." },
  { title: "Clínicas", url: "/clinicas", icon: Building2, module: "clinicas", description: "Cadastre, selecione e organize as clínicas vinculadas à conta." },
  { title: "Agenda", url: "/agenda", icon: Calendar, module: "agenda", description: "Visualize e mova consultas do dia a dia." },
  { title: "Pacientes", url: "/pacientes", icon: Users, module: "pacientes", description: "Mantenha o cadastro clínico dos pacientes atualizado." },
  { title: "Financeiro", url: "/financeiro", icon: CircleDollarSign, module: "financeiro", description: "Acompanhe lançamentos, entradas e saídas." },
  { title: "Estoque", url: "/estoque", icon: Boxes, module: "estoque", description: "Controle materiais, saldos e movimentações." },
];

const managementItems = [
  { title: "Prontuários", url: "/prontuarios", icon: FileText, module: "prontuarios", description: "Registre evolução, histórico e observações clínicas." },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare, module: "mensagens", description: "Dispare confirmações, lembretes e mensagens operacionais." },
  { title: "Satisfação", url: "/satisfacao", icon: HeartHandshake, module: "satisfacao", description: "Acompanhe follow-ups e retorno pós-atendimento." },
  { title: "Relatórios", url: "/relatorios", icon: ChartColumnBig, module: "relatorios", description: "Filtre e exporte consolidados da clínica." },
  { title: "Equipe", url: "/equipe", icon: Users, module: "equipe", description: "Gerencie perfis, status e módulos liberados por pessoa." },
  { title: "Configurações", url: "/configuracoes", icon: Settings, module: "configuracoes", description: "Ajuste dados da clínica e parâmetros operacionais." },
] satisfies Array<{ title: string; url: string; icon: typeof LayoutDashboard; module: AppModule; description: string }>;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { activeMembership, activeRole, logout } = useAuth();
  const { current, moduleFlags } = useSubscription();
  const hasActiveSubscription = Boolean(current?.is_active);
  const visibleMainItems = mainItems.filter((item) => {
    if (!hasActiveSubscription) {
      return item.module === "clinicas";
    }
    return activeMembership ? hasModuleAccess(activeMembership, item.module, moduleFlags) : item.module === "clinicas";
  });
  const visibleManagementItems = hasActiveSubscription
    ? managementItems.filter((item) => hasModuleAccess(activeMembership, item.module, moduleFlags))
    : [];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="gradient-sidebar h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Stethoscope className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-display text-base font-bold text-sidebar-primary-foreground">Odonto BMO</h1>
              <p className="text-[11px] text-sidebar-foreground/60">Operação integrada</p>
            </div>
          )}
        </div>

        <SidebarContent className="flex-1 px-2 py-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold mb-1 px-3">
              Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10" tooltip={item.description}>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold mb-1 px-3">
              Clínica
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleManagementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10" tooltip={item.description}>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {(activeRole === "admin" || !current?.is_active) && (
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold mb-1 px-3">
                Assinatura
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-10" tooltip="Escolha, troque e acompanhe o plano da clínica.">
                      <NavLink
                        to="/assinatura"
                        end
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium"
                      >
                        <WalletCards className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="text-sm">Assinatura</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-10" onClick={() => void logout()}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-all hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-sm">Sair</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
