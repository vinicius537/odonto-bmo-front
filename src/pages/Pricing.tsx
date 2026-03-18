import { useEffect, useState } from "react";
import { BadgeCheck, Boxes, HeartHandshake, Sparkles, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { listPricingPlansRequest } from "@/features/subscriptions/api";
import type { PricingPlan } from "@/features/subscriptions/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function boolVal(plan: PricingPlan, key: string): boolean {
  const v = plan.values[key];
  return v === true || v === 1;
}

function intVal(plan: PricingPlan, key: string, def = 0): number {
  const v = plan.values[key];
  return typeof v === "number" ? v : def;
}

function PlanCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const hasEstoque = boolVal(plan, "estoque");
  const hasSatisfacao = boolVal(plan, "satisfacao");
  const hasEquipe = boolVal(plan, "equipe");
  const hasPriority = boolVal(plan, "support_priority");
  const hasBranding = boolVal(plan, "custom_branding");
  const maxSec = intVal(plan, "max_secretaries", -2);

  const highlights: string[] = [];

  if (maxSec === -1) {
    highlights.push("Secretárias ilimitadas");
  } else if (maxSec === 0) {
    highlights.push("Somente o dentista administrador");
  } else if (maxSec > 0) {
    highlights.push(`Até ${maxSec} secretária${maxSec > 1 ? "s" : ""}`);
  }

  if (hasEstoque) highlights.push("Módulo de estoque");
  if (hasSatisfacao) highlights.push("Módulo de satisfação");
  if (hasEquipe) highlights.push("Gerenciamento de equipe");
  if (hasPriority) highlights.push("Suporte prioritário");
  if (hasBranding) highlights.push("Personalização visual (logo e cores)");

  highlights.push("Agenda, pacientes, financeiro e prontuários");

  const isHighlighted = index === 1;

  return (
    <div
      className={`relative rounded-3xl border p-6 shadow-card flex flex-col gap-4 ${
        isHighlighted ? "border-primary bg-primary/5 shadow-elevated" : "bg-card"
      }`}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          Mais popular
        </span>
      )}

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{plan.name}</p>
        <p className="mt-2 text-4xl font-bold text-foreground">{formatCurrency(plan.price_monthly)}</p>
        <p className="text-sm text-muted-foreground">por mês</p>
      </div>

      <ul className="space-y-3 text-sm text-foreground flex-1">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="w-full" variant={isHighlighted ? "default" : "outline"}>
        <Link to="/cadastro">Começar agora</Link>
      </Button>
    </div>
  );
}

export default function Pricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPricingPlansRequest()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold">Odonto BMO</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Planos</p>
          <h1 className="font-display text-4xl font-bold">Escolha o plano ideal para a sua clínica</h1>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            Todos os planos incluem os módulos essenciais: agenda, pacientes, financeiro, prontuários e mensagens.
            Escolha o nível de operação que melhor se adapta à sua equipe.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 rounded-3xl border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <p className="text-center text-muted-foreground">Não foi possível carregar os planos. Tente novamente em instantes.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} index={i} />
            ))}
          </div>
        )}

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border bg-card p-6 shadow-card text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold">Controle de equipe</h3>
            <p className="text-sm text-muted-foreground">Defina limites de secretárias e doutores conforme o plano contratado.</p>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-card text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
              <Boxes className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold">Módulos liberados por plano</h3>
            <p className="text-sm text-muted-foreground">Estoque, satisfação e equipe são liberados automaticamente conforme a assinatura.</p>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-card text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold">Suporte dedicado</h3>
            <p className="text-sm text-muted-foreground">Clínicas no plano Empresarial contam com atendimento prioritário e personalização visual.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
