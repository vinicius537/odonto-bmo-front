import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/use-auth";
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
}

const FIELD_LABELS: Record<string, string> = {
  max_doctors: "Dentistas",
  max_secretaries: "Secretárias",
  estoque: "Módulo de Estoque",
  equipe: "Gestão de Equipe",
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

function isPasswordStrong(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const Register = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [step, setStep] = useState<"plan" | "form">("plan");
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
      const invoiceUrl = await startRegister({
        name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword,
        plan_code: selectedPlan,
        document: document.trim(),
        phone: phone.trim() || undefined,
      });

      if (invoiceUrl) {
        window.location.href = invoiceUrl;
      } else {
        navigate("/cadastro/pendente", { replace: true });
      }
    } catch (error) {
      const isConflict = error instanceof ApiError && error.status === 409;
      toast({
        title: "Falha ao iniciar cadastro",
        description: isConflict
          ? "Este e-mail já possui um cadastro pendente ou ativo."
          : error instanceof Error
            ? error.message
            : "Não foi possível processar o cadastro agora. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
            {step === "plan" ? "Escolha seu plano" : "Finalize seu cadastro"}
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/70">
            {step === "plan"
              ? "Selecione o plano ideal para sua clínica e comece a usar o sistema."
              : "Preencha seus dados para criar sua conta e ir ao pagamento."}
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

          {step === "plan" ? (
            <>
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-bold mb-2">
                  Qual é o seu <span className="text-primary">plano ideal?</span>
                </h2>
                <p className="text-muted-foreground">Você pode mudar de plano a qualquer momento.</p>
              </div>

              {loadingPlans ? (
                <div className="flex justify-center py-10 text-muted-foreground text-sm">Carregando planos...</div>
              ) : plans.length === 0 ? (
                <div className="flex justify-center py-10 text-muted-foreground text-sm">Nenhum plano disponível no momento.</div>
              ) : (() => {
                // Collect all feature keys across plans, preserving order from FIELD_LABELS
                const allKeys = Object.keys(FIELD_LABELS).filter((k) =>
                  plans.some((p) => k in p.values)
                );

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left pb-4 pr-6 font-semibold text-lg w-48">
                            Compare as<br />
                            <span className="font-bold">funcionalidades</span>
                          </th>
                          {plans.map((plan, idx) => {
                            const highlighted = plans.length > 1 && idx === Math.floor(plans.length / 2);
                            const price = plan.price_monthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                            const isSelected = selectedPlan === plan.id;
                            return (
                              <th key={plan.id} className="pb-4 px-3 text-center min-w-[140px]">
                                <div className={`rounded-xl border-2 p-4 transition-all ${isSelected ? "border-primary bg-primary/5" : highlighted ? "border-primary/40 bg-primary/3" : "border-border"}`}>
                                  {highlighted && (
                                    <span className="inline-block mb-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                                      Mais popular
                                    </span>
                                  )}
                                  <div className="font-semibold text-base">{plan.name}</div>
                                  <div className="mt-1">
                                    <span className="text-xl font-bold">{price}</span>
                                    <span className="text-xs text-muted-foreground">/mês</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    className={`mt-3 w-full text-xs ${isSelected ? "gradient-primary text-primary-foreground" : highlighted ? "gradient-primary text-primary-foreground" : ""}`}
                                    variant={isSelected || highlighted ? "default" : "outline"}
                                    onClick={() => { setSelectedPlan(plan.id); setStep("form"); }}
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
                            <td className="py-3 pr-6 text-sm font-medium">{FIELD_LABELS[key]}</td>
                            {plans.map((plan) => {
                              const val = plan.values[key];
                              let cell: React.ReactNode;
                              if (typeof val === "boolean") {
                                cell = val
                                  ? <Check className="h-5 w-5 text-primary mx-auto" />
                                  : <span className="text-muted-foreground/40 text-lg mx-auto block text-center">—</span>;
                              } else if (typeof val === "number") {
                                cell = <span className="text-sm font-medium">{val < 0 ? "Ilimitado" : val === 0 ? "—" : val}</span>;
                              } else if (val === undefined || val === null) {
                                cell = <span className="text-muted-foreground/40 text-lg block text-center">—</span>;
                              } else {
                                cell = <span className="text-sm">{String(val)}</span>;
                              }
                              return (
                                <td key={plan.id} className="py-3 px-3 text-center">
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          ) : (
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
              <p className="mb-4 text-muted-foreground text-sm">Após o cadastro você será redirecionado ao pagamento.</p>

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
                  {isSubmitting ? "Gerando link de pagamento..." : "Ir para o pagamento →"}
                </Button>
              </form>
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
