import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { HideFinanceValuesButton } from "@/components/hide-finance-values-button";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { CategoriaSearchSelect } from "@/components/categoria-search-select";
import { getSession } from "@/lib/auth";
import { canFinanceiroAction } from "@/lib/permissions";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  createDespesaTipo,
  createMovimento,
  createParceiro,
  createRecebimentoTipo,
  deleteMovimento,
  fetchDespesaTipos,
  fetchMovimentos,
  fetchParceiros,
  fetchRecebimentoTipos,
  updateMovimento,
} from "@/lib/financeiro-api";
import { cn, digitsOnly, formatCpfCnpj } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import {
  brl,
  filterByPeriodo,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type DespesaTipo,
  type MovimentoFinanceiro,
  type NaturezaDespesa,
  type ParceiroFinanceiro,
  type PeriodoFiltro,
  type StatusTitulo,
  type TipoMovimento,
  type TipoParceiro,
} from "@/lib/financeiro-mock";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type MovimentacaoSearch = {
  novo?: boolean;
};

export const Route = createFileRoute("/_app/financeiro/movimentacao")({
  head: () => ({
    meta: [{ title: "Movimentação financeira — Zone Connection" }],
  }),
  validateSearch: (search: Record<string, unknown>): MovimentacaoSearch => {
    const raw = search.novo;
    if (raw === true || raw === "true" || raw === "1") return { novo: true };
    return {};
  },
  component: Page,
});

const TIPO_OPTIONS = [
  { value: "todos", label: "Entradas e saídas" },
  { value: "entrada", label: "Entradas" },
  { value: "saida", label: "Saídas" },
];

const FORMAS_PAGAMENTO = [
  "Pix",
  "TED",
  "Boleto",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Cheque",
  "Outro",
] as const;

const NONE = "__none__";

type QuickKind = "parceiro" | "categoria" | null;

type FormState = {
  data: string;
  descricao: string;
  parceiroId: string;
  categoria: string;
  tipo: TipoMovimento;
  valor: string;
  status: StatusTitulo;
  formaPagamento: string;
  natureza: NaturezaDespesa;
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyForm(defaultCategoria = ""): FormState {
  return {
    data: todayIso(),
    descricao: "",
    parceiroId: NONE,
    categoria: defaultCategoria,
    tipo: "entrada",
    valor: "",
    status: "pago",
    formaPagamento: FORMAS_PAGAMENTO[0],
    natureza: "variavel",
  };
}

function parseValor(raw: string): number {
  return parseMoneyInput(raw);
}

function toForm(m: MovimentoFinanceiro, defaultCategoria = ""): FormState {
  return {
    data: m.data.slice(0, 10),
    descricao: m.descricao,
    parceiroId: m.parceiroId || NONE,
    categoria: m.categoria || m.centro || defaultCategoria,
    tipo: m.tipo,
    valor: formatMoneyInput(m.valor),
    status: m.status,
    formaPagamento: m.formaPagamento || FORMAS_PAGAMENTO[0],
    natureza: m.natureza === "fixa" ? "fixa" : "variavel",
  };
}

function Page() {
  const navigate = useNavigate();
  const { novo } = Route.useSearch();
  const session = getSession();
  const isPlatform = session?.role === "super_admin";
  const canCreateFin = canFinanceiroAction(session, "create");
  const canEditFin = canFinanceiroAction(session, "edit");
  const canDeleteFin = canFinanceiroAction(session, "delete");
  const [hideValues] = useHideFinanceiroValues();
  const parceiroLabel = isPlatform ? "Fornecedor" : "Parceiro";
  const [items, setItems] = useState<MovimentoFinanceiro[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");
  const [tipo, setTipo] = useState("todos");
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MovimentoFinanceiro | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [despesaTipos, setDespesaTipos] = useState<DespesaTipo[]>([]);
  const [recebimentoTipos, setRecebimentoTipos] = useState<DespesaTipo[]>([]);
  const [quickKind, setQuickKind] = useState<QuickKind>(null);
  const [quickNome, setQuickNome] = useState("");
  const [quickDocumento, setQuickDocumento] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const isPlatform = getSession()?.role === "super_admin";
      const [movs, pars, desp, rec] = await Promise.all([
        fetchMovimentos(),
        fetchParceiros(),
        isPlatform ? Promise.resolve([] as DespesaTipo[]) : fetchDespesaTipos(),
        isPlatform
          ? Promise.resolve([] as DespesaTipo[])
          : fetchRecebimentoTipos(),
      ]);
      setItems(movs);
      setParceiros(pars.filter((p) => p.ativo));
      setDespesaTipos(desp);
      setRecebimentoTipos(rec);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as movimentações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const catalogTipos =
    form.tipo === "entrada" ? recebimentoTipos : despesaTipos;
  const catalogLabel =
    form.tipo === "entrada" ? "Categoria" : "Centro de custo";

  const categorias: string[] = useMemo(() => {
    const fromTipos = catalogTipos
      .filter((t) => t.ativo)
      .map((t) => t.nome.trim())
      .filter(Boolean);
    const fromItems = items
      .filter((m) => m.tipo === form.tipo)
      .map((m) =>
        form.tipo === "saida" ? m.centro || m.categoria : m.categoria || m.centro,
      )
      .filter((c) => c && c.trim());
    const current = form.categoria.trim();
    return Array.from(
      new Set(
        [
          ...fromTipos,
          ...fromItems,
          ...(current && !fromTipos.includes(current) ? [current] : []),
        ].filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [catalogTipos, items, form.categoria, form.tipo]);

  useEffect(() => {
    if (categorias.length === 0) return;
    if (!categorias.includes(form.categoria)) {
      setForm((prev) => ({ ...prev, categoria: categorias[0] ?? "" }));
    }
  }, [categorias, form.categoria]);

  function openQuick(kind: Exclude<QuickKind, null>) {
    setQuickKind(kind);
    setQuickNome("");
    setQuickDocumento("");
  }

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    const nome = quickNome.trim();
    if (nome.length < 2) {
      toast.error("Informe um nome com ao menos 2 caracteres.");
      return;
    }

    if (quickKind === "parceiro") {
      const documento = digitsOnly(quickDocumento);
      if (documento.length !== 11 && documento.length !== 14) {
        toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).");
        return;
      }
      setQuickSaving(true);
      try {
        const parceiroTipo: TipoParceiro = isPlatform
          ? "fornecedor"
          : form.tipo === "entrada"
            ? "cliente"
            : "fornecedor";
        const created = await createParceiro({
          nome,
          documento,
          tipo: parceiroTipo,
        });
        setParceiros((prev) =>
          [...prev, created].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
        setField("parceiroId", created.id);
        setQuickKind(null);
        toast.success(`${parceiroLabel} cadastrado.`);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : `Não foi possível criar o ${parceiroLabel.toLowerCase()}.`,
        );
      } finally {
        setQuickSaving(false);
      }
      return;
    }

    if (quickKind === "categoria") {
      const existing = catalogTipos.find(
        (t) => t.nome.toLowerCase() === nome.toLowerCase(),
      );
      if (existing) {
        setField("categoria", existing.nome);
        setQuickKind(null);
        return;
      }
      if (isPlatform) {
        setField("categoria", nome);
        setQuickKind(null);
        toast.success(
          form.tipo === "entrada"
            ? "Categoria aplicada ao lançamento."
            : "Centro de custo aplicado ao lançamento.",
        );
        return;
      }
      setQuickSaving(true);
      try {
        const created =
          form.tipo === "entrada"
            ? await createRecebimentoTipo({
                nome,
                natureza: "variavel",
                ativo: true,
              })
            : await createDespesaTipo({
                nome,
                natureza: form.natureza === "fixa" ? "fixa" : "variavel",
                ativo: true,
              });
        if (form.tipo === "entrada") {
          setRecebimentoTipos((prev) =>
            [...prev, created].sort((a, b) =>
              a.nome.localeCompare(b.nome, "pt-BR"),
            ),
          );
        } else {
          setDespesaTipos((prev) =>
            [...prev, created].sort((a, b) =>
              a.nome.localeCompare(b.nome, "pt-BR"),
            ),
          );
        }
        setField("categoria", created.nome);
        setQuickKind(null);
        toast.success(
          form.tipo === "entrada"
            ? "Categoria cadastrada."
            : "Centro de custo cadastrado.",
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível criar o cadastro.",
        );
      } finally {
        setQuickSaving(false);
      }
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filterByPeriodo(items, periodo, "data").filter((m) => {
      if (status !== "todos" && m.status !== status) return false;
      if (tipo !== "todos" && m.tipo !== (tipo as TipoMovimento)) return false;
      if (!q) return true;
      return (
        m.descricao.toLowerCase().includes(q) ||
        m.parceiro.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q) ||
        m.centro.toLowerCase().includes(q)
      );
    });
  }, [items, search, periodo, status, tipo]);
  const pager = useTablePager(rows, `${search}|${periodo}|${status}|${tipo}`);

  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const m of rows) {
      if (m.tipo === "entrada") entradas += m.valor;
      else saidas += m.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const hasActive = Boolean(
    search || periodo !== "mes" || status !== "todos" || tipo !== "todos",
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm(categorias[0] || ""));
    setOpen(true);
  }

  useEffect(() => {
    if (!novo || !canCreateFin) return;
    openCreate();
    void navigate({
      to: "/financeiro/movimentacao",
      search: {},
      replace: true,
    });
  }, [novo, navigate]);

  function openEdit(m: MovimentoFinanceiro) {
    setFormMode("edit");
    setEditingId(m.id);
    setForm(toForm(m, categorias[0] || ""));
    setOpen(true);
  }

  function upsertLocal(updated: MovimentoFinanceiro) {
    setItems((prev) =>
      [updated, ...prev.filter((m) => m.id !== updated.id)].sort((a, b) =>
        b.data.localeCompare(a.data),
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const descricao = form.descricao.trim();
    if (!descricao) {
      toast.error("Informe a descrição.");
      return;
    }
    if (!form.categoria.trim()) {
      toast.error(
        form.tipo === "entrada"
          ? "Informe a categoria."
          : "Informe o centro de custo.",
      );
      return;
    }
    const valor = parseValor(form.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const label = form.categoria.trim();
    const payload = {
      data: form.data,
      descricao,
      parceiroId:
        form.parceiroId !== NONE ? form.parceiroId : undefined,
      categoria: label,
      centro: form.tipo === "saida" ? label : "",
      tipo: form.tipo,
      valor,
      status: form.status,
      formaPagamento: form.formaPagamento.trim() || undefined,
      ...(form.tipo === "saida" ? { natureza: form.natureza } : {}),
    };

    setSaving(true);
    try {
      if (formMode === "edit" && editingId) {
        const updated = await updateMovimento(editingId, {
          ...payload,
          parceiroId: form.parceiroId !== NONE ? form.parceiroId : null,
        });
        upsertLocal(updated);
        toast.success("Lançamento atualizado.");
      } else {
        const created = await createMovimento(payload);
        upsertLocal(created);
        toast.success("Lançamento cadastrado.");
      }
      setOpen(false);
      setForm(emptyForm());
      setEditingId(null);
      setFormMode("create");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o lançamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMovimento(deleteTarget.id);
      setItems((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success("Lançamento excluído.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o lançamento.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Movimentação financeira"
        description="Lançamentos de entrada e saída"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HideFinanceValuesButton />
            {canCreateFin ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Novo lançamento
              </Button>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label="Entradas filtradas"
          value={totais.entradas}
          icon={ArrowUpRight}
          tone="blue-1"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Saídas filtradas"
          value={totais.saidas}
          icon={ArrowDownRight}
          tone="blue-2"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Saldo do filtro"
          value={totais.saldo}
          icon={ArrowUpRight}
          tone="blue-3"
          blurValue={hideValues}
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Buscar descrição, ${parceiroLabel.toLowerCase()}, categoria…`}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        tipo={tipo}
        onTipoChange={setTipo}
        tipoOptions={TIPO_OPTIONS}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
          setStatus("todos");
          setTipo("todos");
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando lançamentos…
          </div>
        ) : (
          <>
          <Table className="[&_th]:px-4 [&_td]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>{parceiroLabel}</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-22 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhum lançamento para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                pager.pageItems.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatDate(m.data)}
                    </TableCell>
                    <TableCell className="font-medium max-w-60">
                      {m.descricao}
                    </TableCell>
                    <TableCell>{m.parceiro || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.categoria || m.centro || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          m.tipo === "entrada"
                            ? `${STATUS_CHIP_CLASS} border-transparent bg-emerald-500/15 text-emerald-700`
                            : `${STATUS_CHIP_CLASS} border-transparent bg-destructive/15 text-destructive`
                        }
                        title={m.tipo === "entrada" ? "Entrada" : "Saída"}
                      >
                        {m.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        m.tipo === "entrada"
                          ? "text-emerald-600"
                          : "text-destructive"
                      }`}
                    >
                      {m.tipo === "entrada" ? "+" : "—"}
                      {brl(m.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(m.status)}
                      >
                        {statusLabel(m.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {canEditFin ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        ) : null}
                        {canDeleteFin ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} lançamento(s)
      </p>

      <FormDialogShell
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFormMode("create");
            setEditingId(null);
            setForm(emptyForm());
          }
        }}
        icon={<ArrowUpRight className="w-5 h-5" />}
        title={
          formMode === "edit" ? "Editar lançamento" : "Novo lançamento"
        }
        description="Registre uma entrada ou saída financeira."
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection title="Dados do lançamento">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mov-data">Data *</Label>
                  <Input
                    id="mov-data"
                    type="date"
                    value={form.data}
                    onChange={(e) => setField("data", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setField("tipo", v as TipoMovimento)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.tipo === "saida" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Tipo de despesa *</Label>
                    <div className="inline-flex h-9 rounded-lg border bg-muted/40 p-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-4",
                          form.natureza === "fixa" && "bg-background shadow-sm",
                        )}
                        onClick={() => setField("natureza", "fixa")}
                      >
                        Fixa
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-4",
                          form.natureza === "variavel" &&
                            "bg-background shadow-sm",
                        )}
                        onClick={() => setField("natureza", "variavel")}
                      >
                        Variável
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mov-desc">Descrição *</Label>
                  <Input
                    id="mov-desc"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    placeholder="Ex.: Comissão da venda apto 1204"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{parceiroLabel}</Label>
                    {canCreateFin ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => openQuick("parceiro")}
                      >
                        + Novo {parceiroLabel.toLowerCase()}
                      </Button>
                    ) : null}
                  </div>
                  <Select
                    value={form.parceiroId}
                    onValueChange={(v) => setField("parceiroId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>
                        Sem {parceiroLabel.toLowerCase()}
                      </SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{catalogLabel} *</Label>
                    {canCreateFin ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => openQuick("categoria")}
                      >
                        +{" "}
                        {form.tipo === "entrada"
                          ? "Nova categoria"
                          : "Novo centro"}
                      </Button>
                    ) : null}
                  </div>
                  <CategoriaSearchSelect
                    value={form.categoria}
                    options={categorias}
                    onChange={(v) => setField("categoria", v)}
                    placeholder={
                      form.tipo === "entrada"
                        ? "Buscar categoria…"
                        : "Buscar centro de custo…"
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {isPlatform
                      ? form.tipo === "entrada"
                        ? "Categoria usada nas entradas."
                        : "Centro de custo usado nas saídas."
                      : form.tipo === "entrada"
                        ? "Cadastro do Centro de recebimentos."
                        : "Cadastro do Centro de despesas."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mov-valor">Valor *</Label>
                  <Input
                    id="mov-valor"
                    inputMode="numeric"
                    value={form.valor}
                    onChange={(e) =>
                      setField("valor", maskMoneyInput(e.target.value))
                    }
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v as StatusTitulo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Forma de pagamento</Label>
                  <Select
                    value={form.formaPagamento}
                    onValueChange={(v) => setField("formaPagamento", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  : "Salvar lançamento"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={quickKind !== null}
        onOpenChange={(o) => !o && setQuickKind(null)}
        icon={
          quickKind === "parceiro" ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <Tags className="w-5 h-5" />
          )
        }
        title={
          quickKind === "parceiro"
            ? `Novo ${parceiroLabel.toLowerCase()}`
            : "Nova categoria"
        }
        description={
          quickKind === "categoria"
            ? isPlatform
              ? "Fica disponível em títulos e movimentação."
              : form.tipo === "entrada"
                ? "Cadastra no Centro de recebimentos e fica disponível em títulos e movimentação."
                : "Cadastra no Centro de despesas e fica disponível em títulos e movimentação."
            : "Criação rápida para usar neste lançamento."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickKind(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="quick-mov-form"
              disabled={quickSaving}
            >
              {quickSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Criar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form
            id="quick-mov-form"
            className="space-y-3"
            onSubmit={handleQuickCreate}
          >
            <div className="space-y-1.5">
              <Label htmlFor="quick-mov-nome">Nome *</Label>
              <Input
                id="quick-mov-nome"
                value={quickNome}
                onChange={(e) => setQuickNome(e.target.value)}
                autoFocus
                required
              />
            </div>
            {quickKind === "parceiro" ? (
              <div className="space-y-1.5">
                <Label htmlFor="quick-mov-doc">CPF / CNPJ *</Label>
                <Input
                  id="quick-mov-doc"
                  inputMode="numeric"
                  autoComplete="off"
                  value={quickDocumento}
                  onChange={(e) =>
                    setQuickDocumento(formatCpfCnpj(e.target.value))
                  }
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  required
                />
              </div>
            ) : null}
          </form>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Isso removerá permanentemente "${deleteTarget.descricao}".`
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
