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

export function startRegisterRequest(input: StartRegisterInput) {
  return apiRequest<{ invoice_url: string }>("/auth/start-register", {
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
