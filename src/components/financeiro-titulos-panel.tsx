import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { HideFinanceValuesButton } from "@/components/hide-finance-values-button";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { ComissaoLancamentoDialog } from "@/components/comissao-lancamento-dialog";
import { CategoriaSearchSelect } from "@/components/categoria-search-select";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  baixarTitulo,
  createDespesaTipo,
  createParceiro,
  createRecebimentoTipo,
  createTitulo,
  createTitulosParcelado,
  deleteTitulo,
  deleteTitulosGrupo,
  fetchDespesaTipos,
  fetchParceiros,
  fetchRecebimentoTipos,
  fetchTitulos,
  updateTitulo,
  updateTitulosGrupo,
} from "@/lib/financeiro-api";
import {
  createPlatformContratoComTitulos,
  type PlatformContratoStatus,
  type PlatformContratoTipo,
} from "@/lib/platform-contratos-api";
import { createPlatformFornecedorContratoComTitulos } from "@/lib/platform-fornecedor-contratos-api";
import { PLANO_LABELS, type TenantPlano } from "@/lib/tenant-modules";
import { fetchTenants, type Tenant } from "@/lib/tenants-api";
import {
  getVistaParcelas,
  VISTA_PARCELAS_EVENT,
  type VistaParcelas,
} from "@/lib/financeiro-prefs";
import { cn, digitsOnly, formatCpfCnpj } from "@/lib/utils";
import { canFinanceiroAction } from "@/lib/permissions";
import { FILTER_LABEL, FILTER_VISTA_WRAP } from "@/lib/filter-bar";
import {
  FORM_CONTROL,
  FORM_OPTION_CARD,
  FORM_OPTION_CARD_ACTIVE,
  FORM_SECTION,
  FORM_STEP_INDEX,
  FORM_STEP_LIST,
  FORM_STEP_TRIGGER,
} from "@/lib/form-surface";
import { SOFT_BTN } from "@/lib/soft-btn";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import {
  brl,
  COMISSAO_PAPEL_LABEL,
  despesaNaturezaLabel,
  formatDate,
  statusBadgeClass,
  statusLabel,
  tituloVisivelNoPeriodo,
  type DespesaTipo,
  type NaturezaDespesa,
  type ParceiroFinanceiro,
  type PeriodoFiltro,
  type StatusTitulo,
  type TipoParceiro,
  type TituloFinanceiro,
} from "@/lib/financeiro-mock";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Layers,
  ListOrdered,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Repeat,
  ScrollText,
  Tags,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const NONE = "__none__";
const FORMAS = ["Pix", "TED", "Boleto", "Dinheiro", "Cartão", "Outro"] as const;

type QuickKind = "parceiro" | "categoria" | null;
type TituloFormTab = "dados" | "cobranca" | "contrato";
type GrupoParcelaTipo = "adesao" | "mensalidade";

function ComissaoOrigemBadge({
  titulo,
}: {
  titulo: TituloFinanceiro;
}) {
  if (!titulo.comissaoId) return null;
  const papel = titulo.comissaoPapel
    ? (COMISSAO_PAPEL_LABEL[titulo.comissaoPapel] ?? titulo.comissaoPapel)
    : null;
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-brand-accent/40 text-[10px] text-brand-accent"
    >
      {papel ? `Comissão · ${papel}` : "Comissão"}
    </Badge>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium wrap-break-word">{value}</p>
    </div>
  );
}

type FormState = {
  descricao: string;
  parceiroId: string;
  categoria: string;
  centro: string;
  vencimento: string;
  valor: string;
  status: StatusTitulo;
  parcela: string;
  natureza: NaturezaDespesa;
};

type ContratoFormState = {
  tenantId: string;
  titulo: string;
  tipo: PlatformContratoTipo;
  plano: TenantPlano;
  status: PlatformContratoStatus;
  dataInicio: string;
  vencimento: string;
  valorAdesao: string;
  valorMensalidade: string;
  observacao: string;
};

const emptyContratoForm = (tenantId = ""): ContratoFormState => ({
  tenantId,
  titulo: "",
  tipo: "assinatura",
  plano: "ouro",
  status: "ativo",
  dataInicio: new Date().toISOString().slice(0, 10),
  vencimento: new Date().toISOString().slice(0, 10),
  valorAdesao: "",
  valorMensalidade: "",
  observacao: "",
});

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseValor(raw: string): number {
  return parseMoneyInput(raw);
}

function formatValorInput(n: number): string {
  return formatMoneyInput(n);
}

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const RECORRENCIAS = [
  { value: "unica", label: "Parcela única" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

type Recorrencia = (typeof RECORRENCIAS)[number]["value"];

const RECORRENCIA_QTD_PADRAO: Record<Recorrencia, string> = {
  unica: "1",
  semanal: "4",
  quinzenal: "2",
  mensal: "12",
  bimestral: "6",
  trimestral: "4",
  semestral: "2",
  anual: "2",
};

function addRecorrenciaIso(
  iso: string,
  freq: Recorrencia,
  index: number,
): string {
  if (index <= 0 || freq === "unica") return iso.slice(0, 10);
  if (freq === "semanal") return addDaysIso(iso, 7 * index);
  if (freq === "quinzenal") return addDaysIso(iso, 14 * index);
  if (freq === "mensal") return addMonthsIso(iso, index);
  if (freq === "bimestral") return addMonthsIso(iso, 2 * index);
  if (freq === "trimestral") return addMonthsIso(iso, 3 * index);
  if (freq === "semestral") return addMonthsIso(iso, 6 * index);
  return addMonthsIso(iso, 12 * index);
}

type ParcelaDraft = {
  id?: string;
  vencimento: string;
  valor: string;
  label?: string;
  locked?: boolean;
};

function buildParcelasDraft(
  valorParcela: number,
  quantidade: number,
  primeiroVencimento: string,
  freq: Recorrencia,
  indeterminado = false,
): ParcelaDraft[] {
  const n = Math.max(2, Math.floor(quantidade));
  return Array.from({ length: n }, (_, i) => {
    const vencimento = addRecorrenciaIso(primeiroVencimento, freq, i);
    return {
      vencimento,
      valor: formatValorInput(valorParcela),
      label: indeterminado
        ? mesParcelaLabel(vencimento)
        : `${i + 1}/${n}`,
    };
  });
}

const MESES_PARCELA = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

function mesParcelaLabel(iso: string) {
  const [year, month] = iso.slice(0, 7).split("-").map(Number);
  if (!year || !month) return iso.slice(0, 7);
  return `${MESES_PARCELA[month - 1]}/${String(year).slice(2)}`;
}

function emptyForm(
  tipo: "receber" | "pagar",
  defaultCentro = "",
  defaultCategoria = "",
): FormState {
  return {
    descricao: "",
    parceiroId: NONE,
    categoria: defaultCategoria,
    centro: defaultCentro,
    vencimento: todayIso(),
    valor: "",
    status: "aberto",
    parcela: "",
    natureza: "variavel",
  };
}

type DisplayRow =
  | { kind: "single"; titulo: TituloFinanceiro }
  | { kind: "group"; grupoId: string; titulos: TituloFinanceiro[] };

function buildDisplayRows(
  filtered: TituloFinanceiro[],
  vista: VistaParcelas,
): DisplayRow[] {
  if (vista === "lista") {
    return filtered.map((titulo) => ({ kind: "single" as const, titulo }));
  }
  const seen = new Set<string>();
  const out: DisplayRow[] = [];
  for (const t of filtered) {
    if (!t.grupoParcelasId) {
      out.push({ kind: "single", titulo: t });
      continue;
    }
    if (seen.has(t.grupoParcelasId)) continue;
    seen.add(t.grupoParcelasId);
    const titulos = filtered
      .filter((x) => x.grupoParcelasId === t.grupoParcelasId)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    out.push({ kind: "group", grupoId: t.grupoParcelasId, titulos });
  }
  return out;
}

function groupSummary(titulos: TituloFinanceiro[]) {
  const first = titulos[0];
  const total = titulos.reduce((s, t) => s + t.valor, 0);
  const pagas = titulos.filter((t) => t.status === "pago").length;
  const abertas = titulos.filter(
    (t) => t.status === "aberto" || t.status === "atrasado",
  );
  const proxima = abertas[0] ?? first;
  let statusResumo: StatusTitulo = "aberto";
  if (pagas === titulos.length) statusResumo = "pago";
  else if (titulos.some((t) => t.status === "atrasado"))
    statusResumo = "atrasado";
  else if (titulos.some((t) => t.status === "cancelado") && pagas === 0)
    statusResumo = "cancelado";
  return {
    descricao: first?.descricao ?? "",
    parceiro: first?.parceiro ?? "",
    categoria: first?.categoria || first?.centro || "",
    centro: first?.centro || first?.categoria || "",
    vencimento: proxima?.vencimento ?? first?.vencimento ?? "",
    total,
    n: titulos.length,
    pagas,
    statusResumo,
  };
}

export function FinanceiroTitulosPanel({
  tipo,
  title,
  description,
  readOnly = false,
  ocultarComissao = false,
}: {
  tipo: "receber" | "pagar";
  title: string;
  description: string;
  readOnly?: boolean;
  /** Comissões não entram na lista nem nos totais (ficam em Comissão). */
  ocultarComissao?: boolean;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<TituloFinanceiro[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroFinanceiro[]>([]);
  const [catalogTipos, setCatalogTipos] = useState<DespesaTipo[]>([]);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [status, setStatus] = useState<StatusTitulo | "todos">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const catalogLabel = tipo === "receber" ? "Categoria" : "Centro de custo";
  const catalogHint =
    getSession()?.role === "super_admin"
      ? tipo === "receber"
        ? "Categoria usada nos títulos a receber."
        : "Centro de custo usado nos títulos a pagar."
      : tipo === "receber"
        ? "Cadastro do Centro de recebimentos."
        : "Cadastro do Centro de despesas.";
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "edit-grupo">(
    "create",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGrupoId, setEditingGrupoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(tipo));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [deleteGrupoTarget, setDeleteGrupoTarget] = useState<{
    grupoId: string;
    descricao: string;
    n: number;
    pagas: number;
  } | null>(null);
  const [baixarTarget, setBaixarTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [detalhesTarget, setDetalhesTarget] = useState<TituloFinanceiro | null>(
    null,
  );
  const [baixarData, setBaixarData] = useState(todayIso());
  const [baixarForma, setBaixarForma] = useState<string>(FORMAS[0]);
  const [busy, setBusy] = useState(false);
  const [quickKind, setQuickKind] = useState<QuickKind>(null);
  const [quickNome, setQuickNome] = useState("");
  const [quickDocumento, setQuickDocumento] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("unica");
  const [recorrenciaIndeterminada, setRecorrenciaIndeterminada] =
    useState(false);
  const [qtdParcelas, setQtdParcelas] = useState("2");
  const [parcelasDraft, setParcelasDraft] = useState<ParcelaDraft[]>([]);
  const [grupoParcelaSelecionada, setGrupoParcelaSelecionada] =
    useState<GrupoParcelaTipo | null>(null);
  const [valorGrupoParcelas, setValorGrupoParcelas] = useState("");
  const [formTab, setFormTab] = useState<TituloFormTab>("dados");
  const session = getSession();
  const isPlatformAdmin = session?.role === "super_admin";
  const canUseContrato =
    isPlatformAdmin || session?.role === "admin";
  const isAssinaturaPlataforma = isPlatformAdmin && tipo === "receber";
  const [comoContrato, setComoContrato] = useState(false);
  const [hideValues] = useHideFinanceiroValues();
  const canCreateFin = !readOnly && canFinanceiroAction(session, "create");
  const canEditFin = !readOnly && canFinanceiroAction(session, "edit");
  const canDeleteFin = !readOnly && canFinanceiroAction(session, "delete");
  const canLancarComissao =
    tipo === "receber" &&
    canCreateFin &&
    (session?.role === "admin" ||
      session?.role === "super_admin" ||
      session?.role === "financeiro");
  const [comissaoDialogOpen, setComissaoDialogOpen] = useState(false);
  const [parcelarAdesao, setParcelarAdesao] = useState(false);
  const [qtdParcelasAdesao, setQtdParcelasAdesao] = useState("2");
  const [contratoForm, setContratoForm] = useState<ContratoFormState>(() =>
    emptyContratoForm(),
  );
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [origemFiltro, setOrigemFiltro] = useState<
    "todos" | "normal" | "contrato" | "comissao"
  >("todos");
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [grupoTitulos, setGrupoTitulos] = useState<TituloFinanceiro[]>([]);
  const [grupoMeta, setGrupoMeta] = useState<{
    descricao: string;
    parceiro: string;
  } | null>(null);
  const [vistaParcelas, setVistaParcelasState] = useState<VistaParcelas>(() =>
    getVistaParcelas(),
  );
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(
    () => new Set(),
  );

  const categorias = useMemo(() => {
    const fromTipos = catalogTipos
      .filter((t) => t.ativo)
      .map((t) => t.nome.trim())
      .filter(Boolean);
    const current = form.categoria.trim();
    const fromItems = items
      .map((t) =>
        tipo === "pagar" ? t.centro || t.categoria : t.categoria || t.centro,
      )
      .filter((c) => c && c.trim());
    return Array.from(
      new Set(
        [
          ...fromTipos,
          ...fromItems,
          ...(current && !fromTipos.includes(current) ? [current] : []),
        ].filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [catalogTipos, items, form.categoria, tipo]);

  const load = useCallback(async () => {
    try {
      const origemConsulta =
        origemFiltro !== "todos"
          ? origemFiltro
          : ocultarComissao
            ? "sem_comissao"
            : undefined;
      const [titulos, pars, tipos, tenantList] = await Promise.all([
        fetchTitulos(tipo, undefined, origemConsulta),
        fetchParceiros(),
        isPlatformAdmin
          ? Promise.resolve([] as DespesaTipo[])
          : tipo === "receber"
            ? fetchRecebimentoTipos()
            : fetchDespesaTipos(),
        isAssinaturaPlataforma ? fetchTenants() : Promise.resolve([]),
      ]);
      setItems(titulos);
      setParceiros(pars.filter((p) => p.ativo));
      setCatalogTipos(tipos);
      if (isAssinaturaPlataforma) {
        setTenants(tenantList);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os títulos.",
      );
    }
  }, [
    tipo,
    origemFiltro,
    ocultarComissao,
    canUseContrato,
    isPlatformAdmin,
    isAssinaturaPlataforma,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = () => setVistaParcelasState(getVistaParcelas());
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(VISTA_PARCELAS_EVENT, sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(VISTA_PARCELAS_EVENT, sync);
    };
  }, []);

  const categoriaOptions = useMemo(
    () => [
      {
        value: "todos",
        label:
          tipo === "receber"
            ? "Todas as categorias"
            : "Todos os centros de custo",
      },
      ...categorias.map((c) => ({ value: c, label: c })),
    ],
    [categorias, tipo],
  );

  function catalogFields(nome: string) {
    const label = nome.trim();
    return tipo === "pagar"
      ? { categoria: label, centro: label }
      : { categoria: label, centro: "" };
  }

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
        const parceiroTipo: TipoParceiro =
          tipo === "receber" ? "cliente" : "fornecedor";
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
        setForm((f) => ({ ...f, parceiroId: created.id }));
        setQuickKind(null);
        toast.success("Parceiro cadastrado.");
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível criar o parceiro.",
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
        setForm((f) => ({ ...f, ...catalogFields(existing.nome) }));
        setQuickKind(null);
        return;
      }
      // Plataforma não usa módulos de centro: só aplica o rótulo no título.
      if (isPlatformAdmin) {
        setForm((f) => ({ ...f, ...catalogFields(nome) }));
        setQuickKind(null);
        toast.success(
          tipo === "receber"
            ? "Categoria aplicada ao título."
            : "Centro de custo aplicado ao título.",
        );
        return;
      }
      setQuickSaving(true);
      try {
        const created =
          tipo === "receber"
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
        setCatalogTipos((prev) =>
          [...prev, created].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
        setForm((f) => ({ ...f, ...catalogFields(created.nome) }));
        setQuickKind(null);
        toast.success(
          tipo === "receber"
            ? "Categoria cadastrada."
            : "Centro de custo cadastrado.",
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : `Não foi possível criar ${tipo === "receber" ? "a categoria" : "o centro"}.`,
        );
      } finally {
        setQuickSaving(false);
      }
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return items.filter((t) => {
      if (ocultarComissao && t.comissaoId) return false;
      if (status !== "todos" && t.status !== status) return false;
      if (categoriaFiltro !== "todos") {
        const label =
          tipo === "pagar" ? t.centro || t.categoria : t.categoria || t.centro;
        if (label !== categoriaFiltro) return false;
      }
      if (!tituloVisivelNoPeriodo(t, periodo, now)) return false;
      if (!q) return true;
      return (
        t.descricao.toLowerCase().includes(q) ||
        (t.parceiro ?? "").toLowerCase().includes(q) ||
        (t.categoria ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, periodo, status, categoriaFiltro, tipo, ocultarComissao]);

  const kpis = useMemo(() => {
    const valor = (r: TituloFinanceiro) => Number(r.valor) || 0;
    const aberto = rows
      .filter((r) => r.status === "aberto")
      .reduce((s, r) => s + valor(r), 0);
    const atrasado = rows
      .filter((r) => r.status === "atrasado")
      .reduce((s, r) => s + valor(r), 0);
    const pago = rows
      .filter((r) => r.status === "pago")
      .reduce((s, r) => s + valor(r), 0);
    return { aberto, atrasado, pago };
  }, [rows]);

  const displayRows = useMemo(
    () => buildDisplayRows(rows, vistaParcelas),
    [rows, vistaParcelas],
  );
  const pager = useTablePager(
    displayRows,
    `${search}|${periodo}|${status}|${categoriaFiltro}|${vistaParcelas}`,
  );

  function toggleGrupo(grupoId: string) {
    setExpandedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId);
      else next.add(grupoId);
      return next;
    });
  }

  function openBaixar(t: TituloFinanceiro) {
    setBaixarTarget(t);
    setBaixarData(todayIso());
    setBaixarForma(FORMAS[0]);
  }

  function renderTituloActions(
    t: TituloFinanceiro,
    opts?: {
      hideGrupo?: boolean;
      hideGrupoEdit?: boolean;
      hideBaixar?: boolean;
    },
  ) {
    return (
      <div className="flex justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Ver detalhes"
          onClick={() => setDetalhesTarget(t)}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        {t.comissaoId ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Abrir comissão de origem"
            onClick={() =>
              void navigate({
                to: "/financeiro/comissao",
                search: { id: t.comissaoId! },
              })
            }
          >
            <Percent className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        {!opts?.hideGrupo && t.grupoParcelasId ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Ver parcelas"
            onClick={() => void openGrupo(t)}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        {canEditFin && !opts?.hideBaixar &&
        t.status !== "pago" &&
        t.status !== "cancelado" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Baixar"
            onClick={() => openBaixar(t)}
          >
            <Banknote className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        {canEditFin ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={t.grupoParcelasId ? "Editar parcela" : "Editar"}
            onClick={() => openEdit(t)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        {canEditFin && !opts?.hideGrupoEdit && t.grupoParcelasId ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar todas as parcelas"
            onClick={() => void openEditGrupo(t)}
          >
            <Layers className="w-3.5 h-3.5" />
          </Button>
        ) : null}
        {canDeleteFin ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            title="Excluir"
            onClick={() => setDeleteTarget(t)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        ) : null}
      </div>
    );
  }

  function regenerateParcelas(
    totalRaw: string,
    qtdRaw: string,
    primeiroVenc: string,
    freq: Recorrencia = recorrencia,
  ) {
    const total = parseValor(totalRaw);
    const qtd = Number(qtdRaw);
    if (
      freq === "unica" ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isFinite(qtd) ||
      qtd < 2
    ) {
      setParcelasDraft([]);
      return;
    }
    setParcelasDraft(
      buildParcelasDraft(
        total,
        qtd,
        primeiroVenc || todayIso(),
        freq,
        recorrenciaIndeterminada && freq === "mensal",
      ),
    );
  }

  function applyRecorrencia(next: Recorrencia) {
    setRecorrencia(next);
    const recorrente = next !== "unica";
    setParcelado(recorrente);
    if (next !== "mensal") setRecorrenciaIndeterminada(false);
    if (!recorrente) {
      setParcelasDraft([]);
      setQtdParcelas("1");
      return;
    }
    const qtd =
      next === "mensal" && recorrenciaIndeterminada
        ? "12"
        : RECORRENCIA_QTD_PADRAO[next];
    setQtdParcelas(qtd);
    regenerateParcelas(form.valor, qtd, form.vencimento, next);
    setFormTab("cobranca");
  }

  function toggleRecorrenciaIndeterminada() {
    const next = !recorrenciaIndeterminada;
    setRecorrenciaIndeterminada(next);
    setParcelado(true);
    setRecorrencia("mensal");
    const qtd = next ? "12" : RECORRENCIA_QTD_PADRAO.mensal;
    setQtdParcelas(qtd);
    setParcelasDraft(
      (() => {
        const total = parseValor(form.valor);
        const n = Number(qtd);
        if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(n) || n < 2) {
          return [];
        }
        return buildParcelasDraft(
          total,
          n,
          form.vencimento || todayIso(),
          "mensal",
          next,
        );
      })(),
    );
    setFormTab("cobranca");
  }

  function isParcelaDoContrato(parcela: ParcelaDraft, grupo: GrupoParcelaTipo) {
    const label = parcela.label?.toLocaleLowerCase("pt-BR") ?? "";
    return grupo === "adesao"
      ? label.startsWith("adesão")
      : label.startsWith("mensalidade");
  }

  function selecionarGrupoParcelas(grupo: GrupoParcelaTipo) {
    setGrupoParcelaSelecionada(grupo);
    setValorGrupoParcelas("");
  }

  function aplicarValorAoGrupoParcelas() {
    if (!grupoParcelaSelecionada) return;
    const valor = parseValor(valorGrupoParcelas);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido para as parcelas selecionadas.");
      return;
    }

    setParcelasDraft((prev) =>
      prev.map((parcela) =>
        isParcelaDoContrato(parcela, grupoParcelaSelecionada)
          ? { ...parcela, valor: formatValorInput(valor) }
          : parcela,
      ),
    );
    toast.success(
      `Valor aplicado às parcelas de ${
        grupoParcelaSelecionada === "adesao" ? "adesão" : "mensalidade"
      }.`,
    );
  }

  function openCreate() {
    if (canLancarComissao && origemFiltro === "comissao") {
      setComissaoDialogOpen(true);
      return;
    }
    setFormMode("create");
    setEditingId(null);
    setEditingGrupoId(null);
    const defaultCat = categorias[0] || "";
    const next = emptyForm(tipo, defaultCat, defaultCat);
    setForm(next);
    setParcelado(false);
    setRecorrencia("unica");
    setRecorrenciaIndeterminada(false);
    setQtdParcelas(canUseContrato ? "1" : "2");
    setParcelasDraft([]);
    setGrupoParcelaSelecionada(null);
    setValorGrupoParcelas("");
    setComoContrato(false);
    setParcelarAdesao(false);
    setQtdParcelasAdesao("2");
    setContratoForm(emptyContratoForm(tenants[0]?.id ?? ""));
    setFormTab("dados");
    setOpen(true);
  }

  function openEdit(t: TituloFinanceiro) {
    setFormMode("edit");
    setEditingId(t.id);
    setEditingGrupoId(null);
    const temParcela = Boolean(t.parcela?.trim());
    setParcelado(temParcela);
    setParcelasDraft([]);
    setGrupoParcelaSelecionada(null);
    setValorGrupoParcelas("");
    setFormTab("dados");
    const cat = t.categoria || t.centro || categorias[0] || "";
    setForm({
      descricao: t.descricao,
      parceiroId: t.parceiroId || NONE,
      categoria: cat,
      centro: cat,
      vencimento: t.vencimento.slice(0, 10),
      valor: formatValorInput(t.valor),
      status: t.status,
      parcela: t.parcela || "",
      natureza: t.natureza === "fixa" ? "fixa" : "variavel",
    });
    setOpen(true);
  }

  async function openEditGrupo(seed: TituloFinanceiro | TituloFinanceiro[]) {
    const seedList = Array.isArray(seed) ? seed : [seed];
    const grupoId = seedList[0]?.grupoParcelasId;
    if (!grupoId) {
      toast.error("Este título não faz parte de um parcelamento.");
      return;
    }

    let rows = items
      .filter((t) => t.grupoParcelasId === grupoId)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    if (rows.length === 0) {
      try {
        rows = [...(await fetchTitulos(tipo, grupoId))].sort((a, b) =>
          a.vencimento.localeCompare(b.vencimento),
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as parcelas.",
        );
        return;
      }
    }
    if (rows.length === 0) {
      toast.error("Nenhuma parcela encontrada neste grupo.");
      return;
    }

    const base = rows[0];
    setFormMode("edit-grupo");
    setEditingId(null);
    setEditingGrupoId(grupoId);
    setParcelado(false);
    setGrupoOpen(false);
    const cat = base.categoria || base.centro || categorias[0] || "";
    setForm({
      descricao: base.descricao,
      parceiroId: base.parceiroId || NONE,
      categoria: cat,
      centro: cat,
      vencimento: base.vencimento.slice(0, 10),
      valor: formatValorInput(rows.reduce((s, t) => s + t.valor, 0)),
      status: "aberto",
      parcela: "",
      natureza: base.natureza === "fixa" ? "fixa" : "variavel",
    });
    setParcelasDraft(
      rows.map((t) => ({
        id: t.id,
        vencimento: t.vencimento.slice(0, 10),
        valor: formatValorInput(t.valor),
        label: t.parcela || "",
        locked: false,
      })),
    );
    setGrupoParcelaSelecionada(null);
    setValorGrupoParcelas("");
    setFormTab("cobranca");
    setOpen(true);
  }

  async function openGrupo(t: TituloFinanceiro) {
    if (!t.grupoParcelasId) return;
    setGrupoMeta({ descricao: t.descricao, parceiro: t.parceiro });
    setGrupoOpen(true);
    try {
      const rows = await fetchTitulos(tipo, t.grupoParcelasId);
      setGrupoTitulos(
        [...rows].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as parcelas.",
      );
      setGrupoOpen(false);
    }
  }

  async function refreshGrupo(grupoId: string) {
    const rows = await fetchTitulos(tipo, grupoId);
    setGrupoTitulos(
      [...rows].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (formMode === "create" && comoContrato && canUseContrato) {
      const titulo = contratoForm.titulo.trim();
      if (isAssinaturaPlataforma && !contratoForm.tenantId) {
        setFormTab("contrato");
        toast.error("Selecione a imobiliária.");
        return;
      }
      if (!isAssinaturaPlataforma && form.parceiroId === NONE) {
        setFormTab("dados");
        toast.error(
          tipo === "receber"
            ? "Selecione o cliente ou parceiro."
            : "Selecione o fornecedor.",
        );
        return;
      }
      if (titulo.length < 2) {
        setFormTab("contrato");
        toast.error("Informe o título do contrato.");
        return;
      }
      if (
        isAssinaturaPlataforma &&
        contratoForm.tipo === "assinatura" &&
        !contratoForm.plano
      ) {
        setFormTab("contrato");
        toast.error("Informe o plano da assinatura.");
        return;
      }
      if (!contratoForm.vencimento) {
        setFormTab("contrato");
        toast.error("Informe o vencimento.");
        return;
      }
      if (!form.categoria.trim()) {
        setFormTab("dados");
        toast.error(
          tipo === "receber"
            ? "Selecione a categoria."
            : "Selecione o centro de custo.",
        );
        return;
      }
      const valorAdesao = parseValor(contratoForm.valorAdesao);
      const valorMensalidade = parseValor(contratoForm.valorMensalidade);
      if (
        !Number.isFinite(valorAdesao) ||
        (tipo === "receber" ? valorAdesao <= 0 : valorAdesao < 0)
      ) {
        setFormTab("contrato");
        toast.error("Informe o valor de adesão.");
        return;
      }
      if (!Number.isFinite(valorMensalidade) || valorMensalidade <= 0) {
        setFormTab("contrato");
        toast.error("Informe o valor da mensalidade.");
        return;
      }
      const qtd = parcelado ? Number(qtdParcelas) : 1;
      if (!Number.isFinite(qtd) || qtd < 1) {
        setFormTab("contrato");
        toast.error("Informe a quantidade de mensalidades.");
        return;
      }
      const qtdAdesao = parcelarAdesao ? Number(qtdParcelasAdesao) : 1;
      if (!Number.isFinite(qtdAdesao) || qtdAdesao < 1) {
        setFormTab("contrato");
        toast.error("Informe a quantidade de parcelas da adesão.");
        return;
      }
      setSaving(true);
      try {
        if (isAssinaturaPlataforma) {
          await createPlatformContratoComTitulos({
            tenantId: contratoForm.tenantId,
            titulo,
            tipo: contratoForm.tipo,
            plano:
              contratoForm.tipo === "assinatura" ? contratoForm.plano : null,
            valorAdesao,
            qtdParcelasAdesao: qtdAdesao,
            valorMensalidade,
            qtdMensalidades: qtd,
            dataInicio: contratoForm.dataInicio,
            vencimento: contratoForm.vencimento,
            status: contratoForm.status,
            observacao: contratoForm.observacao.trim() || undefined,
            categoria: form.categoria.trim(),
            parceiroId: form.parceiroId === NONE ? undefined : form.parceiroId,
          });
        } else {
          await createPlatformFornecedorContratoComTitulos({
            parceiroId: form.parceiroId,
            titulo,
            tipo,
            centro:
              tipo === "pagar" ? form.centro.trim() : form.categoria.trim(),
            valorAdesao,
            qtdParcelasAdesao: valorAdesao > 0 ? qtdAdesao : undefined,
            valorMensalidade,
            qtdMensalidades: qtd,
            dataInicio: contratoForm.dataInicio,
            vencimento: contratoForm.vencimento,
            observacao: contratoForm.observacao.trim() || undefined,
          });
        }
        toast.success(
          `Contrato criado com ${qtdAdesao} parcela${qtdAdesao === 1 ? "" : "s"} de adesão e ${qtd} mensalidade${qtd === 1 ? "" : "s"}.`,
        );
        setOpen(false);
        await load();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível salvar.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const descricao = form.descricao.trim();
    if (descricao.length < 2) {
      setFormTab("dados");
      toast.error("Informe a descrição.");
      return;
    }
    if (!form.categoria.trim()) {
      setFormTab("dados");
      toast.error(
        tipo === "receber"
          ? "Selecione a categoria."
          : "Selecione o centro de custo.",
      );
      return;
    }
    const catalog = catalogFields(form.categoria);

    if (formMode === "create" && parcelado) {
      if (parcelasDraft.length < 2) {
        setFormTab("cobranca");
        toast.error("Gere ao menos 2 parcelas.");
        return;
      }
      const parcelas: { vencimento: string; valor: number }[] = [];
      for (const p of parcelasDraft) {
        const v = parseValor(p.valor);
        if (!Number.isFinite(v) || v <= 0) {
          setFormTab("cobranca");
          toast.error("Informe um valor válido em todas as parcelas.");
          return;
        }
        if (!p.vencimento) {
          toast.error("Informe o vencimento de todas as parcelas.");
          return;
        }
        parcelas.push({ vencimento: p.vencimento, valor: v });
      }
      setSaving(true);
      try {
        await createTitulosParcelado({
          tipo,
          descricao,
          parceiroId: form.parceiroId === NONE ? undefined : form.parceiroId,
          categoria: catalog.categoria,
          centro: catalog.centro,
          parcelas,
          indeterminado:
            recorrencia === "mensal" && recorrenciaIndeterminada,
          ...(tipo === "pagar" ? { natureza: form.natureza } : {}),
        });
        toast.success(
          recorrencia === "mensal" && recorrenciaIndeterminada
            ? "Conta mensal contínua criada. Os próximos meses entram automaticamente no fluxo de caixa."
            : `${parcelas.length} lançamentos criados. Eles aparecem no fluxo de caixa nas datas de vencimento.`,
        );
        setOpen(false);
        await load();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível salvar.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formMode === "edit-grupo") {
      if (!editingGrupoId) {
        toast.error("Grupo de parcelas inválido.");
        return;
      }
      const parcelas: {
        id: string;
        vencimento: string;
        valor: number;
      }[] = [];
      for (const p of parcelasDraft) {
        if (!p.id) continue;
        const v = parseValor(p.valor);
        if (!Number.isFinite(v) || v <= 0) {
          toast.error("Informe um valor válido em todas as parcelas.");
          return;
        }
        if (!p.vencimento) {
          toast.error("Informe o vencimento de todas as parcelas.");
          return;
        }
        parcelas.push({ id: p.id, vencimento: p.vencimento, valor: v });
      }
      if (parcelas.length === 0) {
        toast.error("Nenhuma parcela para editar.");
        return;
      }
      setSaving(true);
      try {
        const result = await updateTitulosGrupo(editingGrupoId, {
          descricao,
          parceiroId: form.parceiroId === NONE ? null : form.parceiroId,
          categoria: catalog.categoria,
          centro: catalog.centro,
          ...(tipo === "pagar" ? { natureza: form.natureza } : {}),
          parcelas,
        });
        toast.success(`${result.updated} parcela(s) atualizada(s).`);
        setOpen(false);
        setEditingGrupoId(null);
        await load();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível salvar.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const valor = parseValor(form.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tipo,
        descricao,
        parceiroId: form.parceiroId === NONE ? undefined : form.parceiroId,
        categoria: catalog.categoria,
        centro: catalog.centro,
        vencimento: form.vencimento,
        valor,
        status: form.status,
        parcela:
          formMode === "edit" && !parcelado
            ? ""
            : form.parcela.trim() || undefined,
        ...(tipo === "pagar" ? { natureza: form.natureza } : {}),
      };
      if (formMode === "create") {
        await createTitulo(payload);
        toast.success(
          form.status === "pago"
            ? "Título criado e baixado no fluxo de caixa."
            : "Título criado.",
        );
      } else if (editingId) {
        await updateTitulo(editingId, {
          ...payload,
          parceiroId: form.parceiroId === NONE ? null : form.parceiroId,
        });
        toast.success("Título atualizado.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onBaixar() {
    if (!baixarTarget) return;
    const grupoId = baixarTarget.grupoParcelasId;
    setBusy(true);
    try {
      await baixarTitulo(baixarTarget.id, {
        dataPagamento: baixarData,
        formaPagamento: baixarForma,
      });
      toast.success(
        tipo === "receber"
          ? "Recebimento registrado."
          : "Pagamento registrado.",
      );
      setBaixarTarget(null);
      await load();
      if (grupoOpen && grupoId) {
        await refreshGrupo(grupoId);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível baixar.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteTitulo(deleteTarget.id);
      toast.success("Título excluído.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteGrupo() {
    if (!deleteGrupoTarget) return;
    setBusy(true);
    try {
      const result = await deleteTitulosGrupo(deleteGrupoTarget.grupoId);
      toast.success(
        `${result.deleted} parcela${result.deleted === 1 ? "" : "s"} excluída${result.deleted === 1 ? "" : "s"}.`,
      );
      setDeleteGrupoTarget(null);
      setGrupoOpen(false);
      setGrupoTitulos([]);
      setGrupoMeta(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o parcelamento.",
      );
    } finally {
      setBusy(false);
    }
  }

  const hasActive = Boolean(
    search ||
    periodo !== "mes" ||
    status !== "todos" ||
    categoriaFiltro !== "todos" ||
    origemFiltro !== "todos",
  );

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HideFinanceValuesButton />
            {canCreateFin ? (
              <>
                {canLancarComissao ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={SOFT_BTN}
                    onClick={() => setComissaoDialogOpen(true)}
                  >
                    <Percent className="w-4 h-4 mr-1" />
                    Lançar comissão
                  </Button>
                ) : null}
                <Button
                  onClick={openCreate}
                  className={BRAND_GRADIENT_BTN}
                  style={BRAND_GRADIENT_STYLE}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo título
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3 mb-4">
        <FinanceKpiCard
          label={
            tipo === "receber" ? "A receber neste mês" : "A pagar neste mês"
          }
          value={kpis.aberto}
          icon={Clock3}
          tone="blue-1"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Atrasado neste mês"
          value={kpis.atrasado}
          icon={AlertTriangle}
          tone="blue-2"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label={tipo === "receber" ? "Recebido neste mês" : "Pago neste mês"}
          value={kpis.pago}
          icon={CheckCircle2}
          tone="blue-3"
          blurValue={hideValues}
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar título, parceiro…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        status={status}
        onStatusChange={setStatus}
        tipo={categoriaFiltro}
        onTipoChange={setCategoriaFiltro}
        tipoOptions={categoriaOptions}
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("mes");
          setStatus("todos");
          setCategoriaFiltro("todos");
          setOrigemFiltro("todos");
        }}
        extra={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className={cn(FILTER_LABEL, "mb-0 whitespace-nowrap")}>
              Tipo:
            </span>
            <div
              className={cn(
                FILTER_VISTA_WRAP,
                "grid h-auto flex-1 grid-cols-2 sm:flex sm:w-auto sm:flex-none",
              )}
            >
              {(
                [
                  { value: "todos", label: "Todas" },
                  { value: "normal", label: "Normais" },
                  ...(canUseContrato
                    ? [{ value: "contrato" as const, label: "Contratos" }]
                    : []),
                  ...(!ocultarComissao
                    ? [{ value: "comissao" as const, label: "Comissão" }]
                    : []),
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={
                    origemFiltro === option.value ? "secondary" : "ghost"
                  }
                  className="h-7 px-2 text-xs"
                  aria-pressed={origemFiltro === option.value}
                  onClick={() =>
                    setOrigemFiltro(
                      option.value as
                        | "todos"
                        | "normal"
                        | "contrato"
                        | "comissao",
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
        <Table className="[&_th]:px-4 [&_td]:px-4">
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>{tipo === "pagar" ? "Centro" : "Categoria"}</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-42" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum título no filtro.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((row) => {
                if (row.kind === "single") {
                  const t = row.titulo;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium max-w-50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{t.descricao}</span>
                          <ComissaoOrigemBadge titulo={t} />
                          {tipo === "pagar" && despesaNaturezaLabel(t.natureza) ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px]"
                            >
                              {despesaNaturezaLabel(t.natureza)}
                            </Badge>
                          ) : null}
                          {t.platformContratoId ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px]"
                            >
                              Contrato
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="truncate max-w-35">
                        {t.parceiro || "—"}
                      </TableCell>
                      <TableCell className="truncate max-w-30">
                        {t.categoria || t.centro || "—"}
                      </TableCell>
                      <TableCell>{formatDate(t.vencimento)}</TableCell>
                      <TableCell>{t.parcela || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(t.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(t.status)}
                        >
                          {statusLabel(t.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderTituloActions(t)}</TableCell>
                    </TableRow>
                  );
                }

                const summary = groupSummary(row.titulos);
                const expanded = expandedGrupos.has(row.grupoId);
                const isContrato = row.titulos.some((titulo) =>
                  Boolean(titulo.platformContratoId),
                );
                return (
                  <Fragment key={row.grupoId}>
                    <TableRow>
                      <TableCell className="font-medium max-w-55">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-left w-full min-w-0"
                          onClick={() => toggleGrupo(row.grupoId)}
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{summary.descricao}</span>
                          {row.titulos.some((titulo) => titulo.comissaoId) ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-brand-accent/40 text-[10px] text-brand-accent"
                            >
                              Comissão
                            </Badge>
                          ) : null}
                          {isContrato ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px]"
                            >
                              Contrato
                            </Badge>
                          ) : null}
                        </button>
                      </TableCell>
                      <TableCell className="truncate max-w-35">
                        {summary.parceiro || "—"}
                      </TableCell>
                      <TableCell className="truncate max-w-30">
                        {summary.categoria || summary.centro || "—"}
                      </TableCell>
                      <TableCell>
                        {summary.vencimento
                          ? formatDate(summary.vencimento)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.titulos.some(
                          (titulo) => titulo.recorrenciaIndeterminada,
                        )
                          ? "Mensal contínuo"
                          : `${summary.n} parcela${summary.n === 1 ? "" : "s"}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(summary.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(summary.statusResumo)}
                        >
                          {summary.pagas === summary.n
                            ? statusLabel("pago")
                            : `${summary.pagas}/${summary.n} pagas`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={expanded ? "Recolher" : "Expandir"}
                            onClick={() => toggleGrupo(row.grupoId)}
                          >
                            {expanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver parcelas"
                            onClick={() => void openGrupo(row.titulos[0])}
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </Button>
                          {canEditFin ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Editar todas as parcelas"
                              onClick={() => void openEditGrupo(row.titulos)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          ) : null}
                          {canDeleteFin ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Excluir todas as parcelas"
                              onClick={() =>
                                setDeleteGrupoTarget({
                                  grupoId: row.grupoId,
                                  descricao: summary.descricao,
                                  n: summary.n,
                                  pagas: summary.pagas,
                                })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded
                      ? row.titulos.map((t) => (
                          <TableRow
                            key={`${row.grupoId}-${t.id}`}
                            className="bg-muted/20"
                          >
                            <TableCell className="pl-9 text-sm text-muted-foreground">
                              Parcela {t.parcela || "—"}
                            </TableCell>
                            <TableCell className="truncate max-w-35">
                              {t.parceiro || "—"}
                            </TableCell>
                            <TableCell className="truncate max-w-30">
                              {t.categoria || t.centro || "—"}
                            </TableCell>
                            <TableCell>{formatDate(t.vencimento)}</TableCell>
                            <TableCell>{t.parcela || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {brl(t.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={statusBadgeClass(t.status)}
                              >
                                {statusLabel(t.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1 items-center">
                                {canEditFin &&
                                t.status !== "pago" &&
                                t.status !== "cancelado" ? (
                                  <Button
                                    size="sm"
                                    className="h-7"
                                    onClick={() => openBaixar(t)}
                                  >
                                    <Banknote className="w-3.5 h-3.5 mr-1" />
                                    Pagar
                                  </Button>
                                ) : null}
                                {renderTituloActions(t, {
                                  hideGrupo: true,
                                  hideGrupoEdit: true,
                                  hideBaixar: true,
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
      </div>

      <ComissaoLancamentoDialog
        open={comissaoDialogOpen}
        onOpenChange={setComissaoDialogOpen}
        mode="create"
        via="titulo"
        createSuccessMessage="Comissão lançada — também aparece em Comissões."
        onSaved={() => {
          void load();
        }}
      />

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Banknote className="w-5 h-5" />}
        className="max-w-2xl"
        title={
          formMode === "create"
            ? comoContrato
              ? "Novo contrato"
              : "Novo título"
            : formMode === "edit-grupo"
              ? "Editar parcelas"
              : "Editar título"
        }
        description={
          formMode === "edit-grupo"
            ? "Altere os dados comuns e o vencimento/valor de todas as parcelas, inclusive as pagas."
            : formMode === "edit" && form.status === "pago"
              ? "Título pago: alterações sincronizam o lançamento no fluxo de caixa."
              : tipo === "receber"
                ? "Conta a receber vinculada ao fluxo de caixa."
                : "Conta a pagar vinculada ao fluxo de caixa."
        }
        footer={
          <FormDialogActions
            hint={
              formMode === "create"
                ? "Os campos com * são obrigatórios."
                : undefined
            }
          >
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="titulo-form"
              disabled={saving}
              className={BRAND_GRADIENT_BTN}
              style={BRAND_GRADIENT_STYLE}
            >
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form
            id="titulo-form"
            className="space-y-4 [&_input]:border-primary/20 [&_input]:bg-background/90"
            onSubmit={onSubmit}
          >
            <div className="overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-br from-primary/12 via-card to-card p-4 shadow-sm shadow-primary/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {tipo === "receber" ? (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  {tipo === "receber" ? "Conta a receber" : "Conta a pagar"}
                </span>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                  {comoContrato
                    ? "Contrato"
                    : parcelado && formMode === "create"
                      ? recorrenciaIndeterminada
                        ? "Recorrência mensal"
                        : `Recorrência ${RECORRENCIAS.find((r) => r.value === recorrencia)?.label.toLowerCase()}`
                      : parcelado
                        ? "Título parcelado"
                        : "Título avulso"}
                </span>
                <span className="ml-auto rounded-xl bg-primary/12 px-3 py-1.5 text-sm font-semibold tabular-nums text-primary">
                  {comoContrato
                    ? `Previsto: ${brl(
                        (parseValor(contratoForm.valorAdesao) || 0) +
                          (parseValor(contratoForm.valorMensalidade) || 0) *
                            (Number(qtdParcelas) || 1),
                      )}`
                    : form.valor
                      ? parcelado && formMode === "create"
                        ? recorrenciaIndeterminada
                          ? "Mensal, sem término"
                          : `Total: ${brl(
                            (parseValor(form.valor) || 0) *
                              (Number(qtdParcelas) || 1),
                          )}`
                        : `Valor: ${brl(parseValor(form.valor) || 0)}`
                      : "Preencha os dados"}
                </span>
              </div>
            </div>

            <Tabs
              value={formTab}
              onValueChange={(value) => setFormTab(value as TituloFormTab)}
            >
              <TabsList
                className={cn(
                  FORM_STEP_LIST,
                  comoContrato ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                <TabsTrigger
                  value="dados"
                  className={cn("group", FORM_STEP_TRIGGER)}
                >
                  <span className={FORM_STEP_INDEX}>1</span>
                  Dados
                </TabsTrigger>
                <TabsTrigger
                  value="cobranca"
                  className={cn("group", FORM_STEP_TRIGGER)}
                >
                  <span className={FORM_STEP_INDEX}>2</span>
                  {tipo === "pagar" ? "Pagamento" : "Cobrança"}
                </TabsTrigger>
                {comoContrato ? (
                  <TabsTrigger
                    value="contrato"
                    className={cn("group", FORM_STEP_TRIGGER)}
                  >
                    <span className={FORM_STEP_INDEX}>3</span>
                    Contrato
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </Tabs>

            <FormSection
              icon={
                formTab === "dados" ? (
                  <FileText className="h-4 w-4" />
                ) : formTab === "contrato" ? (
                  <ScrollText className="h-4 w-4" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )
              }
              className={FORM_SECTION}
              title={
                formTab === "dados"
                  ? "Identificação"
                  : formTab === "contrato"
                    ? "Configuração do contrato"
                    : tipo === "pagar"
                      ? "Pagamento e recorrência"
                      : "Cobrança e parcelas"
              }
              description={
                formTab === "dados"
                  ? "Descreva o título e classifique fornecedor, centro e tipo."
                  : formTab === "contrato"
                    ? "Valores de adesão, mensalidade e vigência."
                    : tipo === "pagar"
                      ? "Informe vencimento, valor e se a conta se repete."
                      : "Informe vencimento, valor e se a cobrança se repete."
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {!comoContrato && formTab === "dados" ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Descrição *</Label>
                    <Input
                      value={form.descricao}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, descricao: e.target.value }))
                      }
                      required
                    />
                  </div>
                ) : null}
                {formTab === "dados" ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label>
                        {tipo === "pagar" ? "Fornecedor" : "Parceiro"}
                        {comoContrato && !isAssinaturaPlataforma ? " *" : ""}
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => openQuick("parceiro")}
                      >
                        {tipo === "pagar"
                          ? "+ Novo fornecedor"
                          : "+ Novo parceiro"}
                      </Button>
                    </div>
                    <Select
                      value={form.parceiroId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, parceiroId: v }))
                      }
                    >
                      <SelectTrigger className={FORM_CONTROL}>
                        <SelectValue
                          placeholder={
                            comoContrato && !isAssinaturaPlataforma
                              ? "Selecione"
                              : "Opcional"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {parceiros.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {canUseContrato &&
                formMode === "create" &&
                formTab === "dados" ? (
                  <div
                    className={cn(
                      FORM_OPTION_CARD,
                      comoContrato && FORM_OPTION_CARD_ACTIVE,
                    )}
                  >
                    <Checkbox
                      id="titulo-contrato"
                      className="mt-0.5"
                      checked={comoContrato}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setComoContrato(on);
                        setFormTab(on ? "contrato" : "dados");
                        if (on) {
                          setParcelado(false);
                          setRecorrencia("unica");
                          setRecorrenciaIndeterminada(false);
                          setParcelasDraft([]);
                          setQtdParcelas("1");
                          setParcelarAdesao(false);
                          setQtdParcelasAdesao("2");
                          setContratoForm((f) => ({
                            ...f,
                            titulo: form.descricao || f.titulo,
                            tenantId: f.tenantId || tenants[0]?.id || "",
                            vencimento: form.vencimento || f.vencimento,
                          }));
                        } else {
                          setQtdParcelas("2");
                          setParcelarAdesao(false);
                        }
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <Label
                        htmlFor="titulo-contrato"
                        className="cursor-pointer"
                      >
                        Contrato
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isAssinaturaPlataforma
                          ? "Gera adesão + mensalidades vinculadas à imobiliária."
                          : tipo === "receber"
                            ? "Gera adesão + mensalidades vinculadas ao cliente."
                            : "Adesão opcional e mensalidades do fornecedor. Para conta fixa simples (aluguel, condomínio), use recorrência abaixo."}
                      </p>
                    </div>
                  </div>
                ) : null}
                {canLancarComissao &&
                formMode === "create" &&
                formTab === "dados" ? (
                  <div className={FORM_OPTION_CARD}>
                    <Checkbox
                      id="titulo-comissao"
                      className="mt-0.5"
                      checked={false}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setOpen(false);
                          setComissaoDialogOpen(true);
                        }
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <Label
                        htmlFor="titulo-comissao"
                        className="cursor-pointer"
                      >
                        Comissão
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Abre o mesmo cadastro de Comissões: venda, percentuais
                        e prévia do cálculo.
                      </p>
                    </div>
                  </div>
                ) : null}
                {!comoContrato &&
                formMode === "create" &&
                formTab === "dados" ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Conta fixa ou recorrente</Label>
                    <Select
                      value={recorrencia}
                      onValueChange={(value) =>
                        applyRecorrencia(value as Recorrencia)
                      }
                    >
                      <SelectTrigger className={FORM_CONTROL}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORRENCIAS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {recorrencia === "unica"
                        ? tipo === "pagar"
                          ? "Um único lançamento. Para aluguel, condomínio ou assinatura no período, escolha a frequência — valor e vencimentos ficam em Pagamento."
                          : "Um único lançamento. Para repetir no período, escolha a frequência — valor e vencimentos ficam em Cobrança."
                        : "Gera um lançamento por vencimento no fluxo de caixa. Informe valor, 1º vencimento e quantidade na aba seguinte."}
                    </p>
                  </div>
                ) : null}
                {tipo === "pagar" &&
                (formTab === "dados" || formMode === "edit-grupo") ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Tipo de despesa *</Label>
                    <div className={cn(FILTER_VISTA_WRAP, "h-10 p-1")}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-4 text-primary hover:bg-primary/10 hover:text-primary",
                          form.natureza === "fixa" &&
                            "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                        )}
                        onClick={() =>
                          setForm((f) => ({ ...f, natureza: "fixa" }))
                        }
                      >
                        Fixa
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-4 text-primary hover:bg-primary/10 hover:text-primary",
                          form.natureza === "variavel" &&
                            "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                        )}
                        onClick={() =>
                          setForm((f) => ({ ...f, natureza: "variavel" }))
                        }
                      >
                        Variável
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fixa: aluguel, folha, assinatura. Variável: marketing,
                      comissão, compra avulsa.
                    </p>
                  </div>
                ) : null}
                {comoContrato &&
                canUseContrato &&
                formMode === "create" &&
                formTab === "contrato" ? (
                  <>
                    {isAssinaturaPlataforma ? (
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Imobiliária *</Label>
                        <Select
                          value={contratoForm.tenantId || undefined}
                          onValueChange={(v) =>
                            setContratoForm((f) => ({ ...f, tenantId: v }))
                          }
                        >
                          <SelectTrigger className={FORM_CONTROL}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name} ({PLANO_LABELS[t.plano]})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Título do contrato *</Label>
                      <Input
                        value={contratoForm.titulo}
                        onChange={(e) =>
                          setContratoForm((f) => ({
                            ...f,
                            titulo: e.target.value,
                          }))
                        }
                        placeholder={
                          isAssinaturaPlataforma
                            ? "Ex.: Assinatura anual Ouro"
                            : "Ex.: Contrato de locação"
                        }
                      />
                    </div>
                    {isAssinaturaPlataforma ? (
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <Select
                          value={contratoForm.tipo}
                          onValueChange={(v) =>
                            setContratoForm((f) => ({
                              ...f,
                              tipo: v as PlatformContratoTipo,
                            }))
                          }
                        >
                          <SelectTrigger className={FORM_CONTROL}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assinatura">
                              Assinatura
                            </SelectItem>
                            <SelectItem value="financeiro">
                              Financeiro
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    {isAssinaturaPlataforma ? (
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select
                          value={contratoForm.status}
                          onValueChange={(v) =>
                            setContratoForm((f) => ({
                              ...f,
                              status: v as PlatformContratoStatus,
                            }))
                          }
                        >
                          <SelectTrigger className={FORM_CONTROL}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proposta">Proposta</SelectItem>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                            <SelectItem value="encerrado">Encerrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    {isAssinaturaPlataforma &&
                    contratoForm.tipo === "assinatura" ? (
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Plano</Label>
                        <Select
                          value={contratoForm.plano}
                          onValueChange={(v) =>
                            setContratoForm((f) => ({
                              ...f,
                              plano: v as TenantPlano,
                            }))
                          }
                        >
                          <SelectTrigger className={FORM_CONTROL}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(PLANO_LABELS) as TenantPlano[]).map(
                              (p) => (
                                <SelectItem key={p} value={p}>
                                  {PLANO_LABELS[p]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label>Início *</Label>
                      <Input
                        type="date"
                        value={contratoForm.dataInicio}
                        onChange={(e) =>
                          setContratoForm((f) => ({
                            ...f,
                            dataInicio: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Vencimento / próximo *</Label>
                      <Input
                        type="date"
                        value={contratoForm.vencimento}
                        onChange={(e) =>
                          setContratoForm((f) => ({
                            ...f,
                            vencimento: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/3 p-3">
                      <Label className="text-primary">
                        Adesão · valor total (R$){" "}
                        {tipo === "receber" ? "*" : "(opcional)"}
                      </Label>
                      <Input
                        inputMode="numeric"
                        value={contratoForm.valorAdesao}
                        onChange={(e) =>
                          setContratoForm((f) => ({
                            ...f,
                            valorAdesao: maskMoneyInput(e.target.value),
                          }))
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-sky-500/20 bg-sky-500/3 p-3">
                      <Label className="text-sky-700 dark:text-sky-300">
                        Mensalidade · valor por cobrança (R$) *
                      </Label>
                      <Input
                        inputMode="numeric"
                        value={contratoForm.valorMensalidade}
                        onChange={(e) =>
                          setContratoForm((f) => ({
                            ...f,
                            valorMensalidade: maskMoneyInput(e.target.value),
                          }))
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/3 px-3 py-2.5">
                      <Checkbox
                        id="contrato-adesao-parcelada"
                        className="mt-0.5"
                        checked={parcelarAdesao}
                        onCheckedChange={(checked) => {
                          const on = checked === true;
                          setParcelarAdesao(on);
                          setQtdParcelasAdesao(on ? "2" : "1");
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor="contrato-adesao-parcelada"
                          className="cursor-pointer"
                        >
                          Parcelar adesão
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Divide o valor total da adesão em títulos mensais
                          separados.
                        </p>
                      </div>
                    </div>
                    {parcelarAdesao ? (
                      <div className="sm:col-span-2 space-y-1.5 rounded-lg border border-primary/20 bg-primary/3 p-3">
                        <Label>Qtd. parcelas da adesão *</Label>
                        <Input
                          type="number"
                          min={2}
                          max={120}
                          value={qtdParcelasAdesao}
                          onChange={(e) => setQtdParcelasAdesao(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-sky-500/20 bg-sky-500/3 px-3 py-2.5">
                      <Checkbox
                        id="contrato-parcelado"
                        className="mt-0.5"
                        checked={parcelado}
                        onCheckedChange={(checked) => {
                          const on = checked === true;
                          setParcelado(on);
                          setQtdParcelas(on ? "3" : "1");
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor="contrato-parcelado"
                          className="cursor-pointer"
                        >
                          Parcelar mensalidades
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Sem parcelar: adesão + 1 mensalidade no vencimento.
                        </p>
                      </div>
                    </div>
                    {parcelado ? (
                      <div className="sm:col-span-2 space-y-1.5 rounded-lg border border-sky-500/20 bg-sky-500/3 p-3">
                        <Label>Qtd. mensalidades *</Label>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={qtdParcelas}
                          onChange={(e) => setQtdParcelas(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Observação</Label>
                      <Input
                        value={contratoForm.observacao}
                        onChange={(e) =>
                          setContratoForm((f) => ({
                            ...f,
                            observacao: e.target.value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </div>
                  </>
                ) : null}
                {!comoContrato &&
                formTab === "cobranca" &&
                formMode === "create" ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Recorrência</Label>
                    <Select
                      value={recorrencia}
                      onValueChange={(value) =>
                        applyRecorrencia(value as Recorrencia)
                      }
                    >
                      <SelectTrigger className={FORM_CONTROL}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORRENCIAS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {recorrencia === "unica"
                        ? "Um único lançamento na data de vencimento."
                        : "Conta fixa no período: mesmo valor em cada vencimento, visível no fluxo de caixa."}
                    </p>
                  </div>
                ) : null}
                {!comoContrato &&
                formTab === "cobranca" &&
                formMode === "edit" ? (
                  <div
                    className={cn(
                      FORM_OPTION_CARD,
                      parcelado && FORM_OPTION_CARD_ACTIVE,
                    )}
                  >
                    <Checkbox
                      id="titulo-parcelado"
                      className="mt-0.5"
                      checked={parcelado}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setParcelado(on);
                        if (!on) {
                          setParcelasDraft([]);
                          setForm((f) => ({ ...f, parcela: "" }));
                        }
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <Label
                        htmlFor="titulo-parcelado"
                        className="cursor-pointer"
                      >
                        Parcelar
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ative para informar o rótulo da parcela (ex.: 1/3).
                      </p>
                    </div>
                  </div>
                ) : null}
                {!comoContrato &&
                formTab === "cobranca" &&
                formMode !== "edit-grupo" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>
                        {parcelado && formMode === "create"
                          ? "1º vencimento *"
                          : "Vencimento *"}
                      </Label>
                      <Input
                        type="date"
                        value={form.vencimento}
                        onChange={(e) => {
                          const vencimento = e.target.value;
                          setForm((f) => ({ ...f, vencimento }));
                          if (parcelado && formMode === "create") {
                            regenerateParcelas(
                              form.valor,
                              qtdParcelas,
                              vencimento,
                            );
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        {parcelado && formMode === "create"
                          ? "Valor de cada parcela (R$) *"
                          : "Valor (R$) *"}
                      </Label>
                      <Input
                        inputMode="numeric"
                        value={form.valor}
                        onChange={(e) => {
                          const valor = maskMoneyInput(e.target.value);
                          setForm((f) => ({ ...f, valor }));
                          if (parcelado && formMode === "create") {
                            regenerateParcelas(
                              valor,
                              qtdParcelas,
                              form.vencimento,
                            );
                          }
                        }}
                        required={!parcelado || formMode === "edit"}
                      />
                    </div>
                  </>
                ) : null}
                {!comoContrato &&
                formTab === "cobranca" &&
                parcelado &&
                formMode === "create" &&
                recorrencia === "mensal" ? (
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant={recorrenciaIndeterminada ? "default" : "outline"}
                      className={cn(
                        "w-full sm:w-auto",
                        recorrenciaIndeterminada
                          ? BRAND_GRADIENT_BTN
                          : SOFT_BTN,
                      )}
                      style={
                        recorrenciaIndeterminada
                          ? BRAND_GRADIENT_STYLE
                          : undefined
                      }
                      onClick={toggleRecorrenciaIndeterminada}
                    >
                      <Repeat className="w-4 h-4 mr-1.5" />
                      {recorrenciaIndeterminada
                        ? "Repetindo todo mês (sem prazo)"
                        : "Repetir todo mês por tempo indeterminado"}
                    </Button>
                    {recorrenciaIndeterminada ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Continua todo mês até você encerrar o grupo, sem data
                        de término. As parcelas seguintes entram
                        automaticamente.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {!comoContrato &&
                formTab === "cobranca" &&
                parcelado &&
                formMode === "create" &&
                !recorrenciaIndeterminada ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Quantidade *</Label>
                    <Input
                      type="number"
                      min={2}
                      max={120}
                      value={qtdParcelas}
                      onChange={(e) => {
                        const next = e.target.value;
                        setQtdParcelas(next);
                        regenerateParcelas(form.valor, next, form.vencimento);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantas vezes o lançamento se repete (
                      {RECORRENCIAS.find((r) => r.value === recorrencia)?.label.toLowerCase()}
                      ).
                    </p>
                  </div>
                ) : null}
                {!comoContrato &&
                formTab === "cobranca" &&
                parcelado &&
                formMode === "edit" ? (
                  <div className="space-y-1.5">
                    <Label>Parcela</Label>
                    <Input
                      value={form.parcela}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, parcela: e.target.value }))
                      }
                      placeholder="Ex.: 1/3"
                    />
                  </div>
                ) : null}
                {(formTab === "cobranca" &&
                  !comoContrato &&
                  parcelado &&
                  formMode === "create" &&
                  parcelasDraft.length > 0) ||
                (formTab === "cobranca" && formMode === "edit-grupo") ? (
                  <div className="sm:col-span-2 space-y-2">
                    <Label>
                      {formMode === "edit-grupo"
                        ? "Todas as parcelas"
                        : "Parcelas"}
                    </Label>
                    {formMode === "edit-grupo" &&
                    (parcelasDraft.some((p) =>
                      isParcelaDoContrato(p, "adesao"),
                    ) ||
                      parcelasDraft.some((p) =>
                        isParcelaDoContrato(p, "mensalidade"),
                      )) ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/3 p-3 space-y-3">
                        <div>
                          <p className="text-sm font-medium">
                            Editar parcelas do contrato
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Selecione um grupo para alterar o valor de todas as
                            suas parcelas de uma vez.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {parcelasDraft.some((p) =>
                            isParcelaDoContrato(p, "adesao"),
                          ) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                grupoParcelaSelecionada === "adesao"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => selecionarGrupoParcelas("adesao")}
                            >
                              Adesão (
                              {
                                parcelasDraft.filter((p) =>
                                  isParcelaDoContrato(p, "adesao"),
                                ).length
                              }
                              )
                            </Button>
                          ) : null}
                          {parcelasDraft.some((p) =>
                            isParcelaDoContrato(p, "mensalidade"),
                          ) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                grupoParcelaSelecionada === "mensalidade"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                selecionarGrupoParcelas("mensalidade")
                              }
                            >
                              Mensalidades (
                              {
                                parcelasDraft.filter((p) =>
                                  isParcelaDoContrato(p, "mensalidade"),
                                ).length
                              }
                              )
                            </Button>
                          ) : null}
                        </div>
                        {grupoParcelaSelecionada ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              inputMode="numeric"
                              value={valorGrupoParcelas}
                              onChange={(e) =>
                                setValorGrupoParcelas(
                                  maskMoneyInput(e.target.value),
                                )
                              }
                              placeholder={`Valor por parcela de ${
                                grupoParcelaSelecionada === "adesao"
                                  ? "adesão"
                                  : "mensalidade"
                              }`}
                            />
                            <Button
                              type="button"
                              onClick={aplicarValorAoGrupoParcelas}
                            >
                              Aplicar valor
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/50">
                      {parcelasDraft.map((p, idx) => (
                        <div
                          key={p.id ?? `parcela-${idx}`}
                          className={`grid grid-cols-[auto_1fr_1fr] gap-2 items-center p-2 ${
                            grupoParcelaSelecionada &&
                            isParcelaDoContrato(p, grupoParcelaSelecionada)
                              ? "bg-primary/10"
                              : ""
                          }`}
                        >
                          <span className="text-xs text-muted-foreground w-12">
                            {p.label || `${idx + 1}/${parcelasDraft.length}`}
                          </span>
                          <Input
                            type="date"
                            value={p.vencimento}
                            onChange={(e) => {
                              const vencimento = e.target.value;
                              setParcelasDraft((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, vencimento } : row,
                                ),
                              );
                            }}
                          />
                          <Input
                            inputMode="decimal"
                            value={p.valor}
                            onChange={(e) => {
                              const valor = maskMoneyInput(e.target.value);
                              setParcelasDraft((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, valor } : row,
                                ),
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total:{" "}
                      {brl(
                        parcelasDraft.reduce(
                          (s, p) => s + (parseValor(p.valor) || 0),
                          0,
                        ),
                      )}
                      {formMode === "edit-grupo"
                        ? " · Alterações em parcelas pagas atualizam o lançamento no fluxo."
                        : ""}
                    </p>
                  </div>
                ) : null}
                {formTab === "dados" ||
                (formMode === "edit-grupo" && formTab === "cobranca") ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label>{catalogLabel} *</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => openQuick("categoria")}
                      >
                        +{" "}
                        {tipo === "receber" ? "Nova categoria" : "Novo centro"}
                      </Button>
                    </div>
                    <CategoriaSearchSelect
                      value={form.categoria}
                      options={categorias}
                      className={FORM_CONTROL}
                      onChange={(v) => {
                        const match = catalogTipos.find(
                          (item) =>
                            item.nome.toLowerCase() === v.trim().toLowerCase(),
                        );
                        setForm((f) => ({
                          ...f,
                          ...catalogFields(v),
                          ...(tipo === "pagar" && match
                            ? {
                                natureza:
                                  match.natureza === "fixa"
                                    ? "fixa"
                                    : "variavel",
                              }
                            : {}),
                        }));
                      }}
                      placeholder={
                        tipo === "receber"
                          ? "Buscar categoria…"
                          : "Buscar centro de custo…"
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {catalogHint}
                    </p>
                  </div>
                ) : null}
                {formMode !== "edit-grupo" &&
                !comoContrato &&
                formTab === "dados" &&
                !(parcelado && formMode === "create") ? (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          status: v as StatusTitulo,
                        }))
                      }
                    >
                      <SelectTrigger className={FORM_CONTROL}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="pago">
                          {formMode === "create" ? "Pago já" : "Pago"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.status === "pago" ? (
                      <p className="text-[11px] text-muted-foreground">
                        {formMode === "create"
                          ? "Já entra como pago/recebido no fluxo de caixa."
                          : "Mudar para Aberto/Atrasado/Cancelado estorna a baixa no fluxo de caixa."}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </FormSection>
          </form>
        </FormDialogBody>
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
            ? tipo === "pagar"
              ? "Novo fornecedor"
              : "Novo parceiro"
            : tipo === "receber"
              ? "Nova categoria"
              : "Novo centro de custo"
        }
        description={
          quickKind === "categoria"
            ? tipo === "receber"
              ? "Fica disponível em Contas a receber."
              : "Fica disponível em Contas a pagar."
            : "Criação rápida para usar neste título."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setQuickKind(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="quick-financeiro-form"
              disabled={quickSaving}
              className={BRAND_GRADIENT_BTN}
              style={BRAND_GRADIENT_STYLE}
            >
              {quickSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <form
            id="quick-financeiro-form"
            className="space-y-3"
            onSubmit={handleQuickCreate}
          >
            <div className="space-y-1.5">
              <Label htmlFor="quick-fin-nome">Nome *</Label>
              <Input
                id="quick-fin-nome"
                value={quickNome}
                onChange={(e) => setQuickNome(e.target.value)}
                placeholder={
                  quickKind === "parceiro"
                    ? "Ex.: RedBull"
                    : quickKind === "categoria"
                      ? "Ex.: Aluguel"
                      : "Ex.: Comercial"
                }
                autoFocus
                required
              />
            </div>
            {quickKind === "parceiro" ? (
              <div className="space-y-1.5">
                <Label htmlFor="quick-fin-doc">CPF / CNPJ *</Label>
                <Input
                  id="quick-fin-doc"
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

      <FormDialogShell
        open={!!baixarTarget}
        onOpenChange={(o) => !o && setBaixarTarget(null)}
        icon={<Banknote className="w-5 h-5" />}
        title={
          tipo === "receber" ? "Registrar recebimento" : "Registrar pagamento"
        }
        description={
          baixarTarget
            ? `${baixarTarget.descricao}${
                baixarTarget.parcela ? ` · Parcela ${baixarTarget.parcela}` : ""
              }`
            : undefined
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setBaixarTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy}
              className={BRAND_GRADIENT_BTN}
              style={BRAND_GRADIENT_STYLE}
              onClick={() => void onBaixar()}
            >
              {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar baixa
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection
            icon={<Wallet className="h-4 w-4" />}
            className={FORM_SECTION}
            title={tipo === "receber" ? "Recebimento" : "Pagamento"}
            description="Confirme a data e a forma para lançar no fluxo de caixa."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data do pagamento</Label>
                <Input
                  type="date"
                  value={baixarData}
                  onChange={(e) => setBaixarData(e.target.value)}
                  className={FORM_CONTROL}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={baixarForma} onValueChange={setBaixarForma}>
                  <SelectTrigger className={FORM_CONTROL}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {baixarTarget ? (
                <div className="sm:col-span-2 space-y-1 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-sm text-muted-foreground">
                  <p>
                    Valor:{" "}
                    <span className="font-semibold tabular-nums text-primary">
                      {brl(baixarTarget.valor)}
                    </span>
                  </p>
                <p>
                  Vencimento:{" "}
                  <span className="text-foreground">
                    {formatDate(baixarTarget.vencimento)}
                  </span>
                </p>
                <p>O lançamento entra no fluxo de caixa como realizado.</p>
              </div>
            ) : null}
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={!!detalhesTarget}
        onOpenChange={(open) => !open && setDetalhesTarget(null)}
        icon={<Eye className="w-5 h-5" />}
        title="Detalhes da conta"
        description={
          detalhesTarget
            ? detalhesTarget.comissaoId
              ? "Conta originada de comissão."
              : detalhesTarget.platformContratoId
                ? "Conta vinculada a contrato."
                : "Conta financeira avulsa."
            : undefined
        }
        footer={
          <FormDialogActions>
            {detalhesTarget?.comissaoId ? (
              <Button asChild size="sm">
                <Link
                  to="/financeiro/comissao"
                  search={{ id: detalhesTarget.comissaoId }}
                >
                  <Percent className="h-3.5 w-3.5" />
                  Abrir comissão
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetalhesTarget(null)}
            >
              Fechar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {detalhesTarget ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="font-medium">{detalhesTarget.descricao}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <ComissaoOrigemBadge titulo={detalhesTarget} />
                    {detalhesTarget.platformContratoId ? (
                      <Badge variant="outline">Contrato</Badge>
                    ) : detalhesTarget.comissaoId ? null : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(detalhesTarget.status)}
                    >
                      {statusLabel(detalhesTarget.status)}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {brl(detalhesTarget.valor)}
                </p>
              </div>

              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailItem
                  label="Vencimento"
                  value={formatDate(detalhesTarget.vencimento)}
                />
                <DetailItem
                  label={tipo === "receber" ? "Parceiro" : "Fornecedor"}
                  value={detalhesTarget.parceiro || "—"}
                />
                <DetailItem
                  label={tipo === "receber" ? "Categoria" : "Centro de custo"}
                  value={
                    detalhesTarget.categoria || detalhesTarget.centro || "—"
                  }
                />
                <DetailItem
                  label="Parcela"
                  value={detalhesTarget.parcela || "—"}
                />
                {detalhesTarget.dataPagamento ? (
                  <>
                    <DetailItem
                      label={
                        tipo === "receber"
                          ? "Data do recebimento"
                          : "Data do pagamento"
                      }
                      value={formatDate(detalhesTarget.dataPagamento)}
                    />
                    <DetailItem
                      label="Forma de pagamento"
                      value={detalhesTarget.formaPagamento || "—"}
                    />
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={grupoOpen}
        onOpenChange={(o) => {
          if (!o) {
            setGrupoOpen(false);
            setGrupoTitulos([]);
            setGrupoMeta(null);
          }
        }}
        icon={<ListOrdered className="w-5 h-5" />}
        title="Parcelas"
        description={
          grupoMeta
            ? `${grupoMeta.descricao}${
                grupoMeta.parceiro ? ` · ${grupoMeta.parceiro}` : ""
              }`
            : undefined
        }
        footer={
          <FormDialogActions>
            {canEditFin && grupoTitulos.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void openEditGrupo(grupoTitulos)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Editar todas
              </Button>
            ) : null}
            {canDeleteFin && grupoTitulos[0]?.grupoParcelasId ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const pagas = grupoTitulos.filter(
                    (t) => t.status === "pago",
                  ).length;
                  setDeleteGrupoTarget({
                    grupoId: grupoTitulos[0].grupoParcelasId!,
                    descricao:
                      grupoMeta?.descricao || grupoTitulos[0].descricao,
                    n: grupoTitulos.length,
                    pagas,
                  });
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir todas
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGrupoOpen(false);
                setGrupoTitulos([]);
                setGrupoMeta(null);
              }}
            >
              Fechar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {(() => {
            const abertas = grupoTitulos.filter(
              (t) => t.status === "aberto" || t.status === "atrasado",
            );
            const pagas = grupoTitulos.filter((t) => t.status === "pago");
            const total = grupoTitulos.reduce((s, t) => s + t.valor, 0);
            const totalPago = pagas.reduce((s, t) => s + t.valor, 0);
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Total {brl(total)} · Pago {brl(totalPago)} · Em aberto{" "}
                  {brl(total - totalPago)}
                </p>
                {grupoTitulos.some((t) => t.recorrenciaIndeterminada) ? (
                  <p className="text-xs text-muted-foreground">
                    Recorrência sem data de término. Novas parcelas entram
                    automaticamente à frente.
                  </p>
                ) : null}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Em aberto</h4>
                  {abertas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma parcela em aberto.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                      {abertas.map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              Parcela {t.parcela || "—"} · {brl(t.valor)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Venc. {formatDate(t.vencimento)} ·{" "}
                              {statusLabel(t.status)}
                            </p>
                          </div>
                          {canEditFin ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setBaixarTarget(t);
                                setBaixarData(todayIso());
                                setBaixarForma(FORMAS[0]);
                              }}
                            >
                              <Banknote className="w-3.5 h-3.5 mr-1" />
                              Pagar
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Pagas</h4>
                  {pagas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma parcela paga ainda.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border/60 divide-y divide-border/50">
                      {pagas.map((t) => (
                        <div key={t.id} className="p-3">
                          <p className="text-sm font-medium">
                            Parcela {t.parcela || "—"} · {brl(t.valor)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pago em{" "}
                            {t.dataPagamento
                              ? formatDate(t.dataPagamento)
                              : "—"}
                            {t.formaPagamento ? ` · ${t.formaPagamento}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir título?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.descricao}.
              {deleteTarget?.status === "pago"
                ? " O lançamento no fluxo de caixa também será removido e os totais do dashboard serão atualizados."
                : " Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteGrupoTarget}
        onOpenChange={(o) => !o && setDeleteGrupoTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todas as parcelas?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGrupoTarget
                ? `${deleteGrupoTarget.descricao} — ${deleteGrupoTarget.n} parcela${deleteGrupoTarget.n === 1 ? "" : "s"}${
                    deleteGrupoTarget.pagas > 0
                      ? ` (${deleteGrupoTarget.pagas} já paga${deleteGrupoTarget.pagas === 1 ? "" : "s"})`
                      : ""
                  }. Remove o parcelamento inteiro, inclusive baixas no fluxo de caixa.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void onDeleteGrupo();
              }}
            >
              Excluir todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
