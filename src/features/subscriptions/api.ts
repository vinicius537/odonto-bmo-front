import { apiRequest } from "@/lib/api/client";

import type {
  ClinicSubscription,
  SubscriptionCheckoutInput,
  SubscriptionCurrentResponse,
  SubscriptionPlan,
} from "@/features/subscriptions/types";

export function listSubscriptionPlansRequest() {
  return apiRequest<SubscriptionPlan[]>("/subscriptions/plans", {
    clinic: true,
  });
}

export function getCurrentSubscriptionRequest() {
  return apiRequest<SubscriptionCurrentResponse>("/subscriptions/current", {
    clinic: true,
  });
}

export function checkoutSubscriptionRequest(input: SubscriptionCheckoutInput) {
  return apiRequest<ClinicSubscription>("/subscriptions/checkout", {
    method: "POST",
    clinic: true,
    body: input,
  });
}
