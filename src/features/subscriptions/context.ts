import { createContext } from "react";

import type { AppModule } from "@/features/auth/types";
import type {
  ClinicSubscription,
  SubscriptionCheckoutInput,
  SubscriptionPlan,
} from "@/features/subscriptions/types";

export type SubscriptionStatus = "idle" | "loading" | "ready";

export interface SubscriptionContextValue {
  status: SubscriptionStatus;
  plans: SubscriptionPlan[];
  current: ClinicSubscription | null;
  hasActiveSubscription: boolean;
  moduleFlags: Partial<Record<AppModule, boolean>> | null;
  refresh: () => Promise<void>;
  checkout: (input: SubscriptionCheckoutInput) => Promise<ClinicSubscription>;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
