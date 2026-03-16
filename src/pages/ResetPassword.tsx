import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { resetPasswordRequest } from "@/features/auth/api";

const PASSWORD_REQUIREMENTS = [
  "Pelo menos 8 caracteres",
  "Ao menos 1 letra",
  "Ao menos 1 número",
];

function isPasswordStrong(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => token.trim() && password.trim() && confirmPassword.trim(),
    [confirmPassword, password, token],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedToken = token.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedToken) {
      toast({
        title: "Token obrigatório",
        description: "Informe o token enviado pela recuperação de senha.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordStrong(normalizedPassword)) {
      toast({
        title: "Senha fora do padrão",
        description: "Use os requisitos mínimos mostrados acima do formulário.",
        variant: "destructive",
      });
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "A confirmação precisa ser igual à nova senha.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPasswordRequest({ token: normalizedToken, password: normalizedPassword });
      toast({
        title: "Senha redefinida",
        description: "A senha foi atualizada com sucesso. Agora você já pode entrar.",
      });
    } catch (error) {
      toast({
        title: "Falha ao redefinir senha",
        description: error instanceof Error ? error.message : "Não foi possível redefinir a senha agora.",
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
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/20">
              <Stethoscope className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground">Odonto BMO</h1>
          </div>
          <h2 className="font-display mb-4 text-4xl font-bold leading-tight text-primary-foreground">
            Defina
            <br />
            uma nova senha
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/70">
            Use o token recebido na recuperação para concluir a redefinição com segurança.
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

          <div className="mb-6">
            <h2 className="font-display mb-1 text-2xl font-bold">Redefinir senha</h2>
            <p className="text-muted-foreground">Cole o token recebido e informe sua nova senha.</p>
          </div>

          <div className="mb-6 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Requisitos mínimos da senha</p>
            <ul className="space-y-1">
              {PASSWORD_REQUIREMENTS.map((requirement) => (
                <li key={requirement}>• {requirement}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-token" className="mb-1.5 block text-sm font-medium">
                Token de redefinição
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="h-11 pl-10"
                  placeholder="Cole aqui o token recebido"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pr-10"
                  placeholder="Digite sua nova senha"
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
              <label htmlFor="reset-confirm-password" className="mb-1.5 block text-sm font-medium">
                Confirmar nova senha
              </label>
              <div className="relative">
                <Input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 pr-10"
                  placeholder="Repita a nova senha"
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

            <Button type="submit" disabled={!canSubmit || isSubmitting} className="gradient-primary h-11 w-full font-semibold text-primary-foreground">
              {isSubmitting ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-medium text-primary hover:underline">
              Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
