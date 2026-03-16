import type { AppModule, Membership, MembershipSettings, UserRole } from "@/features/auth/types";

export const moduleCatalog: Array<{ key: AppModule; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clinicas", label: "Clínicas" },
  { key: "agenda", label: "Agenda" },
  { key: "pacientes", label: "Pacientes" },
  { key: "financeiro", label: "Financeiro" },
  { key: "estoque", label: "Estoque" },
  { key: "prontuarios", label: "Prontuários" },
  { key: "mensagens", label: "Mensagens" },
  { key: "satisfacao", label: "Satisfação" },
  { key: "relatorios", label: "Relatórios" },
  { key: "equipe", label: "Equipe" },
  { key: "configuracoes", label: "Configurações" },
];

const defaultRoleModules: Record<UserRole, Record<AppModule, boolean>> = {
  admin: {
    dashboard: true,
    clinicas: true,
    agenda: true,
    pacientes: true,
    financeiro: true,
    estoque: true,
    prontuarios: true,
    mensagens: true,
    satisfacao: true,
    relatorios: true,
    equipe: true,
    configuracoes: true,
  },
  doutor: {
    dashboard: true,
    clinicas: false,
    agenda: true,
    pacientes: true,
    financeiro: false,
    estoque: false,
    prontuarios: true,
    mensagens: true,
    satisfacao: true,
    relatorios: true,
    equipe: false,
    configuracoes: false,
  },
  secretaria: {
    dashboard: true,
    clinicas: false,
    agenda: true,
    pacientes: true,
    financeiro: true,
    estoque: false,
    prontuarios: false,
    mensagens: true,
    satisfacao: true,
    relatorios: false,
    equipe: false,
    configuracoes: false,
  },
};

function extractModuleOverrides(settings?: MembershipSettings | null): Partial<Record<AppModule, boolean>> {
  if (!settings || typeof settings !== "object" || !settings.modules || typeof settings.modules !== "object") {
    return {};
  }

  const overrides: Partial<Record<AppModule, boolean>> = {};
  for (const module of moduleCatalog) {
    const value = settings.modules[module.key];
    if (typeof value === "boolean") {
      overrides[module.key] = value;
    }
  }

  return overrides;
}

export function resolveModuleFlags(role: UserRole, settings?: MembershipSettings | null): Record<AppModule, boolean> {
  return {
    ...defaultRoleModules[role],
    ...extractModuleOverrides(settings),
  };
}

export function hasModuleAccess(
  membership: Pick<Membership, "role" | "status" | "settings"> | null,
  module: AppModule,
  planModules?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (!membership) {
    return false;
  }

  const normalizedStatus = membership.status.toLowerCase();
  if (normalizedStatus !== "active" && normalizedStatus !== "ativo") {
    return false;
  }

  const roleAccess = resolveModuleFlags(membership.role, membership.settings)[module] ?? false;
  if (!roleAccess) {
    return false;
  }

  if (!planModules || typeof planModules[module] !== "boolean") {
    return roleAccess;
  }

  return roleAccess && Boolean(planModules[module]);
}
