import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Stethoscope } from "lucide-react";

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

function isPasswordStrong(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, status } = useAuth();

  const canSubmit = useMemo(
    () => name.trim() && email.trim() && password.trim() && confirmPassword.trim(),
    [confirmPassword, email, name, password],
  );

  useEffect(() => {
    if (status === "authenticated") {
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(target, { replace: true });
    }
  }, [location.state, navigate, status]);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword || !normalizedConfirmPassword) {
      toast({
        title: "Preencha todos os campos",
        description: "Informe nome, e-mail, senha e confirmação para criar sua conta.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordStrong(normalizedPassword)) {
      toast({
        title: "Senha fora do padrão",
        description: "Use os requisitos mínimos exibidos antes do formulário.",
        variant: "destructive",
      });
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "A confirmação da senha precisa ser igual à senha informada.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await register(normalizedName, normalizedEmail, normalizedPassword);
      toast({
        title: "Conta criada",
        description: "Seu cadastro foi enviado com sucesso. Agora você pode entrar no sistema.",
      });
      navigate("/", { replace: true });
    } catch (error) {
      const isMissingEndpoint = error instanceof ApiError && error.status === 404;
      toast({
        title: "Falha ao criar conta",
        description: isMissingEndpoint
          ? "O cadastro público ainda não está disponível nesta API. Peça ao administrador para criar seu acesso ou habilitar /auth/register no backend."
          : error instanceof Error
            ? error.message
            : "Não foi possível concluir o cadastro agora.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
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
            Crie seu acesso
            <br />
            com segurança
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/70">
            Cadastre seus dados para solicitar um novo acesso à plataforma da clínica.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold">Odonto BMO</h1>
          </div>

          <h2 className="font-display mb-1 text-2xl font-bold">Crie sua conta</h2>
          <p className="mb-6 text-muted-foreground">Preencha seus dados para solicitar um novo acesso ao sistema.</p>

          <div className="mb-6 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Requisitos mínimos da senha</p>
            <ul className="space-y-1">
              {PASSWORD_REQUIREMENTS.map((requirement) => (
                <li key={requirement}>• {requirement}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium">
                Nome
              </label>
              <Input
                id="register-name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium">
                E-mail
              </label>
              <Input
                id="register-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie uma senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium">
                Confirmar senha
              </label>
              <div className="relative">
                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="gradient-primary h-11 w-full font-semibold text-primary-foreground"
            >
              {isSubmitting ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Entrar no sistema
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">Copyright 2026 Odonto BMO</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
