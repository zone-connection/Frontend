import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import {
  createEmpreendimento,
  deleteEmpreendimento,
  deleteEmpreendimentoImagem,
  EMPREENDIMENTO_MAX_IMAGES,
  empreendimentoHasLitoral,
  empreendimentoCapa,
  empreendimentoImagens,
  empreendimentoLocalidadeNome,
  empreendimentoStatusLabel,
  empreendimentoTipoLabel,
  fetchEmpreendimentoMatches,
  fetchEmpreendimentos,
  updateEmpreendimento,
  uploadEmpreendimentoImagem,
  type Empreendimento,
  type EmpreendimentoMatchesResult,
  type EmpreendimentoTipologia,
} from "@/lib/empreendimentos-api";
import { tipologiasVisiveis } from "@/lib/empreendimento-tipologias";
import { brl } from "@/lib/crm-types";
import {
  formatMoneyInput,
  maskMoneyInput,
  maskReaisInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { useCatalog } from "@/lib/catalog-store";
import { nextCatalogColor, STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CatalogItem } from "@/lib/catalog-api";
import { cn } from "@/lib/utils";
import {
  createConstrutora,
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  createLocalidade,
  fetchLocalidades,
  type Localidade,
} from "@/lib/localidades-api";
import { CorPicker } from "@/components/cor-picker";
import {
  exportEmpreendimentosToPdf,
  PDF_ORDEM_IMOVEIS_LABEL,
  type PdfOrdemImoveis,
} from "@/lib/imoveis-pdf";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useImoveisCamposVisiveis, useImoveisVista } from "@/lib/imoveis-nav-prefs";
import {
  assertImageFile,
  ImageUploadField,
} from "@/components/image-upload-field";
import { CatalogUnidadeImoveis } from "@/components/catalog-unidade-imoveis";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  fetchCaptacaoImoveis,
  formatBrl,
  IMOVEL_CARACTERISTICAS_DIFERENCIAIS,
  IMOVEL_DETALHES_IMOVEL,
  IMOVEL_LOCALIZACAO_INFRA,
  type Imovel,
} from "@/lib/captacao-api";
import { AmenityChips } from "@/components/imovel-ficha-fields";
import {
  Building2,
  Car,
  LayoutGrid,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  Bath,
  BedDouble,
  Ruler,
  Trash2,
  MapPin,
  Tag,
  Layers,
  Home,
  CircleDot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  StickyNote,
  Palette,
  Search,
  Users,
  Wallet,
  MessageCircle,
  Globe,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fetchNotificacoes } from "@/lib/notificacoes-api";
import { SOFT_BTN, SOFT_BTN_ACTIVE } from "@/lib/soft-btn";
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import {
  FILTER_BAR_STACK,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
  FILTER_LABEL,
  FILTER_SEARCH_ICON,
  FILTER_VISTA_BTN,
  FILTER_VISTA_BTN_ACTIVE,
  FILTER_VISTA_WRAP,
  TABLE_LUX,
  TABLE_SHELL,
} from "@/lib/filter-bar";

const IMOVEIS_GRADIENT_BTN =
  "border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110";
const IMOVEIS_GRADIENT_STYLE = BRAND_GRADIENT_STYLE;
const IMOVEIS_TABLE_CHIP =
  "h-5 w-auto max-w-[8.5rem] min-w-0 shrink rounded-full border-transparent px-2 py-0 text-[10px] font-medium leading-5 shadow-none";
const CLEAR_TH_BG = { backgroundColor: "transparent" } as const;

const MATCH_MOTIVO_LABEL: Record<string, string> = {
  localizacao: "Localização",
  valor: "Faixa de preço",
  quartos: "Quartos",
  vagas: "Vagas",
  tags: "Preferências",
  interesse_previo: "Interesse prévio",
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function whatsappHref(telefone: string) {
  const digits = digitsOnly(telefone);
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function ImoveisTableHead({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <TableHead
      style={CLEAR_TH_BG}
      className={cn(
        "h-11 bg-transparent text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

type EmpCatalogType =
  | "empreendimento_tipo"
  | "empreendimento_status"
  | "empreendimento_tag";

const EMPREENDIMENTO_CATALOG_TITLES: Record<EmpCatalogType, string> = {
  empreendimento_tipo: "Novo tipo",
  empreendimento_status: "Novo status",
  empreendimento_tag: "Nova tag",
};

const EMPREENDIMENTO_CATALOG_EDIT_TITLES: Record<EmpCatalogType, string> = {
  empreendimento_tipo: "Editar tipo",
  empreendimento_status: "Editar status",
  empreendimento_tag: "Editar tag",
};

const EMPREENDIMENTO_CATALOG_SINGULAR: Record<EmpCatalogType, string> = {
  empreendimento_tipo: "tipo",
  empreendimento_status: "status",
  empreendimento_tag: "tag",
};

function withExtraLabel(labels: string[], extra: string) {
  const value = extra.trim();
  if (!value) return labels;
  if (labels.some((label) => label === value)) return labels;
  return [...labels, value];
}

function withExtraLabels(labels: string[], extras: string[]) {
  let next = labels;
  for (const extra of extras) next = withExtraLabel(next, extra);
  return next;
}

type EmpreendimentoFormTab =
  | "identidade"
  | "localidade"
  | "classificacao"
  | "unidade"
  | "prazos"
  | "caracteristicas"
  | "vitrine"
  | "observacao";

const EMPREENDIMENTO_FORM_STEPS: Array<{
  id: EmpreendimentoFormTab;
  label: string;
}> = [
  { id: "identidade", label: "Identidade" },
  { id: "localidade", label: "Local" },
  { id: "classificacao", label: "Tipo" },
  { id: "unidade", label: "Tipologia" },
  { id: "prazos", label: "Prazos" },
  { id: "caracteristicas", label: "Itens" },
  { id: "vitrine", label: "Vitrine" },
  { id: "observacao", label: "Notas" },
];

const TIPOS_UNIDADE_OPCOES = [
  "Com varanda",
  "Sem varanda",
  "Garden",
  "Cobertura",
  "Térreo",
  "Duplex",
  "Studio",
  "Frente mar",
] as const;

type TipologiaFormRow = Omit<EmpreendimentoTipologia, "valor"> & {
  key: string;
  valor: string;
};

function newTipologiaKey() {
  return `tipologia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTipologia(): TipologiaFormRow {
  return {
    key: newTipologiaKey(),
    nome: "",
    areaM2: null,
    quartos: null,
    suites: null,
    banheiros: null,
    vagas: null,
    valor: "",
    pavimento: null,
  };
}

function tipologiaFromApi(row: EmpreendimentoTipologia): TipologiaFormRow {
  return {
    ...row,
    key: newTipologiaKey(),
    valor: row.valor != null ? maskReaisInput(String(Math.round(row.valor))) : "",
  };
}

function tipologiaToApi(row: TipologiaFormRow): EmpreendimentoTipologia {
  const parsed = parseOptionalMoneyInput(row.valor);
  const { key: _key, ...rest } = row;
  return {
    ...rest,
    valor: parsed != null ? Math.round(parsed) : null,
  };
}

function FormField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type EmpreendimentoForm = {
  nome: string;
  construtoraId: string;
  novaConstrutora: boolean;
  construtoraNome: string;
  localidadeId: string;
  novaLocalidade: boolean;
  localidadeNome: string;
  endereco: string;
  cor: string;
  tipo: string;
  status: string;
  tags: string[];
  previsaoEntrega: string;
  areaM2: string;
  quartos: string;
  vagas: string;
  valorReferencia: string;
  rendaAPartirDe: string;
  observacao: string;
  vitrineHeadline: string;
  vitrineDescricao: string;
  vitrineDiferenciais: string;
  vitrineLazer: string;
  vitrineLazerItems: string[];
  vitrineInfra: string[];
  vitrineDetalhes: string[];
  vitrineNumero: string;
  vitrineBairro: string;
  vitrineEstado: string;
  vitrineCep: string;
  vitrineWebsite: string;
  vitrineTour: string;
  vitrineLancamento: string;
  vitrineUnidades: string;
  vitrineAndares: string;
  vitrineNomeCondominio: string;
  vitrineSuites: string;
  vitrineAreaMax: string;
  vitrineValorMax: string;
  vitrineValorM2: string;
  vitrinePlantas: string[];
  vitrineTipologias: TipologiaFormRow[];
  vitrineTiposUnidade: string[];
  vitrineLatitude: string;
  vitrineLongitude: string;
  vitrineAtualizadoEm: string;
};

function emptyEmpreendimentoForm(): EmpreendimentoForm {
  return {
    nome: "",
    construtoraId: "",
    novaConstrutora: false,
    construtoraNome: "",
    localidadeId: "",
    novaLocalidade: false,
    localidadeNome: "",
    endereco: "",
    cor: "",
    tipo: "",
    status: "",
    tags: [],
    previsaoEntrega: "",
    areaM2: "",
    quartos: "",
    vagas: "",
    valorReferencia: "",
    rendaAPartirDe: "",
    observacao: "",
    vitrineHeadline: "",
    vitrineDescricao: "",
    vitrineDiferenciais: "",
    vitrineLazer: "",
    vitrineLazerItems: [],
    vitrineInfra: [],
    vitrineDetalhes: [],
    vitrineNumero: "",
    vitrineBairro: "",
    vitrineEstado: "",
    vitrineCep: "",
    vitrineWebsite: "",
    vitrineTour: "",
    vitrineLancamento: "",
    vitrineUnidades: "",
    vitrineAndares: "",
    vitrineNomeCondominio: "",
    vitrineSuites: "",
    vitrineAreaMax: "",
    vitrineValorMax: "",
    vitrineValorM2: "",
    vitrinePlantas: [],
    vitrineTipologias: [emptyTipologia()],
    vitrineTiposUnidade: [],
    vitrineLatitude: "",
    vitrineLongitude: "",
    vitrineAtualizadoEm: "",
  };
}

function formFromEmpreendimento(item: Empreendimento): EmpreendimentoForm {
  return {
    nome: item.nome,
    construtoraId: item.construtoraId ?? "",
    novaConstrutora: false,
    construtoraNome: "",
    localidadeId: item.localidadeId ?? "",
    novaLocalidade: false,
    localidadeNome: "",
    endereco: item.endereco ?? "",
    cor: item.cor ?? "",
    tipo: item.tipo ?? "",
    status: item.status ?? "",
    tags: item.tags ?? [],
    previsaoEntrega: item.previsaoEntrega
      ? item.previsaoEntrega.length >= 10
        ? item.previsaoEntrega.slice(0, 10)
        : `${item.previsaoEntrega.slice(0, 7)}-01`
      : "",
    areaM2: item.areaM2 != null ? String(item.areaM2) : "",
    quartos: item.quartos != null ? String(item.quartos) : "",
    vagas: item.vagas != null ? String(item.vagas) : "",
    valorReferencia:
      item.valorReferencia != null
        ? formatMoneyInput(item.valorReferencia)
        : "",
    rendaAPartirDe:
      item.rendaAPartirDe != null
        ? formatMoneyInput(item.rendaAPartirDe)
        : "",
    observacao: item.observacao ?? "",
    vitrineHeadline: item.vitrine?.headline ?? "",
    vitrineDescricao: item.vitrine?.descricao ?? "",
    vitrineDiferenciais: (item.vitrine?.diferenciais ?? []).join("\n"),
    vitrineLazer: (item.vitrine?.lazer ?? []).join("\n"),
    vitrineLazerItems: item.vitrine?.lazer ?? [],
    vitrineInfra: item.vitrine?.infraestrutura ?? [],
    vitrineDetalhes:
      item.vitrine?.detalhesUnidade?.length
        ? item.vitrine.detalhesUnidade
        : (item.vitrine?.diferenciais ?? []),
    vitrineNumero: item.vitrine?.numero ?? "",
    vitrineBairro: item.vitrine?.bairro ?? "",
    vitrineEstado: item.vitrine?.estado ?? "",
    vitrineCep: item.vitrine?.cep ?? "",
    vitrineWebsite: item.vitrine?.website ?? "",
    vitrineTour: item.vitrine?.tourVirtual ?? "",
    vitrineLancamento: item.vitrine?.lancamento?.slice(0, 10) ?? "",
    vitrineUnidades:
      item.vitrine?.unidades != null ? String(item.vitrine.unidades) : "",
    vitrineAndares:
      item.vitrine?.andares != null ? String(item.vitrine.andares) : "",
    vitrineNomeCondominio: item.vitrine?.nomeCondominio ?? "",
    vitrineSuites:
      item.vitrine?.suites != null ? String(item.vitrine.suites) : "",
    vitrineAreaMax:
      item.vitrine?.areaMax != null ? String(item.vitrine.areaMax) : "",
    vitrineValorMax:
      item.vitrine?.valorMax != null
        ? formatMoneyInput(item.vitrine.valorMax)
        : "",
    vitrineValorM2:
      item.vitrine?.valorM2 != null ? String(Math.round(item.vitrine.valorM2)) : "",
    vitrinePlantas: item.vitrine?.plantas ?? [],
    vitrineTipologias: (() => {
      const rows = tipologiasVisiveis(item).map(tipologiaFromApi);
      return rows.length ? rows : [emptyTipologia()];
    })(),
    vitrineTiposUnidade: item.vitrine?.tiposUnidade ?? [],
    vitrineLatitude:
      item.vitrine?.latitude != null ? String(item.vitrine.latitude) : "",
    vitrineLongitude:
      item.vitrine?.longitude != null ? String(item.vitrine.longitude) : "",
    vitrineAtualizadoEm: item.vitrine?.atualizadoEm ?? "",
  };
}

function parseAreaM2(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return "";
  if (iso.length >= 10) {
    const [year, month, day] = iso.slice(0, 10).split("-");
    if (year && month && day) return `${day}/${month}/${year}`;
  }
  const [year, month] = iso.slice(0, 7).split("-");
  if (!year || !month) return iso;
  return `${month}/${year}`;
}

export function ImoveisPage({
  embedded = false,
  proprietarioId,
  openMatchesId,
}: {
  embedded?: boolean;
  proprietarioId?: string;
  openMatchesId?: string;
} = {}) {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const isAnalista = user?.role === "analista";
  const isTreinee = user?.role === "treinee";
  const canManage =
    isAdmin || user?.role === "gerente" || isAnalista || isTreinee;
  const canCreate = canManage;
  const canDelete = isAdmin || isAnalista || isTreinee;
  const canOpenFunil = Boolean(
    user &&
      canAccessRoute(
        user.role,
        "/funil",
        user.tenant?.modules ?? null,
        user.tenant?.plano,
        user.permissions,
      ),
  );
  const canCreateCatalog = canManage;
  const { catalog, addItem, updateItem, removeItem, colorByLabel } =
    useCatalog();
  const tipoOptions = catalog.empreendimento_tipo;
  const statusOptions = catalog.empreendimento_status;
  const tagOptions = catalog.empreendimento_tag;

  const [items, setItems] = useState<Empreendimento[]>([]);
  const [captacaoImoveis, setCaptacaoImoveis] = useState<Imovel[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [localidade, setLocalidade] = useState("");
  const [quartos, setQuartos] = useState("");
  const [construtoraId, setConstrutoraId] = useState("");
  const [rendaMinima, setRendaMinima] = useState("");
  const [rendaMaxima, setRendaMaxima] = useState("");
  const [somenteLitoral, setSomenteLitoral] = useState(false);
  const [vista, setVista] = useImoveisVista();
  const [kindPickOpen, setKindPickOpen] = useState(false);
  const [unidadeCreateTick, setUnidadeCreateTick] = useState(0);
  const [unidadeEditRequest, setUnidadeEditRequest] = useState<{
    id: string;
    tick: number;
  } | null>(null);
  const [unidadeDeleteRequest, setUnidadeDeleteRequest] = useState<{
    id: string;
    tick: number;
  } | null>(null);
  const { show: showCampo } = useImoveisCamposVisiveis();
  const [catalogoLocalidades, setCatalogoLocalidades] = useState<Localidade[]>(
    [],
  );
  const [quickOpen, setQuickOpen] = useState(false);
  const [formTab, setFormTab] = useState<EmpreendimentoFormTab>("identidade");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpreendimentoForm>(emptyEmpreendimentoForm);
  const [quickImages, setQuickImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickCatalogOpen, setQuickCatalogOpen] =
    useState<EmpCatalogType | null>(null);
  const [quickCatalogLabel, setQuickCatalogLabel] = useState("");
  const [quickCatalogSaving, setQuickCatalogSaving] = useState(false);
  const [quickCatalogEditing, setQuickCatalogEditing] =
    useState<CatalogItem | null>(null);
  const [catalogDeleteTarget, setCatalogDeleteTarget] =
    useState<CatalogItem | null>(null);
  const [catalogDeleting, setCatalogDeleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesTitle, setMatchesTitle] = useState("");
  const [matchesItem, setMatchesItem] = useState<Empreendimento | null>(null);
  const [matchesResult, setMatchesResult] =
    useState<EmpreendimentoMatchesResult | null>(null);
  const [matchesFilter, setMatchesFilter] = useState<
    "todos" | "muito" | "interesse"
  >("todos");
  const [matchAlerts, setMatchAlerts] = useState<
    { id: string; empreendimentoId: string | null; titulo: string; corpo: string }[]
  >([]);
  const openedMatchRef = useRef("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfOrdem, setPdfOrdem] = useState<PdfOrdemImoveis>("alfabetica");
  const [pdfConstrutoraId, setPdfConstrutoraId] = useState("");
  const [pdfLocalidade, setPdfLocalidade] = useState("");

  async function openMatches(item: Empreendimento) {
    setMatchesTitle(item.nome);
    setMatchesItem(item);
    setMatchesFilter("todos");
    setMatchesOpen(true);
    setMatchesLoading(true);
    setMatchesResult(null);
    try {
      const result = await fetchEmpreendimentoMatches(item.id);
      setMatchesResult(result);
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                matchTotal: result.total,
                matchMuitoCompativeis: result.muitoCompativeis,
                matchInteressePrevio: result.comInteressePrevio,
              }
            : row,
        ),
      );
      setMatchAlerts((prev) =>
        prev.filter((alert) => alert.empreendimentoId !== item.id),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os matches.",
      );
      setMatchesOpen(false);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    if (!openMatchesId || items.length === 0) return;
    if (openedMatchRef.current === openMatchesId) return;
    const item = items.find((row) => row.id === openMatchesId);
    if (!item) return;
    openedMatchRef.current = openMatchesId;
    void openMatches(item);
  }, [openMatchesId, items]);

  useEffect(() => {
    if (embedded) return;
    void fetchNotificacoes()
      .then((list) =>
        setMatchAlerts(
          list
            .filter((n) => n.tipo === "imovel_compativel" && !n.lida)
            .map((n) => ({
              id: n.id,
              empreendimentoId: n.empreendimentoId,
              titulo: n.titulo,
              corpo: n.corpo,
            })),
        ),
      )
      .catch(() => setMatchAlerts([]));
  }, [embedded]);

  const loadCaptacaoImoveis = useCallback(async () => {
    if (embedded) {
      setCaptacaoImoveis([]);
      return;
    }
    try {
      setCaptacaoImoveis(
        await fetchCaptacaoImoveis(
          proprietarioId ? { proprietarioId } : undefined,
        ),
      );
    } catch {
      setCaptacaoImoveis([]);
    }
  }, [embedded, proprietarioId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [lancamentos] = await Promise.all([
        fetchEmpreendimentos({ ativo: true }),
        loadCaptacaoImoveis(),
      ]);
      setItems(lancamentos);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os imóveis.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadCaptacaoImoveis]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function setField<K extends keyof EmpreendimentoForm>(
    key: K,
    value: EmpreendimentoForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadCatalogos() {
    try {
      const [listaConstrutoras, listaLocalidades] = await Promise.all([
        fetchConstrutoras(),
        fetchLocalidades(),
      ]);
      setConstrutoras(listaConstrutoras);
      setCatalogoLocalidades(listaLocalidades);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar construtoras e localidades.",
      );
    }
  }

  async function openQuickCreate() {
    setKindPickOpen(false);
    setEditingId(null);
    setForm(emptyEmpreendimentoForm());
    setFormTab("identidade");
    resetImageState();
    setQuickOpen(true);
    await loadCatalogos();
  }

  function openUnidadeCreate() {
    setKindPickOpen(false);
    setUnidadeCreateTick((n) => n + 1);
  }

  async function openEdit(item: Empreendimento) {
    if (!canManage) return;
    setEditingId(item.id);
    setForm(formFromEmpreendimento(item));
    setFormTab("identidade");
    resetImageState(empreendimentoImagens(item));
    setQuickOpen(true);
    await loadCatalogos();
  }

  function clearPendingImages() {
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPendingPreviews([]);
  }

  function resetImageState(images: string[] = []) {
    clearPendingImages();
    setQuickImages(images);
    setImageBusy(false);
  }

  async function handleQuickSave() {
    if (form.nome.trim().length < 2) {
      setFormTab("identidade");
      toast.error("Informe o nome do empreendimento.");
      return;
    }

    let construtoraId = form.construtoraId;
    if (form.novaConstrutora) {
      if (form.construtoraNome.trim().length < 2) {
        setFormTab("identidade");
        toast.error("Informe o nome da nova construtora.");
        return;
      }
    } else if (!construtoraId) {
      setFormTab("identidade");
      toast.error("Selecione a construtora ou crie uma nova.");
      return;
    }

    let localidadeId = form.localidadeId || null;
    if (form.novaLocalidade) {
      if (form.localidadeNome.trim().length < 2) {
        toast.error("Informe o nome da nova localidade.");
        setFormTab("localidade");
        return;
      }
    }

    setQuickSaving(true);
    try {
      if (form.novaConstrutora) {
        const criada = await createConstrutora({
          nome: form.construtoraNome.trim(),
        });
        construtoraId = criada.id;
        setConstrutoras((prev) =>
          [...prev, criada].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
      }

      if (form.novaLocalidade) {
        const criada = await createLocalidade(form.localidadeNome.trim());
        localidadeId = criada.id;
        setCatalogoLocalidades((prev) =>
          [...prev, criada].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
      }

      const tipologias = form.vitrineTipologias
        .filter(
          (row) =>
            row.nome.trim() ||
            row.areaM2 != null ||
            row.quartos != null ||
            row.valor.trim(),
        )
        .map(tipologiaToApi);
      const areas = tipologias
        .map((row) => row.areaM2)
        .filter((value): value is number => value != null);
      const areaM2 =
        areas.length > 0 ? Math.min(...areas) : parseAreaM2(form.areaM2);
      const quartos =
        tipologias.find((row) => row.quartos != null)?.quartos ??
        (form.quartos.trim() ? Number.parseInt(form.quartos, 10) : null);
      const vagas =
        tipologias.find((row) => row.vagas != null)?.vagas ??
        (form.vagas.trim() ? Number.parseInt(form.vagas, 10) : null);
      const valorParsed = parseOptionalMoneyInput(form.valorReferencia);
      const valorReferencia =
        valorParsed != null ? Math.round(valorParsed) : null;
      const rendaParsed = parseOptionalMoneyInput(form.rendaAPartirDe);
      const rendaAPartirDe =
        rendaParsed != null ? Math.round(rendaParsed) : null;
      const payload = {
        nome: form.nome.trim(),
        construtoraId,
        cor: form.cor.trim() || null,
        localidadeId,
        endereco: form.endereco.trim() || null,
        tipo: form.tipo || null,
        status: form.status || null,
        previsaoEntrega: form.previsaoEntrega || null,
        tags: form.tags,
        observacao: form.observacao.trim() || null,
        areaM2,
        quartos: Number.isFinite(quartos) ? quartos : null,
        vagas: Number.isFinite(vagas) ? vagas : null,
        valorReferencia,
        rendaAPartirDe,
        vitrine: {
          headline: form.vitrineHeadline.trim() || null,
          descricao: form.vitrineDescricao.trim() || null,
          diferenciais: form.vitrineDetalhes,
          lazer: form.vitrineLazerItems,
          infraestrutura: form.vitrineInfra,
          detalhesUnidade: form.vitrineDetalhes,
          numero: form.vitrineNumero.trim() || null,
          bairro: form.vitrineBairro.trim() || null,
          estado: form.vitrineEstado.trim() || null,
          cep: form.vitrineCep.trim() || null,
          website: form.vitrineWebsite.trim() || null,
          tourVirtual: form.vitrineTour.trim() || null,
          lancamento: form.vitrineLancamento.trim() || null,
          unidades: form.vitrineUnidades.trim()
            ? Number.parseInt(form.vitrineUnidades, 10)
            : null,
          andares: form.vitrineAndares.trim()
            ? Number.parseInt(form.vitrineAndares, 10)
            : null,
          nomeCondominio: form.vitrineNomeCondominio.trim() || null,
          suites:
            tipologias.find((row) => row.suites != null)?.suites ??
            (form.vitrineSuites.trim()
              ? Number.parseInt(form.vitrineSuites, 10)
              : null),
          areaMax: areas.length > 0 ? Math.max(...areas) : parseAreaM2(form.vitrineAreaMax),
          valorMax: (() => {
            const parsed = parseOptionalMoneyInput(form.vitrineValorMax);
            return parsed != null ? Math.round(parsed) : null;
          })(),
          valorM2: parseAreaM2(form.vitrineValorM2),
          latitude: parseAreaM2(form.vitrineLatitude),
          longitude: parseAreaM2(form.vitrineLongitude),
          atualizadoEm: form.vitrineAtualizadoEm.trim() || null,
          plantas: form.vitrinePlantas,
          tipologias,
          tiposUnidade: [
            ...new Set(tipologias.map((row) => row.nome.trim()).filter(Boolean)),
          ],
        },
      };

      if (editingId) {
        await updateEmpreendimento(editingId, payload);
        toast.success("Empreendimento atualizado.");
      } else {
        const created = await createEmpreendimento({
          nome: payload.nome,
          construtoraId: payload.construtoraId,
          ...(payload.cor ? { cor: payload.cor } : {}),
          ...(payload.localidadeId ? { localidadeId: payload.localidadeId } : {}),
          ...(payload.endereco ? { endereco: payload.endereco } : {}),
          ...(payload.tipo ? { tipo: payload.tipo } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.previsaoEntrega
            ? { previsaoEntrega: payload.previsaoEntrega }
            : {}),
          tags: payload.tags,
          ...(payload.observacao ? { observacao: payload.observacao } : {}),
          ...(payload.areaM2 != null ? { areaM2: payload.areaM2 } : {}),
          ...(payload.quartos != null ? { quartos: payload.quartos } : {}),
          ...(payload.vagas != null ? { vagas: payload.vagas } : {}),
          ...(payload.valorReferencia != null
            ? { valorReferencia: payload.valorReferencia }
            : {}),
          ...(payload.rendaAPartirDe != null
            ? { rendaAPartirDe: payload.rendaAPartirDe }
            : {}),
          vitrine: payload.vitrine,
        });
        try {
          for (const file of pendingFiles) {
            await uploadEmpreendimentoImagem(created.id, file);
          }
        } catch (uploadErr) {
          toast.error(
            uploadErr instanceof ApiError
              ? uploadErr.message
              : "Empreendimento cadastrado, mas a foto não foi enviada.",
          );
          setQuickOpen(false);
          setEditingId(null);
          resetImageState();
          await loadItems();
          return;
        }
        toast.success(
          form.novaConstrutora
            ? "Construtora e empreendimento cadastrados."
            : "Empreendimento cadastrado.",
        );
      }
      setQuickOpen(false);
      setEditingId(null);
      resetImageState();
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : editingId
            ? "Não foi possível atualizar."
            : "Não foi possível cadastrar.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  function applyCatalogLabel(
    type: EmpCatalogType,
    label: string,
    previous?: string,
  ) {
    if (type === "empreendimento_tipo") {
      setForm((prev) => ({
        ...prev,
        tipo: previous
          ? prev.tipo === previous
            ? label
            : prev.tipo
          : label,
      }));
      return;
    }
    if (type === "empreendimento_status") {
      setForm((prev) => ({
        ...prev,
        status: previous
          ? prev.status === previous
            ? label
            : prev.status
          : label,
      }));
      return;
    }
    setForm((prev) => {
      if (previous) {
        return {
          ...prev,
          tags: prev.tags.map((tag) => (tag === previous ? label : tag)),
        };
      }
      const exists = prev.tags.some(
        (tag) =>
          tag.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"),
      );
      return exists ? prev : { ...prev, tags: [...prev.tags, label] };
    });
  }

  function clearCatalogLabel(type: EmpCatalogType, label: string) {
    if (type === "empreendimento_tipo") {
      setForm((prev) =>
        prev.tipo === label ? { ...prev, tipo: "" } : prev,
      );
      return;
    }
    if (type === "empreendimento_status") {
      setForm((prev) =>
        prev.status === label ? { ...prev, status: "" } : prev,
      );
      return;
    }
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== label),
    }));
  }

  async function saveQuickCatalog() {
    if (!quickCatalogOpen) return;
    const label = quickCatalogLabel.trim();
    if (!label) {
      toast.error("Informe um nome.");
      return;
    }
    setQuickCatalogSaving(true);
    try {
      if (quickCatalogEditing) {
        if (label !== quickCatalogEditing.label) {
          await updateItem(quickCatalogEditing.id, { label });
          applyCatalogLabel(
            quickCatalogOpen,
            label,
            quickCatalogEditing.label,
          );
          await loadItems();
        }
        toast.success(`"${label}" atualizado.`);
      } else {
        const count =
          quickCatalogOpen === "empreendimento_tipo"
            ? tipoOptions.length
            : quickCatalogOpen === "empreendimento_status"
              ? statusOptions.length
              : tagOptions.length;
        await addItem({
          type: quickCatalogOpen,
          label,
          color: nextCatalogColor(count),
        });
        applyCatalogLabel(quickCatalogOpen, label);
        toast.success(`"${label}" adicionado.`);
      }
      setQuickCatalogOpen(null);
      setQuickCatalogEditing(null);
      setQuickCatalogLabel("");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : quickCatalogEditing
            ? "Não foi possível atualizar."
            : "Não foi possível adicionar.",
      );
    } finally {
      setQuickCatalogSaving(false);
    }
  }

  function openQuickCatalog(type: EmpCatalogType) {
    setQuickCatalogEditing(null);
    setQuickCatalogLabel("");
    setQuickCatalogOpen(type);
  }

  function openEditCatalog(item: CatalogItem) {
    setQuickCatalogEditing(item);
    setQuickCatalogLabel(item.label);
    setQuickCatalogOpen(item.type as EmpCatalogType);
  }

  async function confirmDeleteCatalog() {
    if (!catalogDeleteTarget) return;
    const item = catalogDeleteTarget;
    setCatalogDeleting(true);
    try {
      await removeItem(item.id);
      clearCatalogLabel(item.type as EmpCatalogType, item.label);
      setCatalogDeleteTarget(null);
      await loadItems();
      toast.success(`"${item.label}" excluído da lista.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir.",
      );
    } finally {
      setCatalogDeleting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || !canDelete) return;
    setDeleting(true);
    try {
      await deleteEmpreendimento(deleteId);
      setDeleteId(null);
      await loadItems();
      toast.success("Empreendimento excluído.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddImages(files: File[]) {
    const valid: File[] = [];
    for (const file of files) {
      const error = assertImageFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      valid.push(file);
    }
    const remaining =
      EMPREENDIMENTO_MAX_IMAGES - quickImages.length - pendingFiles.length;
    const picked = valid.slice(0, Math.max(0, remaining));
    if (picked.length === 0) {
      toast.error(
        `Cada empreendimento pode ter no máximo ${EMPREENDIMENTO_MAX_IMAGES} imagens.`,
      );
      return;
    }

    if (editingId) {
      setImageBusy(true);
      try {
        let current: Empreendimento | null = null;
        for (const file of picked) {
          current = await uploadEmpreendimentoImagem(editingId, file);
        }
        if (current) {
          setQuickImages(empreendimentoImagens(current));
          setItems((prev) =>
            prev.map((item) => (item.id === current!.id ? current! : item)),
          );
        }
        toast.success(
          picked.length > 1 ? "Imagens enviadas." : "Imagem enviada.",
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível enviar a imagem.",
        );
      } finally {
        setImageBusy(false);
      }
      return;
    }

    setPendingFiles((prev) => [...prev, ...picked]);
    setPendingPreviews((prev) => [
      ...prev,
      ...picked.map((file) => URL.createObjectURL(file)),
    ]);
  }

  async function handleRemoveImage(index: number) {
    if (index < quickImages.length) {
      if (!editingId) return;
      setImageBusy(true);
      try {
        const current = await deleteEmpreendimentoImagem(editingId, index);
        setQuickImages(empreendimentoImagens(current));
        setItems((prev) =>
          prev.map((item) => (item.id === current.id ? current : item)),
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível remover a imagem.",
        );
      } finally {
        setImageBusy(false);
      }
      return;
    }
    const pendingIndex = index - quickImages.length;
    setPendingPreviews((prev) => {
      const url = prev[pendingIndex];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== pendingIndex);
    });
    setPendingFiles((prev) => prev.filter((_, i) => i !== pendingIndex));
  }

  const localidades = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => empreendimentoLocalidadeNome(item))
            .filter((nome): nome is string => Boolean(nome)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items],
  );
  const opcoesQuartos = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.quartos ?? []))].sort(
        (a, b) => a - b,
      ),
    [items],
  );
  const opcoesConstrutoras = useMemo(
    () =>
      Array.from(
        new Map(
          items.flatMap((item) =>
            item.construtora
              ? [[item.construtora.id, item.construtora.nome] as const]
              : [],
          ),
        ),
      )
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [items],
  );
  const rendaMinFiltro = useMemo(() => {
    const minimo = parseOptionalMoneyInput(rendaMinima);
    return minimo != null && minimo > 0 ? minimo : null;
  }, [rendaMinima]);
  const rendaMaxFiltro = useMemo(() => {
    const maximo = parseOptionalMoneyInput(rendaMaxima);
    return maximo != null && maximo > 0 ? maximo : null;
  }, [rendaMaxima]);

  const hasActiveFilters = Boolean(
    localidade ||
      quartos ||
      construtoraId ||
      rendaMinFiltro != null ||
      rendaMaxFiltro != null ||
      somenteLitoral,
  );

  function clearFilters() {
    setSearch("");
    setLocalidade("");
    setQuartos("");
    setConstrutoraId("");
    setRendaMinima("");
    setRendaMaxima("");
    setSomenteLitoral(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const searchable = [
        item.nome,
        empreendimentoLocalidadeNome(item),
        item.endereco ?? "",
        item.construtora?.nome ?? "",
        item.observacao ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return (
        (!q || searchable.includes(q)) &&
        (!localidade || empreendimentoLocalidadeNome(item) === localidade) &&
        (!quartos || item.quartos === Number(quartos)) &&
        (!construtoraId || item.construtoraId === construtoraId) &&
        (rendaMinFiltro == null && rendaMaxFiltro == null
          ? true
          : item.rendaAPartirDe != null &&
            (rendaMinFiltro == null || item.rendaAPartirDe >= rendaMinFiltro) &&
            (rendaMaxFiltro == null || item.rendaAPartirDe <= rendaMaxFiltro)) &&
        (!somenteLitoral || empreendimentoHasLitoral(item))
      );
    });
  }, [
    items,
    search,
    localidade,
    quartos,
    construtoraId,
    rendaMinFiltro,
    rendaMaxFiltro,
    somenteLitoral,
  ]);

  const pdfOpcoesConstrutoras = useMemo(
    () =>
      Array.from(
        new Map(
          filtered.flatMap((item) =>
            item.construtora
              ? [[item.construtora.id, item.construtora.nome] as const]
              : [],
          ),
        ),
      )
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [filtered],
  );
  const pdfOpcoesLocalidades = useMemo(
    () =>
      [
        ...new Set(
          filtered
            .map((item) => empreendimentoLocalidadeNome(item))
            .filter((nome): nome is string => Boolean(nome)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [filtered],
  );

  const sorted = useMemo(
    () =>
      sortByTableOrder(
        filtered,
        sort,
        (item) => item.nome,
        (item) => item.createdAt,
      ),
    [filtered, sort],
  );
  const imoveisPager = useTablePager(sorted, sort);

  const kpiImoveis = useMemo(
    () => ({
      total: items.length + captacaoImoveis.length,
      empreendimentos: items.length,
      litoral: items.filter((item) => empreendimentoHasLitoral(item)).length,
      matches: items.filter((item) => (item.matchTotal ?? 0) > 0).length,
    }),
    [captacaoImoveis.length, items],
  );

  const captacaoFiltered = useMemo(() => {
    if (embedded) return [];
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return captacaoImoveis.filter((item) => {
      if (proprietarioId && item.proprietarioId !== proprietarioId) return false;
      if (quartos && item.quartos !== Number(quartos)) return false;
      if (!q) return true;
      const hay = [
        item.titulo,
        item.cidade,
        item.bairro,
        item.logradouro,
        item.proprietario?.nome,
        CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return hay.includes(q);
    });
  }, [embedded, captacaoImoveis, proprietarioId, quartos, search]);

  const catalogEmpty = sorted.length === 0 && captacaoFiltered.length === 0;

  function openPdfDialog() {
    if (sorted.length === 0) {
      toast.error("Nenhum empreendimento para gerar o PDF.");
      return;
    }
    setPdfOrdem("alfabetica");
    setPdfConstrutoraId("");
    setPdfLocalidade("");
    setPdfOpen(true);
  }

  function confirmarGerarPdf() {
    const pdfItems = filtered.filter((item) => {
      if (pdfConstrutoraId && item.construtoraId !== pdfConstrutoraId) {
        return false;
      }
      if (
        pdfLocalidade &&
        empreendimentoLocalidadeNome(item) !== pdfLocalidade
      ) {
        return false;
      }
      return true;
    });
    if (pdfItems.length === 0) {
      toast.error("Nenhum empreendimento para gerar o PDF.");
      return;
    }
    const paginaConstrutora = opcoesConstrutoras.find(
      (item) => item.id === construtoraId,
    )?.nome;
    const pdfConstrutoraNome = pdfOpcoesConstrutoras.find(
      (item) => item.id === pdfConstrutoraId,
    )?.nome;
    const localidadePdf = pdfLocalidade || localidade;
    const construtoraPdf = pdfConstrutoraNome || paginaConstrutora;
    const filtros = [
      search.trim() ? `Busca: ${search.trim()}` : "",
      localidadePdf ? `Localidade: ${localidadePdf}` : "",
      quartos ? `${quartos} quarto${quartos === "1" ? "" : "s"}` : "",
      construtoraPdf ? `Construtora: ${construtoraPdf}` : "",
      rendaMinFiltro != null ? `Renda mínima ${rendaMinima}` : "",
      rendaMaxFiltro != null ? `Renda máxima ${rendaMaxima}` : "",
      somenteLitoral ? "Somente litoral" : "",
    ].filter(Boolean);
    exportEmpreendimentosToPdf(pdfItems, {
      imobiliariaNome: user?.tenant?.name?.trim() || "Imobiliária",
      filtros,
      ordem: pdfOrdem,
    });
    setPdfOpen(false);
  }

  const gerarPdfButton = (
    <Button
      type="button"
      variant="outline"
      className={SOFT_BTN}
      disabled={sorted.length === 0}
      onClick={openPdfDialog}
    >
      <FileText className="w-4 h-4 mr-1" />
      Gerar PDF
    </Button>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Cadastro de imóveis</h2>
            <p className="text-sm text-muted-foreground">
              Lançamentos desta imobiliária.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {gerarPdfButton}
            {canCreate ? (
              <Button
                onClick={() =>
                  embedded ? void openQuickCreate() : setKindPickOpen(true)
                }
                className={IMOVEIS_GRADIENT_BTN}
                style={IMOVEIS_GRADIENT_STYLE}
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <PageHeader
          title="Imóveis"
          description="Cadastre lançamentos e unidades de captação/usados."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {gerarPdfButton}
              {canCreate ? (
                <Button
                  onClick={() => setKindPickOpen(true)}
                  className={IMOVEIS_GRADIENT_BTN}
                  style={IMOVEIS_GRADIENT_STYLE}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo imóvel
                </Button>
              ) : null}
            </div>
          }
        />
      )}

      {!embedded && matchAlerts.length > 0 ? (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/8 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {matchAlerts.length === 1
                  ? "Há clientes compatíveis com um imóvel novo"
                  : `${matchAlerts.length} imóveis com clientes compatíveis`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {matchAlerts[0]?.corpo ??
                  "Abra a lista para falar com os clientes mais compatíveis."}
              </p>
            </div>
            {matchAlerts[0]?.empreendimentoId ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const id = matchAlerts[0]?.empreendimentoId;
                  const item = items.find((row) => row.id === id);
                  if (item) void openMatches(item);
                }}
              >
                Ver clientes agora
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!embedded ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FinanceKpiCard
            label="No catálogo"
            value={kpiImoveis.total}
            icon={Home}
            tone="blue"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Empreendimentos"
            value={kpiImoveis.empreendimentos}
            icon={Building2}
            tone="teal"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Litoral"
            value={kpiImoveis.litoral}
            icon={MapPin}
            tone="violet"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Com clientes"
            value={kpiImoveis.matches}
            icon={Users}
            tone="orange"
            format="number"
            variant="dash"
          />
        </div>
      ) : null}

      <div className={FILTER_BAR_STACK}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Label htmlFor="buscar-imovel" className={FILTER_LABEL}>
              Buscar
            </Label>
            <div className="relative">
              <Search className={FILTER_SEARCH_ICON} />
              <Input
                id="buscar-imovel"
                placeholder="Nome ou endereço…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn("pl-9", FILTER_CONTROL)}
              />
            </div>
          </div>
          <div>
            <Label className={FILTER_LABEL}>Exibir</Label>
            <div className={FILTER_VISTA_WRAP}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  FILTER_VISTA_BTN,
                  vista === "cards" && FILTER_VISTA_BTN_ACTIVE,
                )}
                title="Ver cards"
                onClick={() => setVista("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="ml-1.5">Cards</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  FILTER_VISTA_BTN,
                  vista === "tabela" && FILTER_VISTA_BTN_ACTIVE,
                )}
                title="Ver tabela"
                onClick={() => setVista("tabela")}
              >
                <LayoutList className="h-4 w-4" />
                <span className="ml-1.5">Tabela</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          <div>
            <Label className={FILTER_LABEL}>Ordenar</Label>
            <TableSortSelect
              value={sort}
              onChange={setSort}
              className={cn("w-full", FILTER_CONTROL)}
            />
          </div>
          <div>
            <Label className={FILTER_LABEL}>Localidade</Label>
            <Select
              value={localidade || "__all__"}
              onValueChange={(value) =>
                setLocalidade(value === "__all__" ? "" : value)
              }
            >
              <SelectTrigger className={FILTER_CONTROL}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {localidades.map((cidade) => (
                  <SelectItem key={cidade} value={cidade}>
                    {cidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={FILTER_LABEL}>
              Quartos
            </Label>
            <Select
              value={quartos || "__all__"}
              onValueChange={(value) =>
                setQuartos(value === "__all__" ? "" : value)
              }
            >
              <SelectTrigger className={FILTER_CONTROL}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {opcoesQuartos.map((quantidade) => (
                  <SelectItem key={quantidade} value={String(quantidade)}>
                    {quantidade} quarto{quantidade === 1 ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={FILTER_LABEL}>
              Construtora
            </Label>
            <Select
              value={construtoraId || "__all__"}
              onValueChange={(value) =>
                setConstrutoraId(value === "__all__" ? "" : value)
              }
            >
              <SelectTrigger className={FILTER_CONTROL}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {opcoesConstrutoras.map((construtora) => (
                  <SelectItem key={construtora.id} value={construtora.id}>
                    {construtora.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filtro-renda-min" className={FILTER_LABEL}>
              Renda mínima
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary/70">
                R$
              </span>
              <Input
                id="filtro-renda-min"
                inputMode="numeric"
                value={rendaMinima}
                onChange={(event) =>
                  setRendaMinima(maskMoneyInput(event.target.value))
                }
                placeholder="Ex.: 3.000,00"
                className={cn("pl-9", FILTER_CONTROL)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="filtro-renda-max" className={FILTER_LABEL}>
              Renda máxima
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary/70">
                R$
              </span>
              <Input
                id="filtro-renda-max"
                inputMode="numeric"
                value={rendaMaxima}
                onChange={(event) =>
                  setRendaMaxima(maskMoneyInput(event.target.value))
                }
                placeholder="Ex.: 20.000,00"
                className={cn("pl-9", FILTER_CONTROL)}
              />
            </div>
          </div>
          <div>
            <Label className={FILTER_LABEL}>
              Destaque
            </Label>
            <div className="flex h-9 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-9 flex-1",
                  somenteLitoral ? SOFT_BTN_ACTIVE : SOFT_BTN,
                )}
                onClick={() => setSomenteLitoral((current) => !current)}
              >
                Litoral
              </Button>
              {(hasActiveFilters || search) && (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn("h-9 px-3", FILTER_CLEAR_BTN)}
                  onClick={clearFilters}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!embedded ? (
        <h2 className="mb-3 mt-2 text-base font-semibold">Catálogo</h2>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando…
        </div>
      ) : catalogEmpty ? (
        <Card className={TABLE_SHELL}>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Building2 className="w-8 h-8 opacity-40" />
            <p className="text-center max-w-sm">
              {items.length === 0 && captacaoImoveis.length === 0
                ? canCreate
                  ? "Nenhum imóvel no catálogo. Use “Novo imóvel” para começar."
                  : "Nenhum imóvel no catálogo ainda."
                : hasActiveFilters
                  ? "Nenhum imóvel encontrado para os filtros selecionados."
                  : "Nenhum resultado para a busca."}
            </p>
            {items.length === 0 && captacaoImoveis.length === 0 && canCreate && (
              <Button
                className={`mt-2 ${IMOVEIS_GRADIENT_BTN}`}
                style={IMOVEIS_GRADIENT_STYLE}
                onClick={() =>
                  embedded ? void openQuickCreate() : setKindPickOpen(true)
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : vista === "tabela" ? (
        <Card className={TABLE_SHELL}>
          <Table className={TABLE_LUX}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <ImoveisTableHead>Empreendimento</ImoveisTableHead>
                {showCampo("construtora") ? (
                  <ImoveisTableHead>Construtora</ImoveisTableHead>
                ) : null}
                {showCampo("localidade") ? (
                  <ImoveisTableHead>Localidade</ImoveisTableHead>
                ) : null}
                {showCampo("tipo") ||
                showCampo("status") ||
                showCampo("tags") ? (
                  <ImoveisTableHead>
                    {showCampo("tipo") || showCampo("status")
                      ? "Status"
                      : "Tags"}
                  </ImoveisTableHead>
                ) : null}
                {showCampo("previsao") ? (
                  <ImoveisTableHead>Previsão</ImoveisTableHead>
                ) : null}
                {showCampo("quartos") ? (
                  <ImoveisTableHead className="text-center">
                    Quartos
                  </ImoveisTableHead>
                ) : null}
                {showCampo("metragem") ? (
                  <ImoveisTableHead>Metragem</ImoveisTableHead>
                ) : null}
                {showCampo("valor") ? (
                  <ImoveisTableHead className="text-right">
                    A partir de
                  </ImoveisTableHead>
                ) : null}
                {showCampo("renda") ? (
                  <ImoveisTableHead className="text-right">
                    Renda a partir de
                  </ImoveisTableHead>
                ) : null}
                <ImoveisTableHead className="w-28 text-right">
                  Ações
                </ImoveisTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imoveisPager.pageItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="group hover:bg-muted/40"
                  >
                    <TableCell>
                      <div className="flex min-w-40 items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className={cn(
                              "text-xs text-white",
                              lostLeadAvatarClass(item.nome),
                            )}
                          >
                            {item.nome
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? "")
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            to="/imoveis/$id"
                            params={{ id: item.id }}
                            className="truncate font-semibold leading-snug tracking-tight hover:underline"
                          >
                            {item.nome}
                          </Link>
                          {showCampo("endereco") && item.endereco ? (
                            <p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground">
                              {item.endereco}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    {showCampo("construtora") ? (
                      <TableCell className="text-sm text-muted-foreground">
                        {item.construtora?.nome ?? "—"}
                      </TableCell>
                    ) : null}
                    {showCampo("localidade") ? (
                      <TableCell className="text-sm text-muted-foreground">
                        {empreendimentoLocalidadeNome(item) || "—"}
                      </TableCell>
                    ) : null}
                    {showCampo("tipo") ||
                    showCampo("status") ||
                    showCampo("tags") ? (
                      <TableCell>
                        <div className="flex max-w-64 flex-wrap gap-1">
                          {showCampo("tipo") && item.tipo ? (
                            <Badge
                              className={cn(
                                STATUS_CHIP_CLASS,
                                IMOVEIS_TABLE_CHIP,
                                colorByLabel("empreendimento_tipo", item.tipo),
                              )}
                            >
                              {empreendimentoTipoLabel(item.tipo)}
                            </Badge>
                          ) : null}
                          {showCampo("status") && item.status ? (
                            <Badge
                              className={cn(
                                STATUS_CHIP_CLASS,
                                IMOVEIS_TABLE_CHIP,
                                colorByLabel(
                                  "empreendimento_status",
                                  item.status,
                                ),
                              )}
                            >
                              {empreendimentoStatusLabel(item.status)}
                            </Badge>
                          ) : null}
                          {showCampo("tags")
                            ? (item.tags ?? []).map((tag) => (
                                <Badge
                                  key={tag}
                                  className={cn(
                                    STATUS_CHIP_CLASS,
                                    IMOVEIS_TABLE_CHIP,
                                    colorByLabel("empreendimento_tag", tag),
                                  )}
                                  title={tag}
                                >
                                  {tag}
                                </Badge>
                              ))
                            : null}
                        </div>
                      </TableCell>
                    ) : null}
                    {showCampo("previsao") ? (
                      <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {item.previsaoEntrega
                          ? formatPrevisao(item.previsaoEntrega)
                          : "—"}
                      </TableCell>
                    ) : null}
                    {showCampo("quartos") ? (
                      <TableCell className="text-center tabular-nums text-sm text-muted-foreground">
                        {item.quartos != null ? item.quartos : "—"}
                      </TableCell>
                    ) : null}
                    {showCampo("metragem") ? (
                      <TableCell className="whitespace-nowrap tabular-nums text-sm text-muted-foreground">
                        {item.areaM2 != null ? `${item.areaM2} m²` : "—"}
                      </TableCell>
                    ) : null}
                    {showCampo("valor") ? (
                      <TableCell className="text-right">
                        {item.valorReferencia != null ? (
                          <span className="inline-flex rounded-full bg-muted/70 px-2 py-0.5 font-semibold tabular-nums tracking-tight">
                            {brl(item.valorReferencia)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    ) : null}
                    {showCampo("renda") ? (
                      <TableCell className="text-right">
                        {item.rendaAPartirDe != null ? (
                          <span className="inline-flex tabular-nums text-sm font-medium">
                            {brl(item.rendaAPartirDe)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <div className="inline-flex rounded-full border border-black/5 bg-muted/40 p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="relative h-7 gap-1 px-1.5 text-primary hover:bg-primary/10 hover:text-primary"
                          title="Clientes compatíveis"
                          onClick={() => void openMatches(item)}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span className="hidden text-[11px] font-semibold sm:inline">
                            {(item.matchTotal ?? 0) > 0
                              ? `${item.matchTotal} clientes`
                              : "Clientes"}
                          </span>
                          {(item.matchTotal ?? 0) > 0 ? (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground sm:hidden">
                              {item.matchTotal}
                            </span>
                          ) : null}
                        </Button>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-primary/10"
                            title="Editar"
                            onClick={() => void openEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive/10"
                            title="Excluir"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
              ))}
              {captacaoFiltered.map((item) => (
                <TableRow
                  key={`cap-${item.id}`}
                  className="group hover:bg-muted/40"
                >
                  <TableCell>
                    <div className="flex min-w-40 items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-xs text-white",
                            lostLeadAvatarClass(item.titulo),
                          )}
                        >
                          {item.titulo
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() ?? "")
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          to="/captacao/imoveis/$id"
                          params={{ id: item.id }}
                          className="truncate font-semibold leading-snug tracking-tight hover:underline"
                        >
                          {item.titulo}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.proprietario?.nome ?? "Captação"}
                          {item.cidade ? ` · ${item.cidade}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  {showCampo("construtora") ? (
                    <TableCell>
                      <Badge className={cn(STATUS_CHIP_CLASS, IMOVEIS_TABLE_CHIP)}>
                        Captação
                      </Badge>
                    </TableCell>
                  ) : null}
                  {showCampo("localidade") ? (
                    <TableCell className="text-sm text-muted-foreground">
                      {item.cidade || "—"}
                    </TableCell>
                  ) : null}
                  {showCampo("tipo") ||
                  showCampo("status") ||
                  showCampo("tags") ? (
                    <TableCell>
                      <Badge
                        className={cn(STATUS_CHIP_CLASS, IMOVEIS_TABLE_CHIP)}
                      >
                        {CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]}
                      </Badge>
                    </TableCell>
                  ) : null}
                  {showCampo("previsao") ? (
                    <TableCell className="text-sm text-muted-foreground">
                      —
                    </TableCell>
                  ) : null}
                  {showCampo("quartos") ? (
                    <TableCell className="text-center tabular-nums text-sm text-muted-foreground">
                      {item.quartos != null ? item.quartos : "—"}
                    </TableCell>
                  ) : null}
                  {showCampo("metragem") ? (
                    <TableCell className="whitespace-nowrap tabular-nums text-sm text-muted-foreground">
                      {item.area != null ? `${item.area} m²` : "—"}
                    </TableCell>
                  ) : null}
                  {showCampo("valor") ? (
                    <TableCell className="text-right">
                      {item.valor != null ? (
                        <span className="inline-flex rounded-full bg-muted/70 px-2 py-0.5 font-semibold tabular-nums tracking-tight">
                          {formatBrl(item.valor)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  ) : null}
                  {showCampo("renda") ? (
                    <TableCell className="text-right text-muted-foreground">
                      —
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    <div className="inline-flex rounded-lg border border-primary/20 bg-linear-to-br from-primary/10 to-cyan-400/10 p-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        asChild
                      >
                        <Link
                          to="/captacao/imoveis/$id"
                          params={{ id: item.id }}
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-primary/10"
                          title="Editar"
                          onClick={() =>
                            setUnidadeEditRequest({
                              id: item.id,
                              tick: Date.now(),
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/10"
                          title="Excluir"
                          onClick={() =>
                            setUnidadeDeleteRequest({
                              id: item.id,
                              tick: Date.now(),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager
            page={imoveisPager.page}
            totalPages={imoveisPager.totalPages}
            total={imoveisPager.total}
            onPageChange={imoveisPager.setPage}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {imoveisPager.pageItems.map((item) => (
            <Card
              key={item.id}
              className={cn(TABLE_SHELL, "group")}
            >
              <Link
                to="/imoveis/$id"
                params={{ id: item.id }}
                className="relative block h-40 overflow-hidden bg-muted/40"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground/40" />
                </div>
                {(() => {
                  const capa = empreendimentoCapa(item);
                  if (!capa) return null;
                  return (
                    <img
                      src={capa}
                      alt=""
                      width={520}
                      height={280}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  );
                })()}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent" />
                {showCampo("localidade") &&
                empreendimentoLocalidadeNome(item) ? (
                  <Badge className="absolute bottom-3 right-3 rounded-full border-white/20 bg-black/45 text-white hover:bg-black/55">
                    {empreendimentoLocalidadeNome(item)}
                  </Badge>
                ) : null}
              </Link>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    <Link
                      to="/imoveis/$id"
                      params={{ id: item.id }}
                      className="hover:underline"
                    >
                      {item.nome}
                    </Link>
                  </CardTitle>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-8 gap-1 px-2"
                      title="Clientes compatíveis"
                      onClick={() => void openMatches(item)}
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-[11px] font-semibold">
                        {(item.matchTotal ?? 0) > 0
                          ? `${item.matchTotal}`
                          : ""}
                      </span>
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => void openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Excluir"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {showCampo("construtora") && item.construtora ? (
                  <p className="text-xs text-muted-foreground">
                    {item.construtora.nome}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  type="button"
                  onClick={() => void openMatches(item)}
                  className="flex w-full items-center justify-between rounded-xl border border-black/5 bg-muted/40 px-3 py-2 text-left text-xs hover:bg-muted/70"
                >
                  <span className="font-medium text-foreground">
                    {(item.matchTotal ?? 0) > 0
                      ? `${item.matchTotal} cliente${item.matchTotal === 1 ? "" : "s"} compatível${item.matchTotal === 1 ? "" : "eis"}`
                      : "Ver clientes compatíveis"}
                  </span>
                  {(item.matchMuitoCompativeis ?? 0) > 0 ? (
                    <span className="text-muted-foreground">
                      {item.matchMuitoCompativeis} muito compatíveis
                    </span>
                  ) : (
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {showCampo("endereco") && item.endereco ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.endereco}
                  </p>
                ) : null}
                {showCampo("tipo") ||
                showCampo("status") ||
                showCampo("tags") ? (
                  <div className="flex flex-wrap gap-1.5">
                    {showCampo("tipo") && item.tipo ? (
                      <Badge
                        className={cn(
                          STATUS_CHIP_CLASS,
                          IMOVEIS_TABLE_CHIP,
                          colorByLabel("empreendimento_tipo", item.tipo),
                        )}
                        title={empreendimentoTipoLabel(item.tipo)}
                      >
                        {empreendimentoTipoLabel(item.tipo)}
                      </Badge>
                    ) : null}
                    {showCampo("status") && item.status ? (
                      <Badge
                        className={cn(
                          STATUS_CHIP_CLASS,
                          IMOVEIS_TABLE_CHIP,
                          colorByLabel(
                            "empreendimento_status",
                            item.status,
                          ),
                        )}
                        title={empreendimentoStatusLabel(item.status)}
                      >
                        {empreendimentoStatusLabel(item.status)}
                      </Badge>
                    ) : null}
                    {showCampo("tags")
                      ? (item.tags ?? []).map((tag) => (
                          <Badge
                            key={tag}
                            className={cn(
                              STATUS_CHIP_CLASS,
                              IMOVEIS_TABLE_CHIP,
                              colorByLabel("empreendimento_tag", tag),
                            )}
                            title={tag}
                          >
                            {tag}
                          </Badge>
                        ))
                      : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {showCampo("previsao") && item.previsaoEntrega ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {formatPrevisao(item.previsaoEntrega)}
                    </span>
                  ) : null}
                  {showCampo("quartos") && item.quartos != null && (
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      {item.quartos}
                    </span>
                  )}
                  {showCampo("banheiros") && item.banheiros != null && (
                    <span className="inline-flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" />
                      {item.banheiros}
                    </span>
                  )}
                  {showCampo("vagas") && item.vagas != null && (
                    <span className="inline-flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" />
                      {item.vagas}
                    </span>
                  )}
                  {showCampo("metragem") && item.areaM2 != null && (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" />
                      {item.areaM2} m²
                    </span>
                  )}
                  {showCampo("valor") && item.valorReferencia != null && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      A partir de {brl(item.valorReferencia)}
                    </span>
                  )}
                  {showCampo("renda") && item.rendaAPartirDe != null && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Wallet className="w-3.5 h-3.5" />
                      Renda a partir de {brl(item.rendaAPartirDe)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {captacaoFiltered.map((item) => (
            <Card
              key={`cap-${item.id}`}
              className={cn(TABLE_SHELL, "group")}
            >
              <Link
                to="/captacao/imoveis/$id"
                params={{ id: item.id }}
                className="relative block h-40 overflow-hidden bg-muted/40"
              >
                {item.fotoUrl ? (
                  <img
                    src={item.fotoUrl}
                    alt=""
                    width={520}
                    height={280}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className="absolute bottom-3 right-3 rounded-full border-white/20 bg-black/45 text-white hover:bg-black/55">
                  Captação
                </Badge>
              </Link>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">
                  <Link
                    to="/captacao/imoveis/$id"
                    params={{ id: item.id }}
                    className="hover:underline"
                  >
                    {item.titulo}
                  </Link>
                </CardTitle>
                  <div className="flex shrink-0 gap-0.5">
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar"
                      onClick={() =>
                        setUnidadeEditRequest({
                          id: item.id,
                          tick: Date.now(),
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Excluir"
                      onClick={() =>
                        setUnidadeDeleteRequest({
                          id: item.id,
                          tick: Date.now(),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.proprietario?.nome ?? "Sem proprietário"}
                  {item.cidade ? ` · ${item.cidade}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={STATUS_CHIP_CLASS}>
                    {CAPTACAO_IMOVEL_TIPO_LABEL[item.tipo]}
                  </Badge>
                </div>
                {item.valor != null ? (
                  <p className="text-sm font-medium">
                    {formatBrl(item.valor)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!embedded ? (
        <CatalogUnidadeImoveis
          hideList
          search={search}
          vista={vista}
          proprietarioId={proprietarioId}
          createTick={unidadeCreateTick}
          editRequest={unidadeEditRequest}
          deleteRequest={unidadeDeleteRequest}
          onChanged={() => void loadCaptacaoImoveis()}
        />
      ) : null}

      <Dialog open={kindPickOpen} onOpenChange={setKindPickOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="space-y-1.5 px-6 pb-2 pt-6">
            <DialogTitle className="text-xl">O que você vai cadastrar?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Escolha o tipo. Depois abrimos só o formulário certo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            <button
              type="button"
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
              onClick={() => void openQuickCreate()}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Lançamento
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Empreendimento da construtora: torres, plantas e tabela.
                </span>
              </span>
            </button>
            <button
              type="button"
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
              onClick={openUnidadeCreate}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Home className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Captação ou usado
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Unidade de um dono: ficha, fotos e venda de usados.
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialogShell
        open={matchesOpen}
        onOpenChange={setMatchesOpen}
        icon={<Users className="w-5 h-5" />}
        title={`Clientes compatíveis — ${matchesTitle}`}
        description="Quem tem maior chance de interesse neste imóvel, para você abordar agora."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMatchesOpen(false)}
            >
              Fechar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {matchesLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !matchesResult || matchesResult.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum cliente compatível encontrado. Preencha valor, vagas e
              preferências nos clientes para melhorar o matching.
            </p>
          ) : (
            <div className="space-y-4">
              {matchesItem ? (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {[
                    matchesItem.valorReferencia != null
                      ? brl(matchesItem.valorReferencia)
                      : null,
                    matchesItem.quartos != null
                      ? `${matchesItem.quartos} quartos`
                      : null,
                    matchesItem.vagas != null
                      ? `${matchesItem.vagas} vagas`
                      : null,
                    empreendimentoLocalidadeNome(matchesItem) ||
                      matchesItem.cidade,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    matchesFilter === "todos" && "border-primary bg-primary/5",
                  )}
                  onClick={() => setMatchesFilter("todos")}
                >
                  <div className="text-xs text-muted-foreground">Compatíveis</div>
                  <div className="text-lg font-semibold">{matchesResult.total}</div>
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    matchesFilter === "muito" && "border-primary bg-primary/5",
                  )}
                  onClick={() => setMatchesFilter("muito")}
                >
                  <div className="text-xs text-muted-foreground">
                    Muito compatíveis
                  </div>
                  <div className="text-lg font-semibold">
                    {matchesResult.muitoCompativeis}
                  </div>
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    matchesFilter === "interesse" && "border-primary bg-primary/5",
                  )}
                  onClick={() => setMatchesFilter("interesse")}
                >
                  <div className="text-xs text-muted-foreground">
                    Já viram imóvel semelhante
                  </div>
                  <div className="text-lg font-semibold">
                    {matchesResult.comInteressePrevio}
                  </div>
                </button>
              </div>
              <div className="space-y-2">
                {matchesResult.matches
                  .filter((match) => {
                    if (matchesFilter === "muito")
                      return match.nivel === "muito_compativel";
                    if (matchesFilter === "interesse")
                      return match.interessePrevio;
                    return true;
                  }).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum cliente neste recorte. Veja a lista completa em
                    Compatíveis.
                  </p>
                ) : null}
                {matchesResult.matches
                  .filter((match) => {
                    if (matchesFilter === "muito")
                      return match.nivel === "muito_compativel";
                    if (matchesFilter === "interesse")
                      return match.interessePrevio;
                    return true;
                  })
                  .map((match) => {
                    const wa = whatsappHref(match.lead.telefone);
                    return (
                  <div
                    key={match.lead.id}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm",
                      match.interessePrevio && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{match.lead.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {match.lead.cidade}
                          {match.lead.bairro ? ` · ${match.lead.bairro}` : ""}
                          {match.lead.corretor
                            ? ` · ${match.lead.corretor.name}`
                            : ""}
                          {match.lead.orcamentoMax != null
                            ? ` · até ${brl(match.lead.orcamentoMax)}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={
                            match.nivel === "muito_compativel"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {match.nivel === "muito_compativel"
                            ? "Muito compatível"
                            : "Compatível"}{" "}
                          · {match.score}
                        </Badge>
                        {match.interessePrevio ? (
                          <Badge variant="outline" className="text-[10px]">
                            Já demonstrou interesse
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {match.motivos.map((motivo) => (
                        <Badge
                          key={motivo}
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {MATCH_MOTIVO_LABEL[motivo] ??
                            motivo.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {wa ? (
                        <Button type="button" size="sm" className="h-7" asChild>
                          <a href={wa} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-1 h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                      ) : null}
                      {canOpenFunil ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7"
                          asChild
                        >
                          <Link
                            to="/funil"
                            search={{ lead: match.lead.id }}
                          >
                            Abrir no funil
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7"
                          asChild
                        >
                          <Link to="/leads">Abrir em leads</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                    );
                  })}
              </div>
            </div>
          )}
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={quickOpen}
        onOpenChange={(open) => {
          setQuickOpen(open);
          if (!open) {
            setEditingId(null);
            setFormTab("identidade");
            resetImageState();
          }
        }}
        className="max-w-4xl"
        icon={<Building2 className="w-5 h-5" />}
        title={editingId ? "Editar empreendimento" : "Novo empreendimento"}
        description="Cada dado uma vez: local, unidade, itens e textos da vitrine."
        footer={
          <FormDialogActions hint="Salva o empreendimento no catálogo. O que estiver vazio não aparece na página pública.">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={quickSaving}
              onClick={() => void handleQuickSave()}
            >
              {quickSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody className="bg-muted/40 [&_input]:h-10 [&_input]:rounded-xl [&_input]:border-border/80 [&_input]:bg-background [&_input]:shadow-sm [&_textarea]:rounded-xl [&_textarea]:border-border/80 [&_textarea]:bg-background [&_textarea]:shadow-sm [&_button[role=combobox]]:h-10 [&_button[role=combobox]]:rounded-xl">
          <Tabs
            value={formTab}
            onValueChange={(value) =>
              setFormTab(value as EmpreendimentoFormTab)
            }
          >
            <nav className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                {EMPREENDIMENTO_FORM_STEPS.map((item, index) => {
                  const active = item.id === formTab;
                  const currentIndex = EMPREENDIMENTO_FORM_STEPS.findIndex(
                    (step) => step.id === formTab,
                  );
                  const done = index < currentIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormTab(item.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : done
                            ? "border-primary/30 bg-primary/5 text-foreground"
                            : "border-border/80 bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                          active
                            ? "bg-white/20 text-primary-foreground"
                            : done
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${
                      ((EMPREENDIMENTO_FORM_STEPS.findIndex(
                        (item) => item.id === formTab,
                      ) +
                        1) /
                        EMPREENDIMENTO_FORM_STEPS.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </nav>

            <TabsContent value="identidade" className="mt-4">
          <FormSection
            icon={<Palette className="h-4 w-4" />}
            title="Identidade"
            description="Nome, construtora, cor de destaque e fotos do catálogo."
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="imovel-nome">Nome *</Label>
                <Input
                  id="imovel-nome"
                  value={form.nome}
                  onChange={(event) => setField("nome", event.target.value)}
                  placeholder="Ex.: Reserva dos Ipês"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Construtora *</Label>
                <Select
                  value={
                    form.novaConstrutora
                      ? "__new__"
                      : form.construtoraId || "__none__"
                  }
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setForm((prev) => ({
                        ...prev,
                        novaConstrutora: true,
                        construtoraId: "",
                      }));
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      novaConstrutora: false,
                      construtoraNome: "",
                      construtoraId: value === "__none__" ? "" : value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    <SelectItem value="__new__">+ Nova construtora</SelectItem>
                    {construtoras.map((construtora) => (
                      <SelectItem key={construtora.id} value={construtora.id}>
                        {construtora.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.novaConstrutora ? (
                  <Input
                    value={form.construtoraNome}
                    onChange={(event) =>
                      setField("construtoraNome", event.target.value)
                    }
                    placeholder="Nome da construtora"
                    className="mt-2"
                  />
                ) : null}
              </div>
              <CorPicker
                id="imovel-cor"
                value={form.cor}
                onChange={(hex) => setField("cor", hex)}
                previewLabel={form.nome}
              />
              {canManage ? (
                <ImageUploadField
                  images={[...quickImages, ...pendingPreviews]}
                  max={EMPREENDIMENTO_MAX_IMAGES}
                  label="Fotos"
                  hint={`Até ${EMPREENDIMENTO_MAX_IMAGES} imagens por empreendimento (JPG, PNG ou WebP, máx. 5 MB).`}
                  slotLabels={["Foto 1"]}
                  disabled={quickSaving}
                  busy={imageBusy}
                  onAdd={(files) => void handleAddImages(files)}
                  onRemove={(index) => void handleRemoveImage(index)}
                />
              ) : null}
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="localidade" className="mt-4">
          <FormSection
            icon={<MapPin className="h-4 w-4" />}
            title="Local"
            description="Um único endereço para o catálogo, o mapa e a página pública."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Localidade</Label>
                <Select
                  value={
                    form.novaLocalidade
                      ? "__new__"
                      : form.localidadeId || "__none__"
                  }
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setForm((prev) => ({
                        ...prev,
                        novaLocalidade: true,
                        localidadeId: "",
                      }));
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      novaLocalidade: false,
                      localidadeNome: "",
                      localidadeId: value === "__none__" ? "" : value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    <SelectItem value="__new__">+ Nova localidade</SelectItem>
                    {catalogoLocalidades.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.novaLocalidade ? (
                  <Input
                    value={form.localidadeNome}
                    onChange={(event) =>
                      setField("localidadeNome", event.target.value)
                    }
                    placeholder="Ex.: Recife"
                    className="mt-2"
                  />
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imovel-endereco">Rua / logradouro</Label>
                <Input
                  id="imovel-endereco"
                  value={form.endereco}
                  onChange={(event) => setField("endereco", event.target.value)}
                  placeholder="Rua, avenida ou referência"
                />
              </div>
              <FormField label="Número" htmlFor="imovel-vitrine-numero">
                <Input
                  id="imovel-vitrine-numero"
                  value={form.vitrineNumero}
                  onChange={(event) =>
                    setField("vitrineNumero", event.target.value)
                  }
                  placeholder="1000"
                  maxLength={20}
                />
              </FormField>
              <FormField label="Bairro" htmlFor="imovel-vitrine-bairro">
                <Input
                  id="imovel-vitrine-bairro"
                  value={form.vitrineBairro}
                  onChange={(event) =>
                    setField("vitrineBairro", event.target.value)
                  }
                  placeholder="Várzea"
                  maxLength={80}
                />
              </FormField>
              <FormField label="Estado" htmlFor="imovel-vitrine-estado">
                <Input
                  id="imovel-vitrine-estado"
                  value={form.vitrineEstado}
                  onChange={(event) =>
                    setField("vitrineEstado", event.target.value)
                  }
                  placeholder="Pernambuco"
                  maxLength={40}
                />
              </FormField>
              <FormField label="CEP" htmlFor="imovel-vitrine-cep">
                <Input
                  id="imovel-vitrine-cep"
                  value={form.vitrineCep}
                  onChange={(event) =>
                    setField("vitrineCep", event.target.value)
                  }
                  placeholder="50741-430"
                  maxLength={12}
                />
              </FormField>
              <FormField label="Latitude" htmlFor="imovel-lat">
                <Input
                  id="imovel-lat"
                  value={form.vitrineLatitude}
                  onChange={(event) =>
                    setField("vitrineLatitude", event.target.value)
                  }
                />
              </FormField>
              <FormField label="Longitude" htmlFor="imovel-lng">
                <Input
                  id="imovel-lng"
                  value={form.vitrineLongitude}
                  onChange={(event) =>
                    setField("vitrineLongitude", event.target.value)
                  }
                />
              </FormField>
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="classificacao" className="mt-4 space-y-4">
          <FormSection
            icon={<Layers className="h-4 w-4" />}
            title="Tipo"
            description="Classificação do produto. Admin, gerente, analista e treinee podem criar, editar e excluir tipos."
          >
            {canCreateCatalog ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openQuickCatalog("empreendimento_tipo")}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nova
                </Button>
              </div>
            ) : null}
            {canCreateCatalog ? (
              <div className="space-y-2">
                {tipoOptions.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      form.tipo === item.label &&
                        "border-primary/50 bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left text-sm"
                      onClick={() =>
                        setField(
                          "tipo",
                          form.tipo === item.label ? "" : item.label,
                        )
                      }
                    >
                      {item.label}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar tipo"
                      onClick={() => openEditCatalog(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title="Excluir tipo"
                      onClick={() => setCatalogDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {form.tipo &&
                !tipoOptions.some((item) => item.label === form.tipo) ? (
                  <div className="flex items-center rounded-lg border px-3 py-2 text-sm">
                    {form.tipo}
                  </div>
                ) : null}
              </div>
            ) : (
              <Select
                value={form.tipo || "__none__"}
                onValueChange={(value) =>
                  setField("tipo", value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {withExtraLabel(
                    tipoOptions.map((item) => item.label),
                    form.tipo,
                  ).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tipoOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {canCreateCatalog
                  ? "Nenhum tipo cadastrado. Use Nova para criar o primeiro."
                  : "Nenhum tipo cadastrado. Peça à gerência em Configurações → Imóveis."}
              </p>
            ) : null}
          </FormSection>

          <FormSection
            icon={<CircleDot className="h-4 w-4" />}
            title="Status"
            description="Momento da obra ou comercialização. Admin, gerente, analista e treinee podem criar, editar e excluir status."
          >
            {canCreateCatalog ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openQuickCatalog("empreendimento_status")}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Novo
                </Button>
              </div>
            ) : null}
            {canCreateCatalog ? (
              <div className="space-y-2">
                {statusOptions.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      form.status === item.label &&
                        "border-primary/50 bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left text-sm"
                      onClick={() =>
                        setField(
                          "status",
                          form.status === item.label ? "" : item.label,
                        )
                      }
                    >
                      {item.label}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar status"
                      onClick={() => openEditCatalog(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title="Excluir status"
                      onClick={() => setCatalogDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {form.status &&
                !statusOptions.some((item) => item.label === form.status) ? (
                  <div className="flex items-center rounded-lg border px-3 py-2 text-sm">
                    {form.status}
                  </div>
                ) : null}
              </div>
            ) : (
              <Select
                value={form.status || "__none__"}
                onValueChange={(value) =>
                  setField("status", value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {withExtraLabel(
                    statusOptions.map((item) => item.label),
                    form.status,
                  ).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {statusOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {canCreateCatalog
                  ? "Nenhum status cadastrado. Use Novo para criar o primeiro."
                  : "Nenhum status cadastrado. Peça à gerência em Configurações → Imóveis."}
              </p>
            ) : null}
          </FormSection>

          <FormSection
            icon={<Tag className="h-4 w-4" />}
            title="Tags"
            description="Marcas usadas na busca e na conversa comercial. Admin, gerente, analista e treinee podem criar, editar e excluir tags."
          >
            {canCreateCatalog ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openQuickCatalog("empreendimento_tag")}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nova
                </Button>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {withExtraLabels(
                tagOptions.map((item) => item.label),
                form.tags,
              ).map((label) => {
                const catalogItem = tagOptions.find(
                  (item) => item.label === label,
                );
                return (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`imovel-tag-${label}`}
                      checked={form.tags.some(
                        (tag) =>
                          tag.toLocaleLowerCase("pt-BR") ===
                          label.toLocaleLowerCase("pt-BR"),
                      )}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const selected = prev.tags.some(
                            (tag) =>
                              tag.toLocaleLowerCase("pt-BR") ===
                              label.toLocaleLowerCase("pt-BR"),
                          );
                          if (checked === true && !selected) {
                            return { ...prev, tags: [...prev.tags, label] };
                          }
                          if (checked !== true && selected) {
                            return {
                              ...prev,
                              tags: prev.tags.filter(
                                (tag) =>
                                  tag.toLocaleLowerCase("pt-BR") !==
                                  label.toLocaleLowerCase("pt-BR"),
                              ),
                            };
                          }
                          return prev;
                        })
                      }
                    />
                    <label
                      htmlFor={`imovel-tag-${label}`}
                      className="flex-1 cursor-pointer"
                    >
                      {label}
                    </label>
                    {canCreateCatalog && catalogItem ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar tag"
                          onClick={() => openEditCatalog(catalogItem)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Excluir tag"
                          onClick={() => setCatalogDeleteTarget(catalogItem)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {tagOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {canCreateCatalog
                  ? "Nenhuma tag cadastrada. Use Nova para criar a primeira."
                  : "Nenhuma tag cadastrada. Peça à gerência em Configurações → Imóveis."}
              </p>
            ) : null}
          </FormSection>
            </TabsContent>

            <TabsContent value="unidade" className="mt-4 space-y-4">
          <FormSection
            icon={<Home className="h-4 w-4" />}
            title="Condomínio"
            description="Nome do empreendimento no condomínio, se houver."
          >
            <FormField label="Condomínio" htmlFor="imovel-condo">
              <Input
                id="imovel-condo"
                value={form.vitrineNomeCondominio}
                onChange={(event) =>
                  setField("vitrineNomeCondominio", event.target.value)
                }
              />
            </FormField>
          </FormSection>
          {form.vitrineTipologias.map((row, index) => (
            <FormSection
              key={row.key}
              icon={<Layers className="h-4 w-4" />}
              title={`Tipologia ${index + 1}`}
              description="Cada bloco é um tipo de unidade diferente."
            >
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_UNIDADE_OPCOES.map((option) => {
                  const active = row.nome === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          vitrineTipologias: prev.vitrineTipologias.map(
                            (item, i) =>
                              i === index ? { ...item, nome: option } : item,
                          ),
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/80 bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nome do tipo" htmlFor={`tipologia-nome-${index}`}>
                  <Input
                    id={`tipologia-nome-${index}`}
                    value={row.nome}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index ? { ...item, nome: event.target.value } : item,
                        ),
                      }))
                    }
                    placeholder="Ex.: Com varanda"
                  />
                </FormField>
                <FormField label="Metragem (m²)">
                  <Input
                    inputMode="decimal"
                    value={row.areaM2 ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index
                            ? { ...item, areaM2: parseAreaM2(event.target.value) }
                            : item,
                        ),
                      }))
                    }
                    placeholder="Ex.: 68"
                  />
                </FormField>
                <FormField label="Quartos">
                  <Input
                    inputMode="numeric"
                    value={row.quartos ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                quartos: event.target.value
                                  ? Number.parseInt(event.target.value, 10)
                                  : null,
                              }
                            : item,
                        ),
                      }))
                    }
                    placeholder="Ex.: 3"
                  />
                </FormField>
                <FormField label="Vagas">
                  <Input
                    inputMode="numeric"
                    value={row.vagas ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                vagas: event.target.value
                                  ? Number.parseInt(event.target.value, 10)
                                  : null,
                              }
                            : item,
                        ),
                      }))
                    }
                    placeholder="Ex.: 2"
                  />
                </FormField>
                <FormField label="Suítes">
                  <Input
                    inputMode="numeric"
                    value={row.suites ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                suites: event.target.value
                                  ? Number.parseInt(event.target.value, 10)
                                  : null,
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                </FormField>
                <FormField label="Banheiros">
                  <Input
                    inputMode="numeric"
                    value={row.banheiros ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                banheiros: event.target.value
                                  ? Number.parseInt(event.target.value, 10)
                                  : null,
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                </FormField>
                <FormField label="Andares / pavimento">
                  <Input
                    value={row.pavimento ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          i === index
                            ? { ...item, pavimento: event.target.value || null }
                            : item,
                        ),
                      }))
                    }
                  />
                </FormField>
                <FormField label="Valor desta unidade (R$)" htmlFor={`tipologia-valor-${row.key}`}>
                  <Input
                    id={`tipologia-valor-${row.key}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    name={`tipologia-valor-${row.key}`}
                    value={typeof row.valor === "number" ? maskReaisInput(String(row.valor)) : row.valor}
                    onChange={(event) => {
                      const valor = maskReaisInput(event.target.value);
                      setForm((prev) => ({
                        ...prev,
                        vitrineTipologias: prev.vitrineTipologias.map((item, i) =>
                          (row.key && item.key === row.key) || i === index
                            ? { ...item, valor }
                            : item,
                        ),
                      }));
                    }}
                    placeholder="Ex.: 200000"
                  />
                </FormField>
              </div>
              {form.vitrineTipologias.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl text-destructive"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      vitrineTipologias: prev.vitrineTipologias.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remover tipologia
                </Button>
              ) : null}
            </FormSection>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                vitrineTipologias: [...prev.vitrineTipologias, emptyTipologia()],
              }))
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar outra tipologia
          </Button>
            </TabsContent>

            <TabsContent value="prazos" className="mt-4">
          <FormSection
            icon={<CalendarClock className="h-4 w-4" />}
            title="Prazos e valores"
            description="Entrega, lançamento, preço e renda sugerida."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="imovel-previsao">Previsão de entrega</Label>
                <Input
                  id="imovel-previsao"
                  type="date"
                  value={form.previsaoEntrega}
                  onChange={(event) =>
                    setField("previsaoEntrega", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Quando as chaves devem ser entregues.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imovel-lancamento">Lançamento</Label>
                <Input
                  id="imovel-lancamento"
                  type="date"
                  value={form.vitrineLancamento}
                  onChange={(event) =>
                    setField("vitrineLancamento", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Data comercial em que o empreendimento foi ou será lançado
                  no mercado.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="imovel-valor">A partir de (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="imovel-valor"
                    inputMode="numeric"
                    value={form.valorReferencia}
                    onChange={(event) =>
                      setField(
                        "valorReferencia",
                        maskMoneyInput(event.target.value),
                      )
                    }
                    placeholder="Ex.: 200.000,00"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor inicial do empreendimento. Aparece na tabela como “A
                  partir de”.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="imovel-renda">Renda a partir de (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="imovel-renda"
                    inputMode="numeric"
                    value={form.rendaAPartirDe}
                    onChange={(event) =>
                      setField(
                        "rendaAPartirDe",
                        maskMoneyInput(event.target.value),
                      )
                    }
                    placeholder="Ex.: 40.000,00"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Renda mínima sugerida. Aparece no card e no filtro de renda.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imovel-valor-max">Valor máximo (R$)</Label>
                <Input
                  id="imovel-valor-max"
                  inputMode="numeric"
                  value={form.vitrineValorMax}
                  onChange={(event) =>
                    setField("vitrineValorMax", maskMoneyInput(event.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imovel-valor-m2">Valor por m²</Label>
                <Input
                  id="imovel-valor-m2"
                  inputMode="numeric"
                  value={form.vitrineValorM2}
                  onChange={(event) =>
                    setField("vitrineValorM2", event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="caracteristicas" className="mt-4">
          <FormSection
            icon={<Sparkles className="h-4 w-4" />}
            title="Itens e diferenciais"
            description="Toque para marcar. Os grupos seguem a ficha de visão geral."
          >
            <div className="space-y-4">
              <AmenityChips
                title="Características e diferenciais"
                hint="Lazer do condomínio"
                options={IMOVEL_CARACTERISTICAS_DIFERENCIAIS}
                value={form.vitrineLazerItems}
                onChange={(next) => setField("vitrineLazerItems", next)}
              />
              <AmenityChips
                title="Localização e infraestrutura"
                hint="Segurança e acesso"
                options={IMOVEL_LOCALIZACAO_INFRA}
                value={form.vitrineInfra}
                onChange={(next) => setField("vitrineInfra", next)}
              />
              <AmenityChips
                title="Detalhes do imóvel"
                hint="Ambientes da unidade"
                options={IMOVEL_DETALHES_IMOVEL}
                value={form.vitrineDetalhes}
                onChange={(next) => setField("vitrineDetalhes", next)}
              />
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="vitrine" className="mt-4 space-y-4">
          <FormSection
            icon={<Globe className="h-4 w-4" />}
            title="Textos da vitrine"
            description="O que o cliente lê no site compartilhado. Deixe em branco o que não quiser exibir."
          >
            <FormField label="Título de destaque" htmlFor="imovel-vitrine-headline">
              <Input
                id="imovel-vitrine-headline"
                value={form.vitrineHeadline}
                onChange={(event) =>
                  setField("vitrineHeadline", event.target.value)
                }
                placeholder="Ex.: O lugar perfeito para viver bem"
                maxLength={120}
              />
            </FormField>
            <FormField
              label="Descrição"
              htmlFor="imovel-vitrine-descricao"
              hint="Lazer, infraestrutura e ambientes ficam no passo Itens."
            >
              <Textarea
                id="imovel-vitrine-descricao"
                value={form.vitrineDescricao}
                onChange={(event) =>
                  setField("vitrineDescricao", event.target.value)
                }
                placeholder="Apresente o empreendimento para o cliente final."
                rows={7}
                maxLength={8000}
              />
            </FormField>
          </FormSection>
          <FormSection
            icon={<Globe className="h-4 w-4" />}
            title="Links da vitrine"
            description="O endereço fica no passo Local. Aqui só entram site e tour."
          >
            <FormField
              label="Website"
              htmlFor="imovel-website"
              hint="Cole o link do site oficial."
            >
              <div className="space-y-1.5">
                {/^https?:\/\//i.test(form.vitrineWebsite.trim()) ? (
                  <a
                    href={form.vitrineWebsite.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Testar link
                  </a>
                ) : null}
                <Input
                  id="imovel-website"
                  type="url"
                  inputMode="url"
                  value={form.vitrineWebsite}
                  onChange={(event) =>
                    setField("vitrineWebsite", event.target.value)
                  }
                  placeholder="https://www.empreendimento.com.br"
                />
              </div>
            </FormField>
            <FormField
              label="Tour virtual 360°"
              htmlFor="imovel-tour"
              hint="Cole o link do tour. Sem link, a ficha mostra “não habilitado”."
            >
              <div className="space-y-1.5">
                {/^https?:\/\//i.test(form.vitrineTour.trim()) ? (
                  <a
                    href={form.vitrineTour.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Testar tour
                  </a>
                ) : null}
                <Input
                  id="imovel-tour"
                  type="url"
                  inputMode="url"
                  value={form.vitrineTour}
                  onChange={(event) => setField("vitrineTour", event.target.value)}
                  placeholder="https://tour.exemplo.com/empreendimento"
                />
              </div>
            </FormField>
          </FormSection>
            </TabsContent>

            <TabsContent value="observacao" className="mt-4">
          <FormSection
            icon={<StickyNote className="h-4 w-4" />}
            title="Notas internas"
            description="Só o time vê. Não entra no anúncio da página pública."
          >
            <Textarea
              id="imovel-observacao"
              className="min-h-24"
              value={form.observacao}
              onChange={(event) => setField("observacao", event.target.value)}
              placeholder="Combinado com a construtora, pendência de documentação…"
              rows={6}
              maxLength={2000}
            />
          </FormSection>
            </TabsContent>

            <div className="mt-4 flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                disabled={formTab === EMPREENDIMENTO_FORM_STEPS[0].id}
                onClick={() => {
                  const index = EMPREENDIMENTO_FORM_STEPS.findIndex(
                    (item) => item.id === formTab,
                  );
                  const prev = EMPREENDIMENTO_FORM_STEPS[index - 1];
                  if (prev) setFormTab(prev.id);
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {EMPREENDIMENTO_FORM_STEPS.findIndex((item) => item.id === formTab) +
                  1}{" "}
                de {EMPREENDIMENTO_FORM_STEPS.length}
              </span>
              <Button
                type="button"
                variant={
                  formTab === EMPREENDIMENTO_FORM_STEPS.at(-1)?.id
                    ? "outline"
                    : "default"
                }
                className="rounded-xl"
                disabled={formTab === EMPREENDIMENTO_FORM_STEPS.at(-1)?.id}
                onClick={() => {
                  const index = EMPREENDIMENTO_FORM_STEPS.findIndex(
                    (item) => item.id === formTab,
                  );
                  const next = EMPREENDIMENTO_FORM_STEPS[index + 1];
                  if (next) setFormTab(next.id);
                }}
              >
                Continuar
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </Tabs>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empreendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Leads e documentações vinculadas
              ficarão sem empreendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(quickCatalogOpen)}
        onOpenChange={(open) => {
          if (!open) {
            setQuickCatalogOpen(null);
            setQuickCatalogEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {quickCatalogOpen
                ? quickCatalogEditing
                  ? EMPREENDIMENTO_CATALOG_EDIT_TITLES[quickCatalogOpen]
                  : EMPREENDIMENTO_CATALOG_TITLES[quickCatalogOpen]
                : "Novo item"}
            </DialogTitle>
            <DialogDescription>
              {quickCatalogEditing
                ? "O novo nome vale neste cadastro e nos empreendimentos que já usam este item."
                : "O item fica disponível neste cadastro e em Configurações → Imóveis."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={quickCatalogLabel}
              onChange={(event) => setQuickCatalogLabel(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveQuickCatalog();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuickCatalogOpen(null);
                setQuickCatalogEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickCatalogSaving}
              onClick={() => void saveQuickCatalog()}
            >
              {quickCatalogSaving && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              {quickCatalogEditing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar PDF</DialogTitle>
            <DialogDescription>
              Escolha a ordem e, se quiser, filtre por construtora ou
              localidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Organizar por</Label>
              <RadioGroup
                value={pdfOrdem}
                onValueChange={(value) =>
                  setPdfOrdem(value as PdfOrdemImoveis)
                }
                className="space-y-2"
              >
                {(
                  [
                    [
                      "alfabetica",
                      "Lista A–Z pelo nome do empreendimento.",
                    ],
                    [
                      "construtora",
                      "Agrupa e ordena pelos nomes das construtoras.",
                    ],
                    [
                      "localidade",
                      "Agrupa e ordena pelas localidades.",
                    ],
                  ] as const
                ).map(([value, hint]) => (
                  <label
                    key={value}
                    htmlFor={`pdf-ordem-${value}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/40"
                  >
                    <RadioGroupItem
                      id={`pdf-ordem-${value}`}
                      value={value}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {PDF_ORDEM_IMOVEIS_LABEL[value]}
                      </p>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-1.5 block">Construtora</Label>
              <Select
                value={pdfConstrutoraId || "__all__"}
                onValueChange={(value) =>
                  setPdfConstrutoraId(value === "__all__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {pdfOpcoesConstrutoras.map((construtora) => (
                    <SelectItem key={construtora.id} value={construtora.id}>
                      {construtora.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Localidade</Label>
              <Select
                value={pdfLocalidade || "__all__"}
                onValueChange={(value) =>
                  setPdfLocalidade(value === "__all__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {pdfOpcoesLocalidades.map((cidade) => (
                    <SelectItem key={cidade} value={cidade}>
                      {cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPdfOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className={IMOVEIS_GRADIENT_BTN}
              style={IMOVEIS_GRADIENT_STYLE}
              onClick={confirmarGerarPdf}
            >
              <FileText className="w-4 h-4 mr-1" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(catalogDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !catalogDeleting) setCatalogDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir{" "}
              {catalogDeleteTarget
                ? EMPREENDIMENTO_CATALOG_SINGULAR[
                    catalogDeleteTarget.type as EmpCatalogType
                  ]
                : "item"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {catalogDeleteTarget
                ? `"${catalogDeleteTarget.label}" some das listas de cadastro. Empreendimentos que já usam este valor mantêm o texto até serem editados.`
                : "Este item some das listas de cadastro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={catalogDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={catalogDeleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteCatalog();
              }}
            >
              {catalogDeleting && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
