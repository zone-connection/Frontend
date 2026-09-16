import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { TablePager } from "@/components/table-pager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useTablePager } from "@/lib/use-table-pager";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canFinanceiroAction } from "@/lib/permissions";
import {
  createParceiro,
  deleteParceiro,
  fetchParceiros,
  updateParceiro,
} from "@/lib/financeiro-api";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { cn, digitsOnly, formatCpfCnpj } from "@/lib/utils";
import { FILTER_CONTROL, TABLE_LUX } from "@/lib/filter-bar";
import {
  type ParceiroFinanceiro,
  type TipoParceiro,
} from "@/lib/financeiro-mock";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/clientes-fornecedores")({
  head: () => {
    const isPlatform = getSession()?.role === "super_admin";
    return {
      meta: [
        {
          title: isPlatform
            ? "Fornecedores — Zone Connection"
            : "Clientes e fornecedores — Zone Connection",
        },
      ],
    };
  },
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "cliente", label: "Clientes" },
  { value: "fornecedor", label: "Fornecedores" },
  { value: "ambos", label: "Ambos" },
];

const STATUS_ATIVO = [
  { value: "todos", label: "Ativos e inativos" },
  { value: "ativo", label: "Somente ativos" },
  { value: "inativo", label: "Somente inativos" },
];

const TIPO_FORM_OPTIONS: { value: TipoParceiro; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "ambos", label: "Cliente e fornecedor" },
];

const TIPO_CHIP: Record<TipoParceiro, string> = {
  cliente: "bg-sky-500 text-white",
  fornecedor: "bg-violet-500 text-white",
  ambos: "bg-teal-500 text-white",
};

const TIPO_LABEL: Record<TipoParceiro, string> = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  ambos: "Ambos",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type FormState = {
  nome: string;
  documento: string;
  tipo: TipoParceiro;
  email: string;
  telefone: string;
  cidade: string;
  imobiliaria: string;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: "",
  documento: "",
  tipo: "cliente",
  email: "",
  telefone: "",
  cidade: "",
  imobiliaria: "",
  ativo: true,
};

const EMPTY_FORM_FORNECEDOR: FormState = {
  ...EMPTY_FORM,
  tipo: "fornecedor",
};

function toForm(p: ParceiroFinanceiro, forceFornecedor: boolean): FormState {
  return {
    nome: p.nome,
    documento: formatCpfCnpj(p.documento),
    tipo: forceFornecedor ? "fornecedor" : p.tipo,
    email: p.email || "",
    telefone: p.telefone || "",
    cidade: p.cidade || "",
    imobiliaria: p.imobiliaria || "",
    ativo: p.ativo,
  };
}

function Page() {
  const session = getSession();
  const isPlatformAdmin = session?.role === "super_admin";
  const canCreateFin = canFinanceiroAction(session, "create");
  const canEditFin = canFinanceiroAction(session, "edit");
  const canDeleteFin = canFinanceiroAction(session, "delete");
  const emptyForm = isPlatformAdmin ? EMPTY_FORM_FORNECEDOR : EMPTY_FORM;
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [ativo, setAtivo] = useState("todos");
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParceiroFinanceiro | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setParceiros(await fetchParceiros());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os parceiros.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parceiros.filter((p) => {
      if (isPlatformAdmin) {
        if (p.tipo !== "fornecedor" && p.tipo !== "ambos") return false;
      } else if (tipo !== "todos" && p.tipo !== (tipo as TipoParceiro)) {
        return false;
      }
      if (ativo === "ativo" && !p.ativo) return false;
      if (ativo === "inativo" && p.ativo) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.documento.includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.imobiliaria || "").toLowerCase().includes(q)
      );
    });
  }, [parceiros, search, tipo, ativo, isPlatformAdmin]);
  const pager = useTablePager(
    rows,
    `${search}|${tipo}|${ativo}|${isPlatformAdmin}`,
  );

  const hasActive = Boolean(
    search || (!isPlatformAdmin && tipo !== "todos") || ativo !== "todos",
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: ParceiroFinanceiro) {
    setFormMode("edit");
    setEditingId(p.id);
    setForm(toForm(p, isPlatformAdmin));
    setOpen(true);
  }

  function upsertLocal(updated: ParceiroFinanceiro) {
    setParceiros((prev) =>
      [updated, ...prev.filter((p) => p.id !== updated.id)].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const documento = digitsOnly(form.documento);
    if (!nome) {
      toast.error("Informe o nome do parceiro.");
      return;
    }
    if (documento.length !== 11 && documento.length !== 14) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).");
      return;
    }

    const payload = {
      nome,
      documento,
      tipo: isPlatformAdmin ? ("fornecedor" as const) : form.tipo,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      cidade: form.cidade.trim() || undefined,
      imobiliaria: isPlatformAdmin ? "" : form.imobiliaria.trim(),
      ativo: form.ativo,
    };

    setSaving(true);
    try {
      if (formMode === "edit" && editingId) {
        const updated = await updateParceiro(editingId, payload);
        upsertLocal(updated);
        toast.success(`${updated.nome} atualizado.`);
      } else {
        const created = await createParceiro(payload);
        upsertLocal(created);
        toast.success(`${created.nome} cadastrado.`);
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setFormMode("create");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o parceiro.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteParceiro(deleteTarget.id);
      setParceiros((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(`${deleteTarget.nome} excluído.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o parceiro.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const colCount = isPlatformAdmin ? 6 : 8;

  return (
    <div>
      <PageHeader
        title={isPlatformAdmin ? "Fornecedores" : "Clientes e fornecedores"}
        description={
          isPlatformAdmin
            ? "Cadastro de fornecedores da plataforma"
            : "Cadastro de parceiros financeiros"
        }
        actions={
          canCreateFin ? (
            <Button
              type="button"
              onClick={openCreate}
              className={BRAND_GRADIENT_BTN}
              style={BRAND_GRADIENT_STYLE}
            >
              <Plus className="w-4 h-4 mr-1" />
              {isPlatformAdmin ? "Novo fornecedor" : "Novo parceiro"}
            </Button>
          ) : undefined
        }
      />

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar nome, CNPJ, cidade…"
        {...(isPlatformAdmin
          ? {}
          : {
              tipo,
              onTipoChange: setTipo,
              tipoOptions: TIPO_OPTIONS,
            })}
        extra={
          <Select value={ativo} onValueChange={setAtivo}>
            <SelectTrigger className={cn("w-full sm:w-45", FILTER_CONTROL)}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ATIVO.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setTipo("todos");
          setAtivo("todos");
        }}
      />

      <Card className="overflow-hidden rounded-2xl">
        <Table className={TABLE_LUX}>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              {!isPlatformAdmin && <TableHead>Tipo</TableHead>}
              {!isPlatformAdmin && <TableHead>Imobiliária</TableHead>}
              <TableHead>Cidade</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-22 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando…
                  </span>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum {isPlatformAdmin ? "fornecedor" : "parceiro"}{" "}
                  encontrado.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-xs text-white",
                            lostLeadAvatarClass(p.nome),
                          )}
                        >
                          {initials(p.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {p.nome}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.cidade || "Sem cidade"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums text-sm text-muted-foreground">
                    {p.documento}
                  </TableCell>
                  {!isPlatformAdmin && (
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          TIPO_CHIP[p.tipo],
                        )}
                      >
                        {TIPO_LABEL[p.tipo]}
                      </span>
                    </TableCell>
                  )}
                  {!isPlatformAdmin && (
                    <TableCell className="text-sm uppercase tracking-wide text-muted-foreground">
                      {p.imobiliaria || "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {p.cidade || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="truncate">{p.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.telefone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        p.ativo
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEditFin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      ) : null}
                      {canDeleteFin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Excluir"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
      </Card>

      <FormDialogShell
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFormMode("create");
            setEditingId(null);
            setForm(emptyForm);
          }
        }}
        icon={<Building2 className="w-5 h-5" />}
        title={
          formMode === "edit"
            ? isPlatformAdmin
              ? "Editar fornecedor"
              : "Editar parceiro"
            : isPlatformAdmin
              ? "Novo fornecedor"
              : "Novo parceiro"
        }
        description={
          formMode === "edit"
            ? isPlatformAdmin
              ? "Atualize os dados do fornecedor."
              : "Atualize os dados do cliente ou fornecedor."
            : isPlatformAdmin
              ? "Cadastre um fornecedor da plataforma."
              : "Cadastre um cliente, fornecedor ou ambos."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              title={
                isPlatformAdmin ? "Dados do fornecedor" : "Dados do parceiro"
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="parceiro-nome">Nome *</Label>
                  <Input
                    id="parceiro-nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    placeholder="Ex.: Construtora Horizonte Ltda"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-documento">CPF / CNPJ *</Label>
                  <Input
                    id="parceiro-documento"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.documento}
                    onChange={(e) =>
                      setField("documento", formatCpfCnpj(e.target.value))
                    }
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                    required
                  />
                </div>
                {!isPlatformAdmin && (
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select
                      value={form.tipo}
                      onValueChange={(v) => setField("tipo", v as TipoParceiro)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPO_FORM_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="parceiro-email">E-mail</Label>
                  <Input
                    id="parceiro-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="financeiro@empresa.com.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-telefone">Telefone</Label>
                  <Input
                    id="parceiro-telefone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setField("telefone", formatPhone(e.target.value))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parceiro-cidade">Cidade</Label>
                  <Input
                    id="parceiro-cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                {!isPlatformAdmin && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="parceiro-imobiliaria">Imobiliária</Label>
                    <Input
                      id="parceiro-imobiliaria"
                      value={form.imobiliaria}
                      onChange={(e) => setField("imobiliaria", e.target.value)}
                      placeholder="Ex.: New Palace Imóveis"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:col-span-2">
                  <div>
                    <div className="text-sm font-medium">Ativo</div>
                    <p className="text-xs text-muted-foreground">
                      {isPlatformAdmin
                        ? "Fornecedores inativos ficam ocultos no filtro padrão."
                        : "Parceiros inativos ficam ocultos no filtro padrão."}
                    </p>
                  </div>
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setField("ativo", v)}
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando…"
                : formMode === "edit"
                  ? "Salvar alterações"
                  : isPlatformAdmin
                    ? "Salvar fornecedor"
                    : "Salvar parceiro"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPlatformAdmin ? "Excluir fornecedor?" : "Excluir parceiro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Isso removerá permanentemente "${deleteTarget.nome}" do cadastro financeiro.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
