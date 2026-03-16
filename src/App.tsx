import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/features/auth/auth-context";
import { ModuleAccessRoute, ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { SubscriptionProvider } from "@/features/subscriptions/subscription-context";
import { queryClient } from "@/lib/query-client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clinicas from "./pages/Clinicas";
import Estoque from "./pages/Estoque";
import Financeiro from "./pages/Financeiro";
import Pacientes from "./pages/Pacientes";
import Prontuarios from "./pages/Prontuarios";
import Relatorios from "./pages/Relatorios";
import Mensagens from "./pages/Mensagens";
import Satisfacao from "./pages/Satisfacao";
import Equipe from "./pages/Equipe";
import Configuracoes from "./pages/Configuracoes";
import Assinatura from "./pages/Assinatura";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/cadastro" element={<Register />} />
                <Route path="/esqueci-senha" element={<ForgotPassword />} />
                <Route path="/redefinir-senha" element={<ResetPassword />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/assinatura" element={<Assinatura />} />
                    <Route element={<ModuleAccessRoute module="dashboard" />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="clinicas" />}>
                      <Route path="/clinicas" element={<Clinicas />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="agenda" />}>
                      <Route path="/agenda" element={<Agenda />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="pacientes" />}>
                      <Route path="/pacientes" element={<Pacientes />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="financeiro" />}>
                      <Route path="/financeiro" element={<Financeiro />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="estoque" />}>
                      <Route path="/estoque" element={<Estoque />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="relatorios" />}>
                      <Route path="/relatorios" element={<Relatorios />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="satisfacao" />}>
                      <Route path="/satisfacao" element={<Satisfacao />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="prontuarios" />}>
                      <Route path="/prontuarios" element={<Prontuarios />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="mensagens" />}>
                      <Route path="/mensagens" element={<Mensagens />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="equipe" />}>
                      <Route path="/equipe" element={<Equipe />} />
                    </Route>
                    <Route element={<ModuleAccessRoute module="configuracoes" />}>
                      <Route path="/configuracoes" element={<Configuracoes />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </QueryClientProvider>
);

export default App;
