import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/use-auth";
import { checkoutSubscriptionRequest, getCurrentSubscriptionRequest, listSubscriptionPlansRequest } from "@/features/subscriptions/api";
import { SubscriptionContext } from "@/features/subscriptions/context";
import { getSubscriptionPlanLabel } from "@/features/subscriptions/presentation";
import type { ClinicSubscription, SubscriptionCheckoutInput, SubscriptionPlan } from "@/features/subscriptions/types";
import { pushNotification } from "@/lib/notifications";

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, activeClinicId, memberships } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<ClinicSubscription | null>(null);

  const refresh = useCallback(async () => {
    if (authStatus !== "authenticated" || !activeClinicId || memberships.length === 0) {
      setPlans([]);
      setCurrent(null);
      setStatus(authStatus === "loading" ? "loading" : "idle");
      return;
    }

    setStatus("loading");
    const [plansResponse, currentResponse] = await Promise.all([
      listSubscriptionPlansRequest(),
      getCurrentSubscriptionRequest(),
    ]);

    setPlans(plansResponse);
    setCurrent(currentResponse.subscription ?? null);
    setStatus("ready");
  }, [activeClinicId, authStatus, memberships.length]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await refresh();
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (import.meta.env.DEV) {
          console.error("Falha ao carregar assinatura:", error);
        }
        setPlans([]);
        setCurrent(null);
        setStatus("ready");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const checkout = useCallback(async (input: SubscriptionCheckoutInput) => {
    const result = await checkoutSubscriptionRequest(input);
    setCurrent(result);
    setStatus("ready");
    pushNotification({
      title: "Assinatura ativada",
      description: `O plano ${getSubscriptionPlanLabel(result.plan_code, result.plan_name)} foi ativado para a clínica atual.`,
      level: "success",
    });
    return result;
  }, []);

  const value = useMemo(
    () => ({
      status,
      plans,
      current,
      hasActiveSubscription: Boolean(current?.is_active),
      moduleFlags: current?.features.modules ?? null,
      refresh,
      checkout,
    }),
    [checkout, current, plans, refresh, status],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
