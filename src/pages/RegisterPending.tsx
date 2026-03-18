import { Stethoscope, Clock } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const RegisterPending = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mb-6 flex justify-center">
          <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-2xl">
            <Stethoscope className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Clock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <h1 className="font-display mb-2 text-2xl font-bold">Pagamento em processamento</h1>
        <p className="mb-6 text-muted-foreground">
          Assim que o pagamento for confirmado, sua conta será criada automaticamente e você receberá um e-mail com as
          instruções de acesso.
        </p>

        <div className="mb-8 rounded-xl border bg-muted/20 p-4 text-sm text-left space-y-2">
          <p className="font-medium">O que acontece agora?</p>
          <ol className="space-y-1 text-muted-foreground list-none">
            <li>1. Seu pagamento é processado pelo Asaas</li>
            <li>2. Após confirmação, sua clínica é ativada automaticamente</li>
            <li>3. Você recebe um e-mail com seus dados de acesso</li>
            <li>4. Entre normalmente pela tela de login</li>
          </ol>
        </div>

        <Button asChild variant="outline" className="w-full h-11">
          <Link to="/">Ir para o login</Link>
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">Copyright 2026 Odonto BMO</p>
      </div>
    </div>
  );
};

export default RegisterPending;
