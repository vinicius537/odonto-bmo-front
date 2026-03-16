import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(target, { replace: true });
    }
  }, [location.state, navigate, status]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      toast({
        title: "Informe suas credenciais",
        description: "Preencha e-mail e senha para entrar na plataforma.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await login(normalizedEmail, normalizedPassword);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast({
        title: "Falha no login",
        description:
          error instanceof ApiError && error.status === 401
            ? "E-mail ou senha inválidos."
            : error instanceof Error
              ? error.message
              : "Não foi possível autenticar agora.",
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
            Gestão inteligente
            <br />
            para sua clínica
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/70">
            Entre com sua conta e continue a operação da clínica com agenda, pacientes, prontuários e mensagens integrados.
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

          <h2 className="font-display mb-1 text-2xl font-bold">Bem-vindo de volta</h2>
          <p className="mb-8 text-muted-foreground">Faça login para acessar o sistema integrado.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">E-mail</label>
              <Input
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
              <label className="mb-1.5 block text-sm font-medium">Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pr-10"
                  autoComplete="current-password"
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

            <Button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="gradient-primary h-11 w-full font-semibold text-primary-foreground"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/esqueci-senha" className="font-medium text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">Copyright 2026 Odonto BMO</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
