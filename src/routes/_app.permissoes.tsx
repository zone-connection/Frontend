import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession } from "@/lib/auth";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { FILTER_CONTROL } from "@/lib/filter-bar";
import { cn } from "@/lib/utils";
import { fetchUsers, updateUser, type ApiUser } from "@/lib/users-api";
import { isPermissionModuleInTenant } from "@/lib/tenant-modules";
import {
  PERMISSION_ACTIONS,
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  defaultsFromRole,
  effectivePermissions,
  type UserPermissions,
} from "@/lib/user-permissions";

export const Route = createFileRoute("/_app/permissoes")({
  head: () => ({ meta: [{ title: "Permissões — Zone Connection" }] }),
  component: Page,
});

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
  analista: "Analista",
  treinee: "Treinee",
  financeiro: "Financeiro",
  rh: "RH",
  assistente: "Assistente",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Page() {
  const session = getSession();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserPermissions | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchUsers({ limit: 100, status: "ativo" });
      setUsers(page.data.filter((u) => u.role !== "super_admin"));
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_LABEL[u.role].toLowerCase().includes(q),
    );
  }, [search, users]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  function selectUser(user: ApiUser) {
    setSelectedId(user.id);
    setDraft(effectivePermissions(user.role, user.permissions, plano));
  }

  function setModule(key: string, value: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next: UserPermissions = {
        modules: { ...prev.modules, [key]: value },
        actions: { ...prev.actions },
      };
      for (const verb of ["view", "create", "edit", "delete"]) {
        next.actions[`${key}.${verb}`] = value;
      }
      for (const action of PERMISSION_ACTIONS) {
        const sameModule = action.module === key;
        const comissao =
          key === "comissao" && action.key === "financeiro.comissao";
        const financeiro =
          key === "financeiro" && action.module === "financeiro";
        if (sameModule || comissao || financeiro) {
          next.actions[action.key] = value;
        }
      }
      return next;
    });
  }

  function setVerb(key: string, verb: string, value: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      const actions = { ...prev.actions, [`${key}.${verb}`]: value };
      const modules = { ...prev.modules, [key]: value || prev.modules[key] === true };
      if (!value && verb === "view") {
        modules[key] = false;
        for (const item of ["view", "create", "edit", "delete"]) {
          actions[`${key}.${item}`] = false;
        }
        for (const action of PERMISSION_ACTIONS) {
          if (action.module === key) actions[action.key] = false;
        }
      }
      if (value) modules[key] = true;
      return { modules, actions };
    });
  }

  function setAll(value: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next: UserPermissions = {
        modules: { ...prev.modules },
        actions: { ...prev.actions },
      };
      for (const group of visibleGroups) {
        for (const mod of group.modules) {
          next.modules[mod.key] = value;
          for (const verb of ["view", "create", "edit", "delete"]) {
            next.actions[`${mod.key}.${verb}`] = value;
          }
          for (const action of PERMISSION_ACTIONS) {
            if (action.module === mod.key) next.actions[action.key] = value;
          }
        }
      }
      return next;
    });
  }

  function setAction(key: string, value: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next: UserPermissions = {
        modules: { ...prev.modules },
        actions: { ...prev.actions, [key]: value },
      };
      if (key === "leads.viewLost") next.modules.leadsPerdidos = value;
      if (key === "leads.view") next.modules.leads = value;
      if (key === "financeiro.access") next.modules.financeiro = value;
      if (key === "financeiro.comissao") next.modules.comissao = value;
      return next;
    });
  }

  async function save() {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      const updated = await updateUser(selected.id, { permissions: draft });
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
      if (session?.id === selected.id) {
        await fetchMe();
      }
      toast.success("Permissões atualizadas.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar as permissões.",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetToRole() {
    if (!selected) return;
    setDraft(defaultsFromRole(selected.role, plano));
  }

  const canEdit = session?.role === "admin";
  const plano = session?.tenant?.plano ?? null;
  const tenantModules = session?.tenant?.modules ?? null;

  const visibleGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        modules: PERMISSION_MODULES.filter(
          (m) =>
            m.group === group.id &&
            isPermissionModuleInTenant(m.key, plano, tenantModules),
        ),
      })).filter((g) => g.modules.length > 0),
    [plano, tenantModules],
  );

  return (
    <div>
      <PageHeader
        title="Permissões e acessos"
        description="Defina módulos e ações por usuário, independentemente do cargo."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-primary/15 bg-card p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuário…"
              className={cn("h-9 pl-9", FILTER_CONTROL)}
            />
          </div>
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-8 text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => selectUser(user)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors",
                      selectedId === user.id
                        ? "bg-primary/12 text-foreground"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[11px]">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {ROLE_LABEL[user.role]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-2xl border border-primary/15 bg-card p-4 sm:p-5">
          {!selected || !draft ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <UserRound className="h-8 w-8 text-primary/50" />
              <p className="text-sm">
                Selecione um usuário para ver e alterar as permissões.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.email}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {ROLE_LABEL[selected.role]}
                  </Badge>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={resetToRole}>
                      Restaurar do cargo
                    </Button>
                    <Button
                      type="button"
                      disabled={saving}
                      className={BRAND_GRADIENT_BTN}
                      style={BRAND_GRADIENT_STYLE}
                      onClick={() => void save()}
                    >
                      {saving ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="mr-1 h-4 w-4" />
                      )}
                      Salvar permissões
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Somente o administrador altera permissões.
                  </p>
                )}
              </div>

              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setAll(true)}>
                    Ativar todas
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setAll(false)}>
                    Desativar todas
                  </Button>
                </div>
              ) : null}

              {visibleGroups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-primary">
                    {group.label}
                  </h3>
                  <div className="grid gap-3">
                    {group.modules.map((mod) => {
                      const verbs = [
                        ["view", "Visualizar"],
                        ["create", "Criar"],
                        ["edit", "Editar"],
                        ["delete", "Excluir"],
                      ] as const;
                      const specific = PERMISSION_ACTIONS.filter(
                        (action) => action.module === mod.key,
                      );
                      const verbOn = (verb: string) =>
                        draft.actions[`${mod.key}.${verb}`] === true ||
                        (draft.actions[`${mod.key}.${verb}`] !== false &&
                          draft.modules[mod.key] === true);
                      const total =
                        verbs.every(([verb]) => verbOn(verb)) &&
                        specific.every((action) => draft.actions[action.key] === true);
                      return (
                        <div key={mod.key} className="rounded-xl border bg-background/70 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">{mod.label}</span>
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              Acesso total
                              <Switch
                                checked={total}
                                disabled={!canEdit}
                                onCheckedChange={(value) => setModule(mod.key, value)}
                              />
                            </label>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {verbs.map(([verb, label]) => (
                              <label
                                key={verb}
                                className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5"
                              >
                                <span className="text-xs">{label}</span>
                                <Switch
                                  checked={verbOn(verb)}
                                  disabled={!canEdit}
                                  onCheckedChange={(value) => setVerb(mod.key, verb, value)}
                                />
                              </label>
                            ))}
                          </div>
                          {specific.length > 0 ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {specific.map((action) => (
                                <label
                                  key={action.key}
                                  className="flex items-center justify-between gap-3 rounded-lg border px-2 py-1.5"
                                >
                                  <span className="text-xs">{action.label}</span>
                                  <Switch
                                    checked={draft.actions[action.key] === true}
                                    disabled={!canEdit}
                                    onCheckedChange={(value) => setAction(action.key, value)}
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
