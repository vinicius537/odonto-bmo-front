import type { AuthSessionResponse } from "@/features/auth/types";
import { apiRequest } from "@/lib/api/client";

export interface RegisterAccountInput {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export function loginRequest(email: string, password: string) {
  return apiRequest<AuthSessionResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
    retryOnUnauthorized: false,
  });
}

export function registerRequest(input: RegisterAccountInput) {
  return apiRequest<{ status?: string; message?: string }>("/auth/register", {
    method: "POST",
    auth: false,
    body: input,
    retryOnUnauthorized: false,
  });
}

export interface StartRegisterInput {
  name: string;
  email: string;
  password: string;
  plan_code: string;
  document: string;
  phone?: string;
}

export interface StartRegisterResponse {
  pending_id: string;
}

export interface CheckoutPixInput {
  pending_id: string;
  document: string;
  phone?: string;
}

export interface CheckoutPixResponse {
  charge_id: string;
  pix_qr_code: string;
  pix_copy_paste: string;
}

export interface CheckoutCardInput {
  pending_id: string;
  document: string;
  phone?: string;
  holder_name: string;
  number: string;
  expiry_month: string;
  expiry_year: string;
  ccv: string;
  postal_code: string;
  address_number: string;
  installment_count: number;
}

export interface CheckoutCardResponse {
  charge_id: string;
  status: string;
}

export function startRegisterRequest(input: StartRegisterInput) {
  return apiRequest<StartRegisterResponse>("/auth/start-register", {
    method: "POST",
    auth: false,
    body: input,
    retryOnUnauthorized: false,
  });
}

export function checkoutPixRequest(input: CheckoutPixInput) {
  return apiRequest<CheckoutPixResponse>("/auth/checkout-pix", {
    method: "POST",
    auth: false,
    body: input,
    retryOnUnauthorized: false,
  });
}

export function checkoutCardRequest(input: CheckoutCardInput) {
  return apiRequest<CheckoutCardResponse>("/auth/checkout-card", {
    method: "POST",
    auth: false,
    body: input,
    retryOnUnauthorized: false,
  });
}

export function forgotPasswordRequest(input: ForgotPasswordInput) {
  return apiRequest<{ status?: string }>("/auth/password/forgot", {
    method: "POST",
    auth: false,
    body: input,
    retryOnUnauthorized: false,
  });
}

export function resetPasswordRequest(input: ResetPasswordInput) {
  return apiRequest<{ status?: string }>("/auth/password/reset", {
    method: "POST",
    auth: false,
    body: {
      token: input.token,
      new_password: input.password,
    },
    retryOnUnauthorized: false,
  });
}

export function logoutRequest() {
  throw new Error("logoutRequest requires a refresh token.");
}

export function logoutWithRefreshToken(refreshToken: string) {
  return apiRequest<{ status: string }>("/auth/logout", {
    method: "POST",
    body: {
      refresh_token: refreshToken,
    },
    retryOnUnauthorized: false,
  });
}

export function meRequest() {
  return apiRequest<AuthSessionResponse>("/auth/me");
}
