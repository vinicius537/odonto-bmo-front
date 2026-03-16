import { createContext } from "react";

import type { Membership, StoredSession, UserRole } from "@/features/auth/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  session: StoredSession | null;
  user: StoredSession["user"] | null;
  memberships: Membership[];
  activeClinicId: string | null;
  activeMembership: Membership | null;
  activeRole: UserRole | null;
  login: (email: string, password: string) => Promise<StoredSession>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectClinic: (clinicId: string) => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
