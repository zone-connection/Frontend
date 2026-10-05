import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  fetchUsers,
  fetchUsersQuota,
  updateUser,
  type ApiUser,
  type UsersQuota,
} from "@/lib/users-api";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  defaultsFromRole,
  effectivePermissions,
  type UserPermissions,
} from "@/lib/user-permissions";
import { isPermissionModuleInTenant } from "@/lib/tenant-modules";
import { Copy, KeyRound, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const PASSWORD_HINT = "Mín. 8 caracteres, com maiúscula, minúscula e número.";

/** Módulos que fazem sentido no Solo (sem equipes/usuários/ranking). */
const SOLO_ASSISTENTE_MODULES = new Set(
  PERMISSION_MODULES.map((m) => m.key).filter(
    (key) =>
      key !== "equipes" &&
      key !== "usuarios" &&
      key !== "permissoes" &&
      key !== "corretores" &&
      key !== "clientes" &&
      key !== "clientesPerdidos",
  ),
);

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function emptyDraft(): UserPermissions {
  const base = defaultsFromRole("assistente");
  return {
    modules: { ...base.modules },
    actions: { ...base.actions },
  };
}

function applyModuleToggle(
  prev: UserPermissions,
  key: string,
  value: boolean,
): UserPermissions {
  const next: UserPermissions = {
    modules: { ...prev.modules, [key]: value },
    actions: { ...prev.actions },
  };
  if (key === "leadsPerdidos") next.actions["leads.viewLost"] = value;
  if (key === "leads") {
    next.actions["leads.view"] = value;
    next.actions["leads.create"] = value;
    next.actions["leads.edit"] = value;
    // No Solo o assistente precisa ver a carteira do corretor.
    next.actions["leads.viewOthers"] = value;
  }
  if (key === "financeiro") {
    next.actions["financeiro.access"] = value;
    if (value) {
      next.actions["financeiro.pagar.view"] = true;
      next.actions["financeiro.receber.view"] = true;
      next.actions["financeiro.fluxo"] = true;
    }
  }
  if (key === "comissao") next.actions["financeiro.comissao"] = value;
  return next;
}

export function ConfigUsuarioExtraPanel() {
  const session = getSession();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [quota, setQuota] = useState<UsersQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState<UserPermissions>(() => emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UserPermissions | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);

  const extras = users.filter((u) => u.id !== session?.id);
  const plano = session?.tenant?.plano ?? null;
  const tenantModules = session?.tenant?.modules ?? null;

  const moduleGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        modules: PERMISSION_MODULES.filter(
          (m) =>
            m.group === group.id &&
            SOLO_ASSISTENTE_MODULES.has(m.key) &&
            isPermissionModuleInTenant(m.key, plano, tenantModules),
        ),
      })).filter((g) => g.modules.length > 0),
    [plano, tenantModules],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, nextQuota] = await Promise.all([
        fetchUsers({ limit: 50 }),
        fetchUsersQuota(),
      ]);
      setUsers(list.data);
      setQuota(nextQuota);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os usuários.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setCreateModule(key: string, value: boolean) {
    setDraft((prev) => applyModuleToggle(prev, key, value));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nome = name.trim();
    const mail = email.trim().toLowerCase();
    if (!nome || !mail) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (!isStrongPassword(password)) {
      toast.error(PASSWORD_HINT);
      return;
    }
    if (quota && quota.restantes <= 0) {
      toast.error(
        `Limite do plano atingido (${quota.usados}/${quota.limite}).`,
      );
      return;
    }

    setSaving(true);
    try {
      const created = await createUser({
        name: nome,
        email: mail,
        password,
        role: "assistente",
        status: "ativo",
        permissions: draft,
      });
      setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
      setCredentials({
        name: created.name,
        email: created.email,
        password,
      });
      setName("");
      setEmail("");
      setPassword("");
      setDraft(emptyDraft());
      toast.success("Assistente cadastrado.");
      void fetchUsersQuota()
        .then(setQuota)
        .catch(() => undefined);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o usuário.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user: ApiUser) {
    setEditingId(user.id);
    setEditDraft(effectivePermissions(user.role, user.permissions));
  }

  async function saveEditPerms() {
    if (!editingId || !editDraft) return;
    setSavingPerms(true);
    try {
      const updated = await updateUser(editingId, { permissions: editDraft });
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
      toast.success("Permissões atualizadas.");
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar as permissões.",
      );
    } finally {
      setSavingPerms(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      if (editingId === target.id) {
        setEditingId(null);
        setEditDraft(null);
      }
      toast.success(`${target.name} excluído.`);
      void fetchUsersQuota()
        .then(setQuota)
        .catch(() => undefined);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o usuário.",
      );
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const canCreate = !quota || quota.restantes > 0;

  function renderModuleSwitches(
    perms: UserPermissions,
    onToggle: (key: string, value: boolean) => void,
    disabled?: boolean,
  ) {
    return (
      <div className="space-y-4">
        {moduleGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h4>
            <div className="space-y-2 rounded-lg border p-3">
              {group.modules.map((mod) => (
                <div
                  key={mod.key}
                  className="flex items-center justify-between gap-3"
                >
                  <Label
                    htmlFor={`perm-${mod.key}`}
                    className="text-sm font-normal"
                  >
                    {mod.label}
                  </Label>
                  <Switch
                    id={`perm-${mod.key}`}
                    checked={perms.modules[mod.key] === true}
                    onCheckedChange={(v) => onToggle(mod.key, v)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Assistente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No Solo você não cria corretor, gerente ou treinee. Cadastre um
            assistente e libere só os módulos que ele pode usar.
          </p>
          {quota ? (
            <p className="text-xs text-muted-foreground">
              {quota.usados}/{quota.limite} usuários no plano.
              {quota.restantes <= 0
                ? " Limite atingido."
                : ` ${quota.restantes} vaga restante.`}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : extras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum assistente cadastrado.
            </p>
          ) : (
            <div className="space-y-2">
              {extras.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${STATUS_CHIP_CLASS} bg-sky-500/15 text-sky-800 border-sky-500/30`}
                  >
                    Assistente
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(u)}
                  >
                    <KeyRound className="mr-1 h-3.5 w-3.5" />
                    Permissões
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(u)}
                    aria-label={`Excluir ${u.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {editingId && editDraft ? (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Permissões do assistente
                </h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingPerms}
                    onClick={() => void saveEditPerms()}
                  >
                    {savingPerms ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Salvando…
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>
              {renderModuleSwitches(editDraft, (key, value) =>
                setEditDraft((prev) =>
                  prev ? applyModuleToggle(prev, key, value) : prev,
                ),
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadastrar assistente</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="extra-nome">Nome</Label>
                <Input
                  id="extra-nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  disabled={!canCreate}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-email">E-mail</Label>
                <Input
                  id="extra-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={!canCreate}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="extra-senha">Senha inicial</Label>
                <Input
                  id="extra-senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={!canCreate}
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Módulos liberados</Label>
              <p className="text-xs text-muted-foreground">
                Marque o que o assistente poderá acessar. Você pode alterar
                depois.
              </p>
              {renderModuleSwitches(
                draft,
                setCreateModule,
                !canCreate,
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !canCreate}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Cadastrar assistente"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {credentials ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Credenciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anote e entregue a {credentials.name}. A senha só aparece agora.
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">E-mail</p>
                <code className="break-all text-sm">{credentials.email}</code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(credentials.email, "E-mail")}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Senha</p>
                <code className="break-all text-sm font-semibold">
                  {credentials.password}
                </code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(credentials.password, "Senha")}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <Button type="button" onClick={() => setCredentials(null)}>
              Entendi
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir assistente?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja excluir ${deleteTarget.name}? Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
