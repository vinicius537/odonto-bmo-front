import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Copy, CreditCard, Eye, EyeOff, QrCode, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/use-auth";
import type { CheckoutPixResponse } from "@/features/auth/api";
import { checkoutCardRequest, checkoutPixRequest } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";

const PASSWORD_REQUIREMENTS = [
  "Pelo menos 8 caracteres",
  "Ao menos 1 letra",
  "Ao menos 1 número",
];

interface PricingPlan {
  id: string;
  name: string;
  price_monthly: number;
  values: Record<string, unknown>;
  labels: Record<string, string>;
}

const FIELD_LABELS: Record<string, string> = {
  max_doctors: "Dentistas",
  max_secretaries: "Secretárias",
  clinicas: "Clínicas",
  pacientes: "Pacientes",
  agenda: "Agenda de Consultas",
  prontuario: "Prontuário Clínico",
  financeiro: "Módulo Financeiro",
  estoque: "Módulo de Estoque",
  mensagens: "Mensagens",
  comunicacao: "Comunicação (WhatsApp)",
  equipe: "Gestão de Equipe",
  relatorios: "Relatórios",
  satisfacao: "Pesquisa de Satisfação",
  support_priority: "Suporte Prioritário",
};

function formatPlanFeature(key: string, value: unknown): string | null {
  const label = FIELD_LABELS[key] ?? key;
  if (typeof value === "boolean") return value ? label : null;
  if (typeof value === "number") {
    if (value < 0) return `${label}: Ilimitado`;
    if (value === 0) return null;
    return `${label}: ${value}`;
  }
  return `${label}: ${value}`;
}

function PlanCell({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return value
      ? <Check className="h-5 w-5 text-primary mx-auto" />
      : <span className="text-muted-foreground/40 text-lg">—</span>;
  }
  if (typeof value === "number") {
    return <span className="text-sm font-medium">{value < 0 ? "Ilimitado" : value === 0 ? "—" : value}</span>;
  }
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground/40 text-lg">—</span>;
  }
  return <span className="text-sm">{String(value)}</span>;
}

function isActiveValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return value !== null && value !== undefined;
}

function PlanComparisonTable({
  plans,
  selectedPlan,
  onSelect,
}: {
  plans: PricingPlan[];
  selectedPlan: string;
  onSelect: (id: string) => void;
}) {
  // Collect ALL keys present in any plan's values (not limited to FIELD_LABELS)
  const allKeys = (() => {
    const keySet = new Set<string>();
    for (const plan of plans) {
      for (const key of Object.keys(plan.values)) {
        keySet.add(key);
      }
    }
    const fieldLabelsOrder = Object.keys(FIELD_LABELS);
    return Array.from(keySet).sort((a, b) => {
      // Sort by count of plans with active value (descending) → more plans active = higher
      const aCount = plans.filter((p) => isActiveValue(p.values[a])).length;
      const bCount = plans.filter((p) => isActiveValue(p.values[b])).length;
      if (aCount !== bCount) return bCount - aCount;
      // Same count: follow FIELD_LABELS order, then alphabetical
      const aIdx = fieldLabelsOrder.indexOf(a);
      const bIdx = fieldLabelsOrder.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });
  })();

  // Merge labels from all plans (all plans share the same schema)
  const fieldLabels: Record<string, string> = {};
  for (const plan of plans) {
    Object.assign(fieldLabels, plan.labels);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left pb-4 pr-6 font-semibold text-lg w-48 align-bottom">
              Compare as <span className="font-bold">funcionalidades</span>
            </th>
            {plans.map((plan, idx) => {
              const highlighted = plans.length > 1 && idx === Math.floor(plans.length / 2);
              const isSelected = selectedPlan === plan.id;
              const price = plan.price_monthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              return (
                <th key={plan.id} className="pb-4 px-3 text-center min-w-[140px] align-bottom">
                  <div className={`rounded-xl border-2 p-4 transition-all ${isSelected ? "border-primary bg-primary/5" : highlighted ? "border-primary/40" : "border-border"}`}>
                    {highlighted && (
                      <span className="inline-block mb-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                        Mais popular
                      </span>
                    )}
                    <div className="font-semibold text-base">{plan.name}</div>
                    <div className="mt-1 mb-3">
                      <span className="text-xl font-bold">{price}</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                    <Button
                      size="sm"
                      className={`w-full text-xs ${highlighted || isSelected ? "gradient-primary text-primary-foreground" : ""}`}
                      variant={highlighted || isSelected ? "default" : "outline"}
                      onClick={() => onSelect(plan.id)}
                    >
                      {isSelected ? "Selecionado ✓" : "Selecionar"}
                    </Button>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key, rowIdx) => (
            <tr key={key} className={rowIdx % 2 === 0 ? "bg-muted/40" : ""}>
              <td className="py-3 pr-6 text-sm font-medium rounded-l-md">{FIELD_LABELS[key] ?? fieldLabels[key] ?? key}</td>
              {plans.map((plan) => (
                <td key={plan.id} className="py-3 px-3 text-center">
                  <PlanCell value={plan.values[key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isPasswordStrong(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const Register = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [step, setStep] = useState<"plan" | "form" | "payment">("plan");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [paymentTab, setPaymentTab] = useState<"pix" | "card">("pix");
  // PIX state
  const [pixData, setPixData] = useState<CheckoutPixResponse | null>(null);
  const [isPixLoading, setIsPixLoading] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  // Card form state
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("");
  const [cardExpiryYear, setCardExpiryYear] = useState("");
  const [cardCCV, setCardCCV] = useState("");
  const [cardPostalCode, setCardPostalCode] = useState("");
  const [cardAddressNumber, setCardAddressNumber] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [cardInstallments, setCardInstallments] = useState(1);
  const [isCardSubmitting, setIsCardSubmitting] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { startRegister, status } = useAuth();

  const canSubmit = useMemo(
    () => name.trim() && email.trim() && document.trim() && password.trim() && confirmPassword.trim(),
    [confirmPassword, document, email, name, password],
  );

  const selectedPlanName = plans.find((p) => p.id === selectedPlan)?.name ?? "";

  useEffect(() => {
    fetch("/v1/subscriptions/pricing")
      .then((r) => r.json())
      .then((data: PricingPlan[]) => setPlans(data))
      .catch(() => { /* silently ignore — user will see empty list */ })
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(target, { replace: true });
    }
  }, [location.state, navigate, status]);

  const handleCopyPix = async () => {
    if (!pixData?.pix_copy_paste) return;
    try {
      await navigator.clipboard.writeText(pixData.pix_copy_paste);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", description: "Copie o código manualmente.", variant: "destructive" });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedEmail || !document.trim() || !normalizedPassword || !confirmPassword.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    if (!isPasswordStrong(normalizedPassword)) {
      toast({ title: "Senha fora do padrão", description: "Use os requisitos mínimos exibidos antes do formulário.", variant: "destructive" });
      return;
    }

    if (normalizedPassword !== confirmPassword.trim()) {
      toast({ title: "Senhas diferentes", description: "A confirmação precisa ser igual à senha.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await startRegister({
        name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword,
        plan_code: selectedPlan,
        document: document.trim(),
        phone: phone.trim() || undefined,
      });

      setPendingId(result.pending_id);
      setStep("payment");
    } catch (error) {
      const isConflict = error instanceof ApiError && error.status === 409;
      toast({
        title: "Falha ao iniciar cadastro",
        description: isConflict
          ? "Este e-mail já possui uma conta ativa. Faça login."
          : error instanceof Error
            ? error.message
            : "Não foi possível processar o cadastro agora. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-fill card phone from registration phone when switching to card tab
  const handleSelectCardTab = () => {
    setPaymentTab("card");
    if (!cardPhone && phone.trim()) setCardPhone(phone.trim());
  };

  const handleGeneratePix = async () => {
    if (!pendingId) return;
    setIsPixLoading(true);
    try {
      const result = await checkoutPixRequest({
        pending_id: pendingId,
        document: document.trim(),
        phone: phone.trim() || undefined,
      });
      setPixData(result);
    } catch (error) {
      toast({
        title: "Falha ao gerar cobrança PIX",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsPixLoading(false);
    }
  };

  const handleCardSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingId) return;
    setIsCardSubmitting(true);
    try {
      await checkoutCardRequest({
        pending_id: pendingId,
        document: document.trim(),
        phone: cardPhone.trim() || undefined,
        holder_name: cardHolderName.trim(),
        number: cardNumber.replace(/\s/g, ""),
        expiry_month: cardExpiryMonth.trim(),
        expiry_year: cardExpiryYear.trim(),
        ccv: cardCCV.trim(),
        postal_code: cardPostalCode.replace(/\D/g, ""),
        address_number: cardAddressNumber.trim(),
        installment_count: cardInstallments,
      });
      setCardSuccess(true);
    } catch (error) {
      toast({
        title: "Falha ao processar cartão",
        description: error instanceof Error ? error.message : "Tente novamente ou use PIX.",
        variant: "destructive",
      });
    } finally {
      setIsCardSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-64 w-64 rounded-full border border-primary-foreground/20" />
          <div className="absolute bottom-32 right-16 h-96 w-96 rounded-full border border-primary-foreground/20" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full border border-primary-foreground/20" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/20">
              <Stethoscope className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground">Odonto BMO</h1>
          </div>
          <h2 className="font-display mb-4 text-4xl font-bold leading-tight text-primary-foreground">
            {step === "plan" ? "Escolha seu plano" : step === "form" ? "Finalize seu cadastro" : "Pagamento"}
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/70">
            {step === "plan"
              ? "Selecione o plano ideal para sua clínica e comece a usar o sistema."
              : step === "form"
              ? "Preencha seus dados para criar sua conta e ir ao pagamento."
              : "Escolha como prefere pagar. Após a confirmação você receberá acesso ao sistema."}
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className={`w-full animate-fade-in ${step === "plan" ? "max-w-4xl" : "max-w-lg"}`}>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold">Odonto BMO</h1>
          </div>

          {step === "plan" && (
            <>
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-bold mb-2">
                  Qual é o seu <span className="text-primary">plano ideal?</span>
                </h2>
                <p className="text-muted-foreground">Você pode mudar de plano a qualquer momento.</p>
              </div>

              {loadingPlans && (
                <div className="flex justify-center py-10 text-muted-foreground text-sm">Carregando planos...</div>
              )}
              {!loadingPlans && plans.length === 0 && (
                <div className="flex justify-center py-10 text-muted-foreground text-sm">Nenhum plano disponível no momento.</div>
              )}
              {!loadingPlans && plans.length > 0 && (
                <PlanComparisonTable
                  plans={plans}
                  selectedPlan={selectedPlan}
                  onSelect={(id) => { setSelectedPlan(id); setStep("form"); }}
                />
              )}
            </>
          )}

          {step === "form" && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("plan")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Voltar
                </button>
                <span className="text-sm text-muted-foreground">
                  · Plano{" "}
                  <span className="font-medium text-foreground">{selectedPlanName}</span>
                </span>
              </div>

              <h2 className="font-display mb-1 text-2xl font-bold">Seus dados</h2>
              <p className="mb-4 text-muted-foreground text-sm">Preencha os campos abaixo para criar sua conta.</p>

              <div className="mb-5 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Requisitos da senha</p>
                <ul className="space-y-1">
                  {PASSWORD_REQUIREMENTS.map((req) => (
                    <li key={req}>• {req}</li>
                  ))}
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium">
                      Nome completo
                    </label>
                    <Input id="reg-name" type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="h-11" autoComplete="name" required />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium">
                      E-mail
                    </label>
                    <Input id="reg-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" autoComplete="email" required />
                  </div>

                  <div>
                    <label htmlFor="reg-document" className="mb-1.5 block text-sm font-medium">
                      CPF / CNPJ
                    </label>
                    <Input id="reg-document" type="text" placeholder="000.000.000-00" value={document} onChange={(e) => setDocument(e.target.value)} className="h-11" required />
                  </div>

                  <div>
                    <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium">
                      Telefone (opcional)
                    </label>
                    <Input id="reg-phone" type="tel" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium">
                    Senha
                  </label>
                  <div className="relative">
                    <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Crie uma senha" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <Input id="reg-confirm" type={showConfirmPassword ? "text" : "password"} placeholder="Repita sua senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 pr-10" autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showConfirmPassword ? "Ocultar" : "Mostrar"}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="gradient-primary h-11 w-full font-semibold text-primary-foreground"
                >
                  {isSubmitting ? "Processando..." : "Cadastrar e ir ao pagamento →"}
                </Button>
              </form>
            </>
          )}

          {step === "payment" && pendingId && (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold mb-1">Pagamento</h2>
                <p className="text-muted-foreground text-sm">
                  Plano <span className="font-medium text-foreground">{selectedPlanName}</span> ·{" "}
                  {plans.find((p) => p.id === selectedPlan)?.price_monthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                </p>
              </div>

              {/* Tab selector */}
              <div className="flex gap-2 mb-6 rounded-lg border p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setPaymentTab("pix")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${paymentTab === "pix" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <QrCode className="h-4 w-4" />
                  PIX
                </button>
                <button
                  type="button"
                  onClick={handleSelectCardTab}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${paymentTab === "card" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <CreditCard className="h-4 w-4" />
                  Cartão de Crédito
                </button>
              </div>

              {paymentTab === "pix" && (
                <div className="flex flex-col items-center gap-4">
                  {!pixData ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <QrCode className="h-12 w-12 text-muted-foreground" />
                      <p className="text-center text-sm text-muted-foreground">
                        Clique para gerar o QR Code e o código PIX.
                      </p>
                      <Button
                        type="button"
                        className="gradient-primary text-primary-foreground font-semibold"
                        onClick={handleGeneratePix}
                        disabled={isPixLoading}
                      >
                        {isPixLoading ? "Gerando..." : "Gerar cobrança PIX →"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {pixData.pix_qr_code && (
                        <div className="rounded-xl border p-3 bg-white">
                          <img
                            src={`data:image/png;base64,${pixData.pix_qr_code}`}
                            alt="QR Code PIX"
                            className="w-48 h-48"
                          />
                        </div>
                      )}
                      {pixData.pix_copy_paste && (
                        <div className="w-full">
                          <p className="text-sm font-medium mb-2">PIX Copia e Cola</p>
                          <div className="flex gap-2">
                            <Input
                              value={pixData.pix_copy_paste}
                              readOnly
                              className="text-xs font-mono h-10"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCopyPix}
                              className="h-10 px-3 shrink-0"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              {copiedPix ? "Copiado!" : "Copiar"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {paymentTab === "card" && (
                cardSuccess ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Check className="h-10 w-10 text-green-500" />
                    <p className="font-semibold text-lg">Pagamento enviado!</p>
                    <p className="text-sm text-muted-foreground">
                      Após a confirmação você receberá as instruções de acesso por e-mail.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleCardSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Nome no cartão</label>
                      <Input
                        type="text"
                        placeholder="Como aparece no cartão"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        className="h-11"
                        required
                        autoComplete="cc-name"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Número do cartão</label>
                      <Input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ""))}
                        maxLength={19}
                        className="h-11 font-mono"
                        required
                        autoComplete="cc-number"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Mês</label>
                        <Input
                          type="text"
                          placeholder="MM"
                          value={cardExpiryMonth}
                          onChange={(e) => setCardExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                          maxLength={2}
                          className="h-11"
                          required
                          autoComplete="cc-exp-month"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Ano</label>
                        <Input
                          type="text"
                          placeholder="AAAA"
                          value={cardExpiryYear}
                          onChange={(e) => setCardExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          maxLength={4}
                          className="h-11"
                          required
                          autoComplete="cc-exp-year"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">CVV</label>
                        <Input
                          type="text"
                          placeholder="000"
                          value={cardCCV}
                          onChange={(e) => setCardCCV(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          maxLength={4}
                          className="h-11"
                          required
                          autoComplete="cc-csc"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">CEP</label>
                        <Input
                          type="text"
                          placeholder="00000-000"
                          value={cardPostalCode}
                          onChange={(e) => setCardPostalCode(e.target.value.replace(/[^\d-]/g, "").slice(0, 9))}
                          className="h-11"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Número</label>
                        <Input
                          type="text"
                          placeholder="Ex: 42"
                          value={cardAddressNumber}
                          onChange={(e) => setCardAddressNumber(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Telefone do titular <span className="text-muted-foreground">(com DDD)</span></label>
                      <Input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={cardPhone}
                        onChange={(e) => setCardPhone(e.target.value)}
                        className="h-11"
                        required
                        autoComplete="tel"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Parcelas</label>
                      <select
                        value={cardInstallments}
                        onChange={(e) => setCardInstallments(Number(e.target.value))}
                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                          const plan = plans.find((p) => p.id === selectedPlan);
                          const total = plan ? (plan.price_monthly * n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
                          return (
                            <option key={n} value={n}>
                              {n}x {total ? `= ${total}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <Button
                      type="submit"
                      disabled={isCardSubmitting}
                      className="gradient-primary h-11 w-full font-semibold text-primary-foreground"
                    >
                      {isCardSubmitting ? "Processando..." : "Pagar com Cartão →"}
                    </Button>
                  </form>
                )
              )}

              <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                Após a confirmação do pagamento você receberá um e-mail com as instruções de acesso.
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Entrar no sistema
            </Link>
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground">Copyright 2026 Odonto BMO</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
