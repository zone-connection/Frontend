import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isCorretorLike } from "@/lib/permissions";
import {
  createEquipe,
  deleteEquipe,
  fetchEquipeCorretores,
  fetchEquipeGerentes,
  fetchEquipes,
  putEquipeFunis,
  updateEquipe,
  type Equipe,
  type EquipeFunisMap,
  type EquipeMember,
  type EquipeOptionUser,
} from "@/lib/equipes-api";
import {
  fetchFunis,
  FUNIL_TIPO_LABEL,
  FUNIL_TIPOS,
  type Funil,
  type FunilTipo,
} from "@/lib/funis-api";
import { resetUserPassword } from "@/lib/users-api";
import {
  Network,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Users,
  UserCog,
  Crown,
  KeyRound,
  Copy,
  Check,
  Shield,
  ChevronDown,
  GitFork,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/equipes")({
  head: () => ({ meta: [{ title: "Equipes — Zone Connection" }] }),
  component: EquipesPage,
});

type FormState = {
  name: string;
  gerenteId: string;
  membroIds: string[];
  status: "ativo" | "inativo";
  funis: Record<FunilTipo, string>;
};

const NONE_FUNIL = "__none__";

const emptyFunisForm = (): Record<FunilTipo, string> => ({
  comercial: "",
  captacao: "",
  venda_usados: "",
});

const emptyForm = (): FormState => ({
  name: "",
  gerenteId: "",
  membroIds: [],
  status: "ativo",
  funis: emptyFunisForm(),
});

function funisFromEquipe(equipe: Equipe): Record<FunilTipo, string> {
  return {
    comercial: equipe.funis?.comercial?.id ?? "",
    captacao: equipe.funis?.captacao?.id ?? "",
    venda_usados: equipe.funis?.venda_usados?.id ?? "",
  };
}

function funilCell(map: EquipeFunisMap | undefined, tipo: FunilTipo) {
  const item = map?.[tipo];
  if (!item) return "—";
  return item.ativo ? item.name : `${item.name} (inativo)`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberRow({
  member,
  roleLabel,
  accent,
  onResetPassword,
  resetting,
}: {
  member: EquipeMember;
  roleLabel: string;
  accent?: boolean;
  onResetPassword?: () => void;
  resetting?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2.5 sm:gap-3 sm:px-3",
        accent ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50",
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[11px] font-semibold",
            accent
              ? "avatar-fallback-brand text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {accent && <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="table-person-name min-w-0 flex-1 truncate text-sm font-medium">
            {member.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 px-2 text-[10px] font-medium capitalize",
              accent && "border-primary/30 text-primary",
            )}
            title={roleLabel}
          >
            {roleLabel}
          </Badge>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {member.email}
        </div>
      </div>
      {onResetPassword && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Gerar senha temporária"
          disabled={resetting}
          onClick={onResetPassword}
        >
          {resetting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <KeyRound className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}

function EquipesPage() {
  const session = getSession();
  const canManage = session?.role === "admin";
  const canResetMemberPassword =
    session?.role === "admin" || session?.role === "gerente";

  const [items, setItems] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
    null,
  );

  const [gerentes, setGerentes] = useState<EquipeOptionUser[]>([]);
  const [corretores, setCorretores] = useState<EquipeOptionUser[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [catalogFunis, setCatalogFunis] = useState<Funil[]>([]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchEquipes();
      setItems(next);
      setExpandedIds((prev) => {
        if (prev.size > 0) {
          const keep = new Set(
            [...prev].filter((id) => next.some((eq) => eq.id === id)),
          );
          if (keep.size > 0) return keep;
        }
        return new Set(next.slice(0, 1).map((eq) => eq.id));
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as equipes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!canManage) return;
    void fetchFunis()
      .then(setCatalogFunis)
      .catch(() => {
        toast.error("Não foi possível carregar os funis para vínculo.");
      });
  }, [canManage]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadOptions(equipeId?: string) {
    setOptionsLoading(true);
    try {
      const [g, c] = await Promise.all([
        fetchEquipeGerentes(equipeId),
        fetchEquipeCorretores(equipeId),
      ]);
      setGerentes(g);
      setCorretores(c);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar gerentes/corretores.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  async function openCreate() {
    if (!canManage) return;
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
    await loadOptions();
  }

  async function openEdit(equipe: Equipe) {
    if (!canManage) return;
    setFormMode("edit");
    setEditingId(equipe.id);
    setForm({
      name: equipe.name,
      gerenteId: equipe.gerenteId,
      membroIds: equipe.membros.map((m) => m.id),
      status: equipe.status,
      funis: funisFromEquipe(equipe),
    });
    setOpen(true);
    await loadOptions(equipe.id);
  }

  function toggleMembro(id: string, checked: boolean) {
    setForm((p) => ({
      ...p,
      membroIds: checked
        ? [...p.membroIds, id]
        : p.membroIds.filter((x) => x !== id),
    }));
  }

  const gerenteOptions = useMemo(() => {
    const map = new Map(gerentes.map((g) => [g.id, g]));
    return [...map.values()];
  }, [gerentes]);

  const selectedCount = form.membroIds.length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    if (!form.name.trim()) {
      toast.error("Informe o nome da equipe.");
      return;
    }
    if (!form.gerenteId) {
      toast.error("Selecione o gerente da equipe.");
      return;
    }
    setSaving(true);
    try {
      let equipeId = editingId;
      if (formMode === "create") {
        const created = await createEquipe({
          name: form.name.trim(),
          gerenteId: form.gerenteId,
          membroIds: form.membroIds,
          status: form.status,
        });
        equipeId = created.id;
      } else if (editingId) {
        await updateEquipe(editingId, {
          name: form.name.trim(),
          gerenteId: form.gerenteId,
          membroIds: form.membroIds,
          status: form.status,
        });
      }
      if (equipeId) {
        await putEquipeFunis(equipeId, {
          comercial: form.funis.comercial || null,
          captacao: form.funis.captacao || null,
          venda_usados: form.funis.venda_usados || null,
        });
      }
      toast.success(
        formMode === "create" ? "Equipe criada." : "Equipe atualizada.",
      );
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a equipe.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!canManage || !deleteId) return;
    try {
      await deleteEquipe(deleteId);
      setDeleteId(null);
      toast.success("Equipe excluída.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a equipe.",
      );
    }
  }

  async function handleResetPassword(member: EquipeMember) {
    if (!canResetMemberPassword || !isCorretorLike(member.role)) return;
    setResettingId(member.id);
    try {
      const result = await resetUserPassword(member.id);
      if (result.temporaryPassword) {
        setCredentials({
          name: member.name,
          email: member.email,
          password: result.temporaryPassword,
        });
      } else {
        toast.success(`Senha de ${member.name} redefinida.`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível gerar a senha temporária.",
      );
    } finally {
      setResettingId(null);
    }
  }

  async function copyText(value: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === "email" ? "E-mail copiado." : "Senha copiada.");
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Equipes"
        description={
          canManage
            ? "Organize gerentes, corretores e o funil de cada operação."
            : "Membros da sua equipe — use a chave para gerar senha temporária se alguém esquecer."
        }
        actions={
          canManage ? (
            <Button size="sm" onClick={() => void openCreate()}>
              <Plus className="mr-1 h-4 w-4" />
              Nova equipe
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando equipes...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">
            {canManage
              ? "Nenhuma equipe cadastrada"
              : "Você ainda não lidera uma equipe"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManage
              ? "Crie a primeira equipe e vincule um gerente com corretores."
              : "Peça ao administrador para vincular você como gerente de uma equipe."}
          </p>
        </div>
      ) : (
        <div className="min-w-0 space-y-3">
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-2xl border border-border/80 bg-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Equipe</th>
                  {FUNIL_TIPOS.map((tipo) => (
                    <th key={tipo} className="px-4 py-2.5 font-semibold">
                      {FUNIL_TIPO_LABEL[tipo]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((eq) => (
                  <tr
                    key={`funil-row-${eq.id}`}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium">{eq.name}</td>
                    {FUNIL_TIPOS.map((tipo) => (
                      <td
                        key={tipo}
                        className="px-4 py-2.5 text-muted-foreground"
                      >
                        {funilCell(eq.funis, tipo)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.map((eq) => {
            const expanded = expandedIds.has(eq.id);
            return (
              <section
                key={eq.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card"
              >
                <div className="flex min-w-0 items-stretch gap-1 border-b border-border/60 bg-linear-to-r from-primary/[0.07] to-transparent px-3 py-3 sm:gap-2 sm:px-4">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(eq.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left sm:gap-3"
                    aria-expanded={expanded}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="min-w-0 max-w-full truncate text-sm font-semibold text-primary">
                          {eq.name}
                        </h2>
                        <Badge
                          variant={
                            eq.status === "ativo" ? "default" : "outline"
                          }
                          className="h-5 shrink-0 px-2 text-[10px] font-medium capitalize"
                        >
                          {eq.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>
                          {eq.membros.length} corretor
                          {eq.membros.length === 1 ? "" : "es"}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="tabular-nums">
                          {eq.leadsCount ?? 0} lead
                          {(eq.leadsCount ?? 0) === 1 ? "" : "s"}
                        </span>
                        {(eq.leadsPool ?? 0) > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            ({eq.leadsPool} no pool)
                          </span>
                        )}
                        <span className="text-muted-foreground/40">·</span>
                        <span className="truncate">
                          Gerente:{" "}
                          <span className="font-medium text-foreground/80">
                            {eq.gerente.name}
                          </span>
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-0.5 self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void openEdit(eq)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(eq.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="grid min-w-0 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
                    <div className="min-w-0 space-y-2">
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Gerente
                      </p>
                      <MemberRow
                        member={eq.gerente}
                        roleLabel="Gerente"
                        accent
                      />
                    </div>

                    <div className="min-w-0 space-y-2">
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Corretores ({eq.membros.length})
                      </p>
                      {eq.membros.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                          Sem corretores nesta equipe
                        </div>
                      ) : (
                        <div className="grid min-w-0 gap-1 sm:grid-cols-2 xl:grid-cols-3">
                          {eq.membros.map((m) => (
                            <MemberRow
                              key={m.id}
                              member={m}
                              roleLabel="Corretor"
                              onResetPassword={
                                canResetMemberPassword
                                  ? () => void handleResetPassword(m)
                                  : undefined
                              }
                              resetting={resettingId === m.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2 lg:col-span-2">
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Funis da equipe
                      </p>
                      <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                        {FUNIL_TIPOS.map((tipo) => (
                          <div
                            key={tipo}
                            className="rounded-xl border border-border/70 px-3 py-2.5"
                          >
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {FUNIL_TIPO_LABEL[tipo]}
                            </p>
                            <p className="mt-0.5 text-sm font-medium">
                              {funilCell(eq.funis, tipo)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="px-1 text-[11px] text-muted-foreground">
                        Vale para novas operações. Captações e vendas já
                        criadas permanecem no funil original.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {canManage && (
        <>
          <FormDialogShell
            open={open}
            onOpenChange={setOpen}
            icon={<Network className="w-5 h-5" />}
            title={formMode === "create" ? "Nova equipe" : "Editar equipe"}
            description="Defina o gerente, os corretores e os funis usados nas novas operações."
            className="max-w-xl"
          >
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex flex-col flex-1 min-h-0"
            >
              <FormDialogBody>
                <FormSection
                  icon={<UserCog className="w-3.5 h-3.5 text-primary" />}
                  title="Identificação"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Nome da equipe
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Ex.: Equipe Recife Norte"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Gerente
                    </Label>
                    <Select
                      value={form.gerenteId || "__none__"}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          gerenteId: v === "__none__" ? "" : v,
                        }))
                      }
                      disabled={optionsLoading}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Selecionar gerente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>
                          Selecione
                        </SelectItem>
                        {gerenteOptions.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!optionsLoading && gerenteOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum gerente disponível. Cadastre um usuário com
                        perfil gerente.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          status: v as "ativo" | "inativo",
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </FormSection>

                <FormSection
                  icon={<Users className="w-3.5 h-3.5 text-primary" />}
                  title={`Corretores (${selectedCount})`}
                >
                  {optionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando corretores...
                    </div>
                  ) : corretores.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Nenhum corretor disponível. Cadastre corretores em
                      Usuários ou liberte-os de outras equipes.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border p-3">
                      {corretores.map((c) => {
                        const checked = form.membroIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                toggleMembro(c.id, v === true)
                              }
                            />
                            <div className="min-w-0">
                              <div className="table-person-name text-sm truncate">
                                {c.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.email}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </FormSection>

                <FormSection
                  icon={<GitFork className="w-3.5 h-3.5 text-primary" />}
                  title="Funis da equipe"
                >
                  <p className="text-xs text-muted-foreground">
                    Um funil ativo por tipo de operação. Novas captações e
                    vendas de usados usam essa configuração; o Kanban comercial
                    continua no funil comercial da imobiliária.
                  </p>
                  {FUNIL_TIPOS.map((tipo) => {
                    const currentId = form.funis[tipo];
                    const options = catalogFunis.filter(
                      (f) => f.tipo === tipo && (f.ativo || f.id === currentId),
                    );
                    return (
                      <div key={tipo} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {FUNIL_TIPO_LABEL[tipo]}
                        </Label>
                        <Select
                          value={currentId || NONE_FUNIL}
                          onValueChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              funis: {
                                ...p.funis,
                                [tipo]: v === NONE_FUNIL ? "" : v,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 bg-background">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_FUNIL}>Nenhum</SelectItem>
                            {options.map((f) => (
                              <SelectItem
                                key={f.id}
                                value={f.id}
                                disabled={!f.ativo}
                              >
                                {f.ativo ? f.name : `${f.name} (inativo)`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </FormSection>
              </FormDialogBody>

              <FormDialogActions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || optionsLoading}>
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {formMode === "create" ? "Criar equipe" : "Salvar"}
                </Button>
              </FormDialogActions>
            </form>
          </FormDialogShell>

          <AlertDialog
            open={Boolean(deleteId)}
            onOpenChange={(o) => !o && setDeleteId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os corretores ficarão sem equipe. O gerente poderá ser
                  vinculado a outra equipe depois.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void confirmDelete()}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <FormDialogShell
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        icon={<KeyRound className="w-5 h-5" />}
        title="Senha temporária gerada"
        description={
          credentials
            ? `Anote e entregue a ${credentials.name}. A senha só aparece agora.`
            : undefined
        }
      >
        {credentials && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm break-all">
                        {credentials.email}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.email, "email")
                        }
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Senha temporária
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold tracking-wide break-all">
                        {credentials.password}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.password, "password")
                        }
                      >
                        {copiedField === "password" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint="Peça ao corretor para trocar a senha no perfil após o login.">
              <Button type="button" onClick={() => setCredentials(null)}>
                Entendi
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>
    </div>
  );
}
