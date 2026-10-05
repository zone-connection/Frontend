import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (selected?.role === "corretor" && key === "presenca") return;
    setDraft((prev) => {
      if (!prev) return prev;
      const next: UserPermissions = {
        modules: { ...prev.modules, [key]: value },
        actions: { ...prev.actions },
      };
      if (key === "leadsPerdidos") next.actions["leads.viewLost"] = value;
      if (key === "leads") next.actions["leads.view"] = value;
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

  const visibleActionModules = useMemo(
    () =>
      (["leads", "financeiro"] as const).filter((moduleKey) =>
        isPermissionModuleInTenant(moduleKey, plano, tenantModules),
      ),
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

              {visibleGroups.map((group) => {
                const modules = group.modules;
                return (
                  <div key={group.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary">
                      {group.label}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {modules.map((mod) => (
                        <label
                          key={mod.key}
                          className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2"
                        >
                          <span className="text-sm">{mod.label}</span>
                          <Switch
                            checked={draft.modules[mod.key] === true}
                            disabled={
                              !canEdit ||
                              (selected?.role === "corretor" &&
                                mod.key === "presenca")
                            }
                            onCheckedChange={(v) => setModule(mod.key, v)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {visibleActionModules.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary">
                  Ações específicas
                </h3>
                <p className="text-xs text-muted-foreground">
                  Controlam o que o usuário pode fazer dentro do módulo.
                </p>
                {visibleActionModules.map((moduleKey) => {
                  const actions = PERMISSION_ACTIONS.filter(
                    (a) => a.module === moduleKey,
                  );
                  return (
                    <div key={moduleKey} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        {moduleKey === "leads" ? "Leads" : "Financeiro"}
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {actions.map((action) => (
                          <label
                            key={action.key}
                            className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2"
                          >
                            <span className="text-sm">{action.label}</span>
                            <Switch
                              checked={draft.actions[action.key] === true}
                              disabled={!canEdit}
                              onCheckedChange={(v) => setAction(action.key, v)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
