import type { SubscriptionPlanCode } from "@/features/subscriptions/types";

const planLabels: Record<SubscriptionPlanCode, string> = {
  basic: "Plano Básico",
  professional: "Plano Profissional",
  enterprise: "Plano Empresarial",
};

export function getSubscriptionPlanLabel(planCode?: string | null, fallback?: string | null) {
  if (!planCode) {
    return fallback ?? "Plano";
  }

  return planLabels[planCode as SubscriptionPlanCode] ?? fallback ?? planCode;
}
