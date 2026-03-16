export type UserRole = "admin" | "doutor" | "secretaria";
export type AppModule =
  | "dashboard"
  | "clinicas"
  | "agenda"
  | "pacientes"
  | "financeiro"
  | "estoque"
  | "prontuarios"
  | "mensagens"
  | "satisfacao"
  | "relatorios"
  | "equipe"
  | "configuracoes";

export interface MembershipSettings {
  modules?: Partial<Record<AppModule, boolean>>;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

export interface Membership {
  clinic_id: string;
  clinic_name: string;
  role: UserRole;
  status: string;
  settings?: MembershipSettings;
}

export interface AuthSessionResponse {
  user: AuthUser;
  memberships: Membership[];
  access_token?: string;
  refresh_token?: string;
}

export interface StoredSession {
  user: AuthUser;
  memberships: Membership[];
  activeClinicId: string | null;
  accessToken: string;
  refreshToken: string;
}
