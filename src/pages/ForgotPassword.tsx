import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { forgotPasswordRequest } from "@/features/auth/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast({
        title: "Informe seu e-mail",
        description: "Preencha o e-mail usado no acesso da plataforma.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await forgotPasswordRequest({ email: normalizedEmail });
      toast({
        title: "Solicitação enviada",
        description: "Se o e-mail existir na plataforma, a API iniciará a recuperação de senha.",
      });
    } catch (error) {
      toast({
        title: "Falha ao solicitar redefinição",
        description: error instanceof Error ? error.message : "Nao foi possivel iniciar a recuperacao de senha.",
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
            Recuperar
            <br />
            acesso da conta
          </h2>
          <p className="max-w-md text-lg text-primary-foreground/70">
            Informe o e-mail do cadastro para solicitar a redefinição de senha pela API.
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

          <div className="mb-8">
            <h2 className="font-display mb-1 text-2xl font-bold">Esqueceu a senha?</h2>
            <p className="text-muted-foreground">
              Envie seu e-mail para receber as instruções de redefinição quando o serviço de e-mail estiver habilitado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting || !email.trim()} className="gradient-primary h-11 w-full font-semibold text-primary-foreground">
              {isSubmitting ? "Enviando..." : "Enviar recuperação"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Se você já tem um token de redefinição,{" "}
              <Link to="/redefinir-senha" className="font-medium text-primary hover:underline">
                redefina sua senha aqui
              </Link>
              .
            </p>
            <p>
              <Link to="/" className="font-medium text-primary hover:underline">
                Voltar para o login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
