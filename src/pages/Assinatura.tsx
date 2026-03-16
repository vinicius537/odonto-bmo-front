import { useMemo, useState } from "react";
import { BadgeCheck, CreditCard, QrCode, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/use-auth";
import { getSubscriptionPlanLabel } from "@/features/subscriptions/presentation";
import { useSubscription } from "@/features/subscriptions/use-subscription";
import type {
  SubscriptionCardInput,
  SubscriptionCheckoutInput,
  SubscriptionPaymentMethod,
  SubscriptionPlanCode,
} from "@/features/subscriptions/types";

const planContent: Record<
  SubscriptionPlanCode,
  {
    title: string;
    summary: string;
    highlights: string[];
    footnote: string;
  }
> = {
  basic: {
    title: "Plano Básico",
    summary: "Feito para o dentista que opera sozinho como administrador da plataforma.",
    highlights: [
      "Somente o dentista como administrador da conta",
      "Sem acesso a satisfação, equipe e estoque",
      "Fluxo completo de agenda, pacientes, prontuários, mensagens e financeiro",
    ],
    footnote: "Ideal para operação individual sem equipe interna.",
  },
  professional: {
    title: "Plano Profissional",
    summary: "Mais autonomia operacional com acesso total aos módulos da clínica.",
    highlights: [
      "Permite cadastrar 1 secretaria",
      "Libera todas as funcionalidades da plataforma",
      "Equilíbrio entre custo e operação assistida",
    ],
    footnote: "Perfeito para consultórios com atendimento apoiado por secretária.",
  },
  enterprise: {
    title: "Plano Empresarial",
    summary: "Escala completa para clínicas com equipe ampla e atendimento prioritário.",
    highlights: [
      "Secretarias e doutores ilimitados",
      "Todas as funcionalidades da plataforma",
      "Suporte prioritário e personalização de logo e cores",
    ],
    footnote: "Pensado para clínicas em crescimento e operação multiusuário.",
  },
};

const emptyCard: SubscriptionCardInput = {
  holder_name: "",
  number: "",
  expiry_month: "",
  expiry_year: "",
  cvv: "",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function maskCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function maskMonth(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function maskYear(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function maskCvv(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export default function Assinatura() {
  const navigate = useNavigate();
  const { activeMembership, activeRole } = useAuth();
  const { status, plans, current, hasActiveSubscription, checkout } = useSubscription();
  const [selectedPlanCode, setSelectedPlanCode] = useState<SubscriptionPlanCode>("professional");
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>("pix");
  const [card, setCard] = useState<SubscriptionCardInput>(emptyCard);
  const [pixCode, setPixCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) ?? null,
    [plans, selectedPlanCode],
  );

  const isAdmin = activeRole === "admin";
  const currentPlanCode = current?.plan_code ?? null;

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedPlan) {
      toast({
        title: "Plano indisponível",
        description: "Não foi possível carregar os detalhes do plano selecionado.",
        variant: "destructive",
      });
      return;
    }

    if (!isAdmin) {
      toast({
        title: "Ação restrita",
        description: "Somente o administrador da clínica pode contratar ou trocar o plano.",
        variant: "destructive",
      });
      return;
    }

    const payload: SubscriptionCheckoutInput = {
      plan_code: selectedPlan.code,
      payment_method: paymentMethod,
    };

    if (paymentMethod === "card") {
      payload.card = {
        holder_name: card.holder_name.trim(),
        number: card.number.replace(/\D/g, ""),
        expiry_month: card.expiry_month.trim(),
        expiry_year: card.expiry_year.trim(),
        cvv: card.cvv.trim(),
      };
    }

    setIsSubmitting(true);

    try {
      const result = await checkout(payload);
      setPixCode(result.pix_code ?? "");
      toast({
        title: "Plano confirmado",
        description: `O ${getSubscriptionPlanLabel(result.plan_code, result.plan_name)} foi ativado com sucesso para ${activeMembership?.clinic_name ?? "a clínica"}.`,
      });
    } catch (error) {
      toast({
        title: "Falha no pagamento",
        description: error instanceof Error ? error.message : "Não foi possível concluir a assinatura.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Assinatura</p>
            <h1 className="font-display text-3xl font-bold">Escolha o plano ideal para a sua clínica</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Selecione um dos três planos disponíveis e conclua o pagamento em PIX ou cartão de crédito para liberar os módulos da plataforma.
            </p>
          </div>
          {current && (
            <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">Plano atual</p>
              <p className="mt-1 text-muted-foreground">
                {getSubscriptionPlanLabel(current.plan_code, current.plan_name)} {current.is_active ? "ativo" : "pendente"}
              </p>
              {current.renews_at && (
                <p className="mt-1 text-xs text-muted-foreground">Renovação prevista em {new Date(current.renews_at).toLocaleDateString("pt-BR")}</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {plans.map((plan) => {
          const details = planContent[plan.code];
          const selected = plan.code === selectedPlanCode;
          const currentPlan = currentPlanCode === plan.code && hasActiveSubscription;

          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => setSelectedPlanCode(plan.code)}
              className={`rounded-3xl border p-6 text-left shadow-card transition-all ${
                selected ? "border-primary bg-primary/5 shadow-elevated" : "bg-card hover:-translate-y-0.5"
              }`}
              title={`Selecionar ${details.title}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{details.title}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(plan.price_cents)}</p>
                  <p className="text-sm text-muted-foreground">por mês</p>
                </div>
                {currentPlan && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Ativo
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{details.summary}</p>

              <ul className="mt-5 space-y-3 text-sm text-foreground">
                {details.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-xs text-muted-foreground">{details.footnote}</p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleCheckout} className="rounded-3xl border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {paymentMethod === "pix" ? <QrCode className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Pagamento</h2>
              <p className="text-sm text-muted-foreground">Escolha como deseja pagar a assinatura da clínica.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("pix")}
              className={`rounded-2xl border px-4 py-4 text-left ${paymentMethod === "pix" ? "border-primary bg-primary/5" : "bg-muted/20"}`}
              title="Pagar com PIX"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <QrCode className="h-4 w-4 text-primary" />
                PIX
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Geramos um código PIX para liberação imediata do plano no ambiente de testes.</p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`rounded-2xl border px-4 py-4 text-left ${paymentMethod === "card" ? "border-primary bg-primary/5" : "bg-muted/20"}`}
              title="Pagar com cartão de crédito"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Cartão de crédito
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Use cartão para ativar o plano com os dados de pagamento da clínica.</p>
            </button>
          </div>

          {paymentMethod === "card" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Nome impresso no cartão</label>
                <Input
                  value={card.holder_name}
                  onChange={(event) => setCard((current) => ({ ...current, holder_name: event.target.value }))}
                  placeholder="Nome do titular"
                  title="Informe o nome do titular do cartão"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Número do cartão</label>
                <Input
                  value={card.number}
                  onChange={(event) => setCard((current) => ({ ...current, number: maskCardNumber(event.target.value) }))}
                  placeholder="0000 0000 0000 0000"
                  title="Digite o número do cartão de crédito"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mes de vencimento</label>
                <Input
                  value={card.expiry_month}
                  onChange={(event) => setCard((current) => ({ ...current, expiry_month: maskMonth(event.target.value) }))}
                  placeholder="MM"
                  title="Use dois dígitos para o mês"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Ano de vencimento</label>
                <Input
                  value={card.expiry_year}
                  onChange={(event) => setCard((current) => ({ ...current, expiry_year: maskYear(event.target.value) }))}
                  placeholder="AAAA"
                  title="Use quatro digitos para o ano"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">CVV</label>
                <Input
                  value={card.cvv}
                  onChange={(event) => setCard((current) => ({ ...current, cvv: maskCvv(event.target.value) }))}
                  placeholder="123"
                  title="Código de segurança do cartão"
                />
              </div>
            </div>
          )}

          {pixCode && paymentMethod === "pix" && (
            <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">Código PIX gerado</p>
              <p className="mt-2 break-all rounded-xl bg-card px-3 py-2 font-mono text-sm">{pixCode}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {isAdmin ? "O plano será aplicado à clínica ativa imediatamente no ambiente local." : "Apenas o administrador pode contratar ou alterar o plano."}
            </div>
            <Button type="submit" disabled={!selectedPlan || isSubmitting || !isAdmin}>
              {isSubmitting ? "Processando..." : hasActiveSubscription ? "Atualizar assinatura" : "Ativar assinatura"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Resumo do plano</h2>
            {selectedPlan ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Plano selecionado</span>
                  <span className="font-semibold">{planContent[selectedPlan.code].title}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Valor mensal</span>
                  <span className="font-semibold">{formatCurrency(selectedPlan.price_cents)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Equipe</span>
                  <span className="font-semibold">
                    {selectedPlan.limits.max_secretaries < 0
                      ? "Secretárias ilimitadas"
                      : `${selectedPlan.limits.max_secretaries} secretária${selectedPlan.limits.max_secretaries === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Doutores extras</span>
                  <span className="font-semibold">
                    {selectedPlan.limits.max_doctors < 0 ? "Ilimitados" : selectedPlan.limits.max_doctors}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Carregando detalhes do plano.</p>
            )}
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Beneficios operacionais</h2>
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Controle de equipe</p>
                  <p>Os limites de secretaria e doutores passam a ser validados automaticamente conforme o plano ativo.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Modulos liberados por assinatura</p>
                  <p>Equipe, estoque e satisfação podem ser liberados ou bloqueados com base no plano contratado.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Expansão da operação</p>
                  <p>O plano empresarial habilita suporte prioritário e personalização visual do sistema.</p>
                </div>
              </div>
            </div>
          </div>

          {hasActiveSubscription && (
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-card">
              <p className="text-sm font-semibold text-primary">Assinatura ativa</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sua clínica já está com o plano <strong className="text-foreground">{getSubscriptionPlanLabel(current?.plan_code, current?.plan_name)}</strong> ativo. Se quiser, você pode trocar o plano agora.
              </p>
              <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => navigate("/dashboard")}>
                Ir para o dashboard
              </Button>
            </div>
          )}
        </aside>
      </section>

      {status === "loading" && (
        <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Carregando informações da assinatura da clínica...
        </div>
      )}
    </div>
  );
}
