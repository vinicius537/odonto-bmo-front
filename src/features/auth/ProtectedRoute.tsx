import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { hasModuleAccess } from "@/features/auth/modules";
import { useAuth } from "@/features/auth/use-auth";
import type { AppModule } from "@/features/auth/types";
import { useSubscription } from "@/features/subscriptions/use-subscription";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="font-display text-xl font-semibold">Carregando sessão...</p>
        <p className="mt-2 text-sm text-muted-foreground">Conectando com a API da clínica.</p>
      </div>
    </div>
  );
}

function ClinicSelection() {
  const { memberships, selectClinic, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Escolha a clínica</h1>
          <p className="text-muted-foreground mt-2">
            {user?.name}, selecione o contexto de trabalho para continuar.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {memberships.map((membership) => (
            <button
              key={membership.clinic_id}
              type="button"
              onClick={() => selectClinic(membership.clinic_id)}
              className="rounded-2xl border bg-card p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <p className="font-display text-xl font-bold">{membership.clinic_name}</p>
              <p className="mt-2 text-sm text-muted-foreground">Perfil: {membership.role}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{membership.status}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForbiddenScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Seu perfil atual não tem permissão para acessar esta área clínica.
        </p>
        <Button asChild className="mt-6">
          <a href="/dashboard">Voltar ao dashboard</a>
        </Button>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { status, activeClinicId, memberships } = useAuth();
  const { status: subscriptionStatus, hasActiveSubscription } = useSubscription();
  const location = useLocation();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (memberships.length === 0) {
    if (location.pathname !== "/clinicas") {
      return <Navigate to="/clinicas" replace state={{ from: location }} />;
    }
    return <Outlet />;
  }

  if (!activeClinicId && memberships.length > 1) {
    return <ClinicSelection />;
  }

  if (memberships.length > 0 && activeClinicId) {
    if (subscriptionStatus === "loading" || subscriptionStatus === "idle") {
      return <LoadingScreen />;
    }

    if (!hasActiveSubscription && location.pathname !== "/assinatura" && location.pathname !== "/clinicas") {
      return <Navigate to="/assinatura" replace state={{ from: location }} />;
    }
  }

  return <Outlet />;
}

export function ModuleAccessRoute({ module }: { module: AppModule }) {
  const { status, activeMembership, memberships } = useAuth();
  const { moduleFlags } = useSubscription();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (module === "clinicas" && memberships.length === 0) {
    return <Outlet />;
  }

  if (!hasModuleAccess(activeMembership, module, moduleFlags)) {
    return <ForbiddenScreen />;
  }

  return <Outlet />;
}
