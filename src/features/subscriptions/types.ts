import type { AppModule } from "@/features/auth/types";

export type SubscriptionPlanCode = "basic" | "professional" | "enterprise";
export type SubscriptionPaymentMethod = "pix" | "card";

export interface SubscriptionFeatures {
  modules?: Partial<Record<AppModule, boolean>>;
  priority_support?: boolean;
  custom_branding?: boolean;
}

export interface SubscriptionLimits {
  max_admins: number;
  max_doctors: number;
  max_secretaries: number;
  priority_support?: boolean;
  custom_branding?: boolean;
}

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  description: string;
  price_cents: number;
  billing_cycle: string;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
}

export interface ClinicSubscription {
  id: string;
  clinic_id: string;
  plan_code: SubscriptionPlanCode;
  plan_name: string;
  amount_cents: number;
  billing_cycle: string;
  status: string;
  payment_method: SubscriptionPaymentMethod;
  payment_status: string;
  pix_code?: string;
  card_last4?: string;
  card_brand?: string;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
  started_at: string;
  renews_at?: string | null;
  is_active: boolean;
}

export interface SubscriptionCurrentResponse {
  subscription: ClinicSubscription | null;
}

export interface SubscriptionCardInput {
  holder_name: string;
  number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
}

export interface SubscriptionCheckoutInput {
  plan_code: SubscriptionPlanCode;
  payment_method: SubscriptionPaymentMethod;
  card?: SubscriptionCardInput;
}
