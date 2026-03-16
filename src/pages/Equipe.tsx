import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Stethoscope, UserRound, Users } from "lucide-react";

import { InfoTooltip } from "@/components/InfoTooltip";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { moduleCatalog, resolveModuleFlags } from "@/features/auth/modules";
import type { AppModule, UserRole } from "@/features/auth/types";
import { useAuth } from "@/features/auth/use-auth";
import type { ClinicUser, ClinicUserCreateInput, ClinicUserUpdateInput } from "@/features/clinics/api";
import { apiRequest } from "@/lib/api/client";
import { ensureArray } from "@/lib/collections";
import { pushNotification } from "@/lib/notifications";
import { translateGenericStatus, translateUserRole } from "@/lib/status-labels";
import { toast } from "@/components/ui/use-toast";

const roleStyles: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  doutor: "bg-success/10 text-success",
  secretaria: "bg-warning/10 text-warning",
};

type TeamStatus = "active" | "inactive";

interface TeamFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: TeamStatus;
  modules: Record<AppModule, boolean>;
}

function createInitialForm(role: UserRole = "secretaria"): TeamFormState {
  return {
    name: "",
    email: "",
    password: "",
    role,
    status: "active",
    modules: resolveModuleFlags(role),
  };
}

function mapUserToForm(user: ClinicUser): TeamFormState {
  return {
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    status: user.status.toLowerCase() === "inactive" ? "inactive" : "active",
    modules: resolveModuleFlags(user.role, user.settings),
  };
}

const Equipe = () => {
  const { activeClinicId, activeMembership, refreshProfile, session, status } = useAuth();
  const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClinicUser | null>(null);
  const [form, setForm] = useState<TeamFormState>(createInitialForm());
  const [isSaving, setIsSaving] = useState(false);

  const loadClinicUsers = useCallback(async () => {
    if (status !== "authenticated" || !activeClinicId) {
      setClinicUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest<ClinicUser[] | null>("/clinic-users", { clinic: true });
      setClinicUsers(ensureArray(response));
    } catch {
      setClinicUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeClinicId, status]);

  useEffect(() => {
    void loadClinicUsers();
  }, [loadClinicUsers]);

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingUser(null);
      setForm(createInitialForm());
    }
  }, [isDialogOpen]);

  const { activeUsers, admins, doctors, secretaries } = useMemo(() => {
    return {
      activeUsers: clinicUsers.filter((user) => user.status === "active" || user.status === "ativo").length,
      admins: clinicUsers.filter((user) => user.role === "admin").length,
      doctors: clinicUsers.filter((user) => user.role === "doutor").length,
      secretaries: clinicUsers.filter((user) => user.role === "secretaria").length,
    };
  }, [clinicUsers]);

  const canManageTeam = activeMembership?.role === "admin";

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(createInitialForm());
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: ClinicUser) => {
    setEditingUser(user);
    setForm(mapUserToForm(user));
    setIsDialogOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setForm((current) => ({
      ...current,
      role,
      modules: resolveModuleFlags(role),
    }));
  };

  const handleModuleToggle = (module: AppModule, checked: boolean) => {
    setForm((current) => ({
      ...current,
      modules: {
        ...current.modules,
        [module]: checked,
      },
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSaving(true);

      if (editingUser) {
        const input: ClinicUserUpdateInput = {
          role: form.role,
          status: form.status,
          settings: {
            modules: form.modules,
          },
        };

        await apiRequest<ClinicUser>(`/clinic-users/${editingUser.user_id}`, {
          clinic: true,
          method: "PATCH",
          body: input,
        });
      } else {
        const input: ClinicUserCreateInput = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          status: form.status,
          settings: {
            modules: form.modules,
          },
        };

        await apiRequest<ClinicUser>("/clinic-users", {
          clinic: true,
          method: "POST",
          body: input,
        });
      }

      await loadClinicUsers();

      if (!editingUser || editingUser.user_id === session?.user.id) {
        await refreshProfile();
      }

      pushNotification({
        title: editingUser ? "Acesso atualizado" : "Membro cadastrado",
        description: editingUser
          ? `As permissões de ${form.name} foram atualizadas na equipe.`
          : `${form.name} foi vinculado à clínica com os módulos selecionados.`,
        level: "success",
      });

      toast({
        title: editingUser ? "Acesso atualizado" : "Membro cadastrado",
        description: editingUser
          ? "As permissões da equipe foram atualizadas com sucesso."
          : "O novo usuário já foi vinculado à clínica com os módulos selecionados.",
      });

      setIsDialogOpen(false);
    } catch (error) {
      pushNotification({
        title: editingUser ? "Falha ao atualizar membro" : "Falha ao cadastrar membro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        level: "error",
      });
      toast({
        title: editingUser ? "Falha ao atualizar membro" : "Falha ao cadastrar membro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Equipe</h1>
            <InfoTooltip content="Cadastre pessoas da clínica, defina o perfil de acesso e ligue ou desligue módulos por usuário." />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Usuários vinculados a {activeMembership?.clinic_name ?? "clínica ativa"} com papel, status e módulos por mesa.
          </p>
        </div>
        {canManageTeam ? <Button onClick={openCreateDialog}>Novo membro</Button> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={String(clinicUsers.length)} icon={Users} />
        <StatCard title="Admins" value={String(admins)} icon={ShieldCheck} />
        <StatCard title="Doutores" value={String(doctors)} icon={Stethoscope} />
        <StatCard title="Secretárias" value={String(secretaries)} icon={UserRound} />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Membros da clínica</h2>
          <span className="text-xs text-muted-foreground">{activeUsers} ativos</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando equipe...</p>
        ) : clinicUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário foi retornado para esta clínica.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Nome</th>
                  <th className="pb-3 font-medium text-muted-foreground">Perfil</th>
                  <th className="pb-3 font-medium text-muted-foreground">E-mail</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Módulos</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clinicUsers.map((user) => {
                  const enabledModules = Object.values(resolveModuleFlags(user.role, user.settings)).filter(Boolean).length;
                  return (
                    <tr key={user.user_id}>
                      <td className="py-3 font-medium">{user.name}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleStyles[user.role] ?? "bg-muted text-muted-foreground"}`}>
                          {translateUserRole(user.role)}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3 text-muted-foreground">{translateGenericStatus(user.status)}</td>
                      <td className="py-3 text-muted-foreground">{enabledModules} ativos</td>
                      <td className="py-3 text-right">
                        {canManageTeam ? (
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                            Gerenciar acesso
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Consulta</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Gerenciar acesso da equipe" : "Novo membro da equipe"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Ajuste papel, status e módulos liberados para esta pessoa na clínica ativa."
                : "Cadastre secretária, doutor ou administrador já definindo os módulos liberados para a mesa."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  readOnly={Boolean(editingUser)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  readOnly={Boolean(editingUser)}
                  required
                />
              </div>
              {!editingUser ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Senha inicial</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </div>
              ) : null}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Perfil</label>
                <select
                  value={form.role}
                  onChange={(event) => handleRoleChange(event.target.value as UserRole)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="admin">Administrador</option>
                  <option value="doutor">Doutor</option>
                  <option value="secretaria">Secretária</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TeamStatus }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold">Módulos liberados</h3>
              <p className="mt-1 text-sm text-muted-foreground">Desative o que não deve aparecer para essa mesa ou perfil.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {moduleCatalog.map((module) => (
                  <label key={module.key} className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-3 text-sm">
                    <Checkbox
                      checked={form.modules[module.key]}
                      onCheckedChange={(checked) => handleModuleToggle(module.key, checked === true)}
                    />
                    <span>{module.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : editingUser ? "Atualizar acesso" : "Cadastrar membro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Equipe;
