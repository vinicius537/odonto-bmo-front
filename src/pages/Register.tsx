import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Stethoscope, Check } from "lucide-react";

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

const PLANS = [
  {
    code: "basic",
    name: "Básico",
    price: "R$ 109",
    period: "/mês",
    features: ["1 usuário", "Agenda e pacientes", "Prontuários", "Mensagens"],
  },
  {
    code: "professional",
    name: "Profissional",
    price: "R$ 149",
    period: "/mês",
    features: ["Até 2 usuários", "Tudo do Básico", "Gestão de equipe", "Relatórios"],
    highlighted: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "R$ 219",
    period: "/mês",
    features: ["Usuários ilimitados", "Tudo do Profissional", "Estoque", "Suporte prioritário"],
  },
];

function isPasswordStrong(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const Register = () => {
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
        <div className="w-full max-w-lg animate-fade-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold">Odonto BMO</h1>
          </div>

          {step === "plan" ? (
            <>
              <h2 className="font-display mb-1 text-2xl font-bold">Escolha um plano</h2>
              <p className="mb-6 text-muted-foreground">Você pode mudar de plano a qualquer momento.</p>

              <div className="grid gap-4 mb-6">
                {PLANS.map((plan) => (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setSelectedPlan(plan.code)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      selectedPlan === plan.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    } ${plan.highlighted ? "relative" : ""}`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                        Mais popular
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-base">{plan.name}</p>
                        <ul className="mt-2 space-y-1">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-2xl font-bold">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                disabled={!selectedPlan}
                onClick={() => setStep("form")}
                className="gradient-primary h-11 w-full font-semibold text-primary-foreground"
              >
                Continuar com o plano {PLANS.find((p) => p.code === selectedPlan)?.name ?? ""}
              </Button>
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
                  <span className="font-medium text-foreground capitalize">{selectedPlan}</span>
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
