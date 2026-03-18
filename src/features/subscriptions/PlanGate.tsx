import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { AppModule } from "@/features/auth/types";
import { useSubscription } from "@/features/subscriptions/use-subscription";

interface PlanGateProps {
  module: AppModule;
  children: React.ReactNode;
}

/**
 * Renders children when the module is enabled in the active subscription.
 * Shows an upgrade prompt otherwise (graceful degradation — same behavior as backend planGate).
 */
export function PlanGate({ module, children }: PlanGateProps) {
  const { moduleFlags, status } = useSubscription();

  // While loading, render children optimistically (avoid flash)
  if (status !== "ready") {
    return <>{children}</>;
  }

  // No flags means no subscription loaded — allow access (same as backend behavior)
  if (!moduleFlags) {
    return <>{children}</>;
  }

  const enabled = moduleFlags[module] !== false;
  if (enabled) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border bg-card p-12 shadow-card text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-bold">Módulo não disponível</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Este módulo não está incluído no plano atual da clínica. Faça um upgrade para liberar o acesso.
        </p>
      </div>
      <Button asChild>
        <Link to="/assinatura">Ver planos</Link>
      </Button>
    </div>
  );
}
