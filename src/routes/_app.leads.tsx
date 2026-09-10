import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Copy,
  MessageCircle,
  UserPlus,
  MapPin,
  Wallet,
  Sparkles,
  CalendarClock,
  Eye,
  Pencil,
  Trash2,
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  Share2,
  Inbox,
  Briefcase,
  UserCheck,
  Users,
  Flame,
  Building2,
  Globe,
  Link2,
  Target,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import {
  brl,
  isLeadCarteiraPropria,
  prioridadeBadgeClass,
  type Lead,
} from "@/lib/crm-types";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  DEFAULT_CATALOG_COLOR,
  STATUS_CHIP_CLASS,
} from "@/lib/catalog-colors";
import { getSession } from "@/lib/auth";
import { getGerenteVerLeadsGerais } from "@/lib/clientes-nav-prefs";
import { canAccessRoute } from "@/lib/permissions";
import { contratoTemplatesForRole } from "@/lib/contratos-templates";
import {
  canViewTeamData,
  canWriteTriagem as roleCanWriteTriagem,
  isCorretorLike,
} from "@/lib/permissions";
import { canUserAction } from "@/lib/user-permissions";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { importLeads, fetchLeadById, mapApiLead, checkImportDuplicates } from "@/lib/leads-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import {
  downloadImportTemplate,
  exportLeadsToExcel,
  exportLeadsToPdf,
  parseLeadsFromFile,
  applyImportConflictErrors,
  type ImportExistingIndex,
  type ParsedImportLead,
} from "@/lib/leads-io";
import { LeadsDistribuirDialog } from "@/components/leads-distribuir-dialog";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { isPlaceholderEmail } from "@/lib/email";
import type { LeadProspeccao } from "@/lib/lead-prospeccao";
import { compactProspeccao, PROSPECCAO_SIM_NAO } from "@/lib/lead-prospeccao";
import { toast } from "sonner";
import { cn, userFacingError } from "@/lib/utils";
import { ContatoContratoFields } from "@/components/contato-contrato-fields";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { LeadDetalheDialog } from "@/components/lead-detalhe-dialog";
import {
  LeadAtividadeDialog,
  type LeadAtividadePrompt,
} from "@/components/lead-atividade-dialog";
import { useTenantTheme } from "@/lib/tenant-theme";
import { ApiError } from "@/lib/api";
import { SOFT_BTN } from "@/lib/soft-btn";
import {
  FILTER_BAR_SURFACE,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
  FILTER_LABEL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";

type DistribuicaoFilter = "all" | "chegaram" | "distribuidos" | "meus";

type LeadsSearch = {
  distribuicao?: DistribuicaoFilter;
  parados?: boolean;
};

const DIAS_PARADO = 3;

function isLeadParado(lead: Lead, dias = DIAS_PARADO): boolean {
  const raw = lead.updatedAtIso || lead.updatedAt;
  if (!raw) return false;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const t = br
    ? new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1])).getTime()
    : new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now() - dias * 24 * 60 * 60 * 1000;
}

function googleMapsSearchUrl(
  ...parts: Array<string | null | undefined>
): string | null {
  const query = parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export const Route = createFileRoute("/_app/leads")({
  head: () => ({ meta: [{ title: "Leads — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): LeadsSearch => {
    const result: LeadsSearch = {};
    const d = search.distribuicao;
    if (
      d === "chegaram" ||
      d === "distribuidos" ||
      d === "all" ||
      d === "meus"
    ) {
      result.distribuicao = d;
    }
    if (
      search.parados === true ||
      search.parados === "1" ||
      search.parados === "true"
    ) {
      result.parados = true;
    }
    return result;
  },
  component: LeadsPage,
});

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  temperatura: "Quente" | "Morno" | "Frio";
  /** Renda mensal do cliente (opcional); só dígitos no input. */
  renda: string;
  /** Tipo de renda (CLT, autônomo, etc.). */
  tipoRenda: string;
  /** Estado civil do cliente (opcional). */
  estadoCivil: string;
  cpf: string;
  rg: string;
  endereco: string;
  cep: string;
  /** Orçamento máximo para imóvel (opcional). */
  orcamentoMax: string;
  /** Mínimo de quartos desejado. */
  quartosMin: string;
  /** Mínimo de vagas desejado. */
  vagasMin: string;
  /** UUID da equipe (gerente). Vazio = sem seleção. */
  equipeId: string;
  /** UUID do corretor. "__pool__" = pool da equipe. Vazio = sem seleção. */
  corretorId: string;
  /** YYYY-MM-DD — cadastro retroativo. */
  createdAt: string;
  prospeccao: {
    endereco: string;
    instagram: string;
    site: string;
    linkedin: string;
    atuacao: string;
    lancamentos: string;
    usados: string;
    locacao: string;
    administracao: string;
    crmIdentificado: string;
    tecnologia: string;
    sinais: string;
    quemAbordar: string;
    produtoIndicado: string;
    fit: string;
    motivoFit: string;
  };
};

const todayInput = () => new Date().toISOString().slice(0, 10);

const emptyProspeccaoForm = () => ({
  endereco: "",
  instagram: "",
  site: "",
  linkedin: "",
  atuacao: "",
  lancamentos: "",
  usados: "",
  locacao: "",
  administracao: "",
  crmIdentificado: "",
  tecnologia: "",
  sinais: "",
  quemAbordar: "",
  produtoIndicado: "",
  fit: "",
  motivoFit: "",
});

function leadProspeccaoToForm(p?: LeadProspeccao | null) {
  return {
    endereco: p?.endereco ?? "",
    instagram: p?.instagram ?? "",
    site: p?.site ?? "",
    linkedin: p?.linkedin ?? "",
    atuacao: p?.atuacao ?? "",
    lancamentos: p?.lancamentos ?? "",
    usados: p?.usados ?? "",
    locacao: p?.locacao ?? "",
    administracao: p?.administracao ?? "",
    crmIdentificado: p?.crmIdentificado ?? "",
    tecnologia: p?.tecnologia ?? "",
    sinais: p?.sinais ?? "",
    quemAbordar: p?.quemAbordar ?? "",
    produtoIndicado: p?.produtoIndicado ?? "",
    fit: p?.fit != null ? String(p.fit) : "",
    motivoFit: p?.motivoFit ?? "",
  };
}

function formProspeccaoToPayload(
  p: FormState["prospeccao"],
): LeadProspeccao | null {
  const fitRaw = p.fit.trim().replace(",", ".");
  const fit = fitRaw ? Number(fitRaw) : null;
  return (
    compactProspeccao({
      endereco: p.endereco.trim() || null,
      instagram: p.instagram.trim() || null,
      site: p.site.trim() || null,
      linkedin: p.linkedin.trim() || null,
      atuacao: p.atuacao.trim() || null,
      lancamentos: p.lancamentos.trim() || null,
      usados: p.usados.trim() || null,
      locacao: p.locacao.trim() || null,
      administracao: p.administracao.trim() || null,
      crmIdentificado: p.crmIdentificado.trim() || null,
      tecnologia: p.tecnologia.trim() || null,
      sinais: p.sinais.trim() || null,
      quemAbordar: p.quemAbordar.trim() || null,
      produtoIndicado: p.produtoIndicado.trim() || null,
      fit: Number.isFinite(fit) ? fit : null,
      motivoFit: p.motivoFit.trim() || null,
    }) ?? null
  );
}

const emptyForm = (origemDefault = ""): FormState => ({
  nome: "",
  telefone: "",
  email: "",
  origem: origemDefault,
  interesse: "Comprar",
  cidade: "",
  bairro: "",
  prioridade: "Média",
  temperatura: "Morno",
  renda: "",
  tipoRenda: "",
  estadoCivil: "",
  cpf: "",
  rg: "",
  endereco: "",
  cep: "",
  orcamentoMax: "",
  quartosMin: "",
  vagasMin: "",
  equipeId: "",
  corretorId: "",
  createdAt: todayInput(),
  prospeccao: emptyProspeccaoForm(),
});

type FormMode = "create" | "edit";

type PlatformLeadTab =
  | "empresa"
  | "localizacao"
  | "digital"
  | "operacao"
  | "fit"
  | "funil";

function leadToForm(lead: Lead): FormState {
  const temp =
    (["Quente", "Morno", "Frio"] as const).find((t) => lead.tags.includes(t)) ??
    "Morno";
  return {
    nome: lead.nome,
    telefone: formatPhone(lead.telefone),
    email: isPlaceholderEmail(lead.email) ? "" : lead.email,
    origem: lead.origem,
    interesse: lead.interesse,
    cidade: lead.cidade,
    bairro: lead.bairro,
    prioridade: lead.prioridade,
    temperatura: temp,
    renda: lead.renda != null ? formatMoneyInput(lead.renda) : "",
    tipoRenda: lead.tipoRenda ?? "",
    estadoCivil: lead.estadoCivil ?? "",
    cpf: lead.cpf ?? "",
    rg: lead.rg ?? "",
    endereco: lead.endereco ?? "",
    cep: lead.cep ?? "",
    orcamentoMax:
      lead.orcamentoMax != null ? formatMoneyInput(lead.orcamentoMax) : "",
    quartosMin: lead.quartosMin != null ? String(lead.quartosMin) : "",
    vagasMin: lead.vagasMin != null ? String(lead.vagasMin) : "",
    equipeId: lead.equipeId ?? "",
    corretorId: lead.corretorId ?? (lead.equipeId ? "__pool__" : ""),
    createdAt: lead.createdAt?.slice(0, 10) || todayInput(),
    prospeccao: leadProspeccaoToForm(lead.prospeccao),
  };
}

const TIPO_RENDA_OPTIONS = [
  "CLT",
  "Autônomo",
  "Empresário",
  "Funcionário público",
  "Aposentado",
  "Renda mista",
  "Outros",
] as const;

const LEADS_GRADIENT_BTN =
  "border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110 disabled:opacity-50";
const LEADS_GRADIENT_STYLE = BRAND_GRADIENT_STYLE;

function LeadsPage() {
  const navigate = useNavigate();
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const canViewOthers = user
    ? canUserAction(user.role, user.permissions, "leads.viewOthers")
    : false;
  const canExportLeads = user
    ? canUserAction(user.role, user.permissions, "leads.export")
    : false;
  const canDeleteLeads = user
    ? canUserAction(user.role, user.permissions, "leads.delete")
    : false;
  const isCorretor = !canSeeTeam && !canViewOthers;
  const canWriteTriagem = roleCanWriteTriagem(user?.role);
  const { isModuleEnabled } = useTenantTheme();
  const canAgenda = isModuleEnabled("agenda");
  const canDistribuir = user?.role === "admin" || user?.role === "gerente";
  const isAdmin = user?.role === "admin";
  const isGerente = user?.role === "gerente";
  const gerenteVerLeadsGerais = isGerente && getGerenteVerLeadsGerais();
  const isPlatformAdmin = user?.role === "super_admin";
  const canContratos = Boolean(
    user &&
      canAccessRoute(
        user.role,
        "/contratos",
        user.tenant?.modules ?? null,
        user.tenant?.plano,
        user.permissions,
      ),
  );
  const contratoModelos = useMemo(
    () => contratoTemplatesForRole(user?.role),
    [user?.role],
  );
  const [contratoLead, setContratoLead] = useState<Lead | null>(null);
  const showTeamColumns = !isCorretor && !isPlatformAdmin;
  const leadTableColSpan = showTeamColumns ? 12 : 10;
  /** Só admin/analista filtram entre várias equipes. Gerente não filtra por outras. */
  const canFilterEquipe = user?.role === "admin" || user?.role === "analista";

  const {
    leads: allLeads,
    addLead,
    updateLead,
    markLeadLost,
    markLeadsLost,
    applyLead,
    loading,
    assignees,
    refresh,
  } = useLeads();
  const {
    funnelStages,
    origens: origemOptions,
    colorByLabel,
    refresh: refreshCatalog,
  } = useCatalog();
  // Backend atribui a etapa inicial (Novo lead) quando stage é omitido.
  const defaultStageName =
    funnelStages.find((s) => s.id === "novo")?.name ??
    funnelStages[0]?.name ??
    "Novo lead";

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importHelpOpen, setImportHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportLead[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importEditingInvalids, setImportEditingInvalids] = useState(false);
  const [importExisting, setImportExisting] = useState<ImportExistingIndex>({
    phones: {},
    emails: {},
  });
  const [distribuirOpen, setDistribuirOpen] = useState(false);

  const leads = useMemo(() => {
    const scoped =
      isCorretor && user
        ? allLeads.filter(
            (l) => l.corretor === user.name || l.corretorId === user.id,
          )
        : allLeads;
    return scoped.filter((l) => l.tipo === "lead");
  }, [allLeads, isCorretor, user]);

  /** Responsáveis ativos para atribuição (corretores + própria carteira). */
  const corretorAssignees = useMemo(
    () =>
      assignees.filter(
        (a) =>
          !a.role ||
          isCorretorLike(a.role) ||
          ((isAdmin || isGerente) &&
            (a.role === "admin" || a.role === "gerente") &&
            a.id === user?.id),
      ),
    [assignees, isAdmin, isGerente, user?.id],
  );

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [platformLeadTab, setPlatformLeadTab] =
    useState<PlatformLeadTab>("empresa");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteMotivoOutro, setDeleteMotivoOutro] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMotivo, setBulkMotivo] = useState("");
  const [bulkMotivoOutro, setBulkMotivoOutro] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [atividadePrompt, setAtividadePrompt] =
    useState<LeadAtividadePrompt | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  /** UUID do corretor ou "all". */
  const [corretorFilter, setCorretorFilter] = useState<string>("all");
  /** UUID da equipe ou "all". */
  const [equipeFilter, setEquipeFilter] = useState<string>("all");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("all");
  const [tipoRendaFilter, setTipoRendaFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const routeSearch = Route.useSearch();
  /** Separação pool (chegaram) × já atribuídos a equipe/corretor. */
  const [distribuicaoFilter, setDistribuicaoFilter] =
    useState<DistribuicaoFilter>(routeSearch.distribuicao ?? "all");
  const [paradosFilter, setParadosFilter] = useState(() =>
    Boolean(routeSearch.parados),
  );

  useEffect(() => {
    if (routeSearch.distribuicao) {
      setDistribuicaoFilter(routeSearch.distribuicao);
    }
  }, [routeSearch.distribuicao]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    setDistribuicaoFilter("all");
    if (routeSearch.distribuicao) {
      void navigate({ to: "/leads", search: {}, replace: true });
    }
  }, [isPlatformAdmin, routeSearch.distribuicao, navigate]);

  useEffect(() => {
    setParadosFilter(Boolean(routeSearch.parados));
  }, [routeSearch.parados]);

  /** Filtro de corretor: gerente só vê a própria equipe (não outras). */
  const corretorFilterOptions = useMemo(() => {
    if (!isGerente || !user) return corretorAssignees;
    const minhaEquipe = equipes.find((e) => e.gerenteId === user.id);
    const idsEquipe = new Set(minhaEquipe?.membros.map((m) => m.id) ?? []);
    return corretorAssignees.filter(
      (a) => a.id === user.id || idsEquipe.has(a.id),
    );
  }, [corretorAssignees, isGerente, user, equipes]);

  useEffect(() => {
    if (!canDistribuir && !canFilterEquipe) return;
    let cancelled = false;
    void fetchEquipes()
      .then((list) => {
        if (!cancelled) setEquipes(list);
      })
      .catch(() => {
        if (!cancelled) setEquipes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canDistribuir, canFilterEquipe]);

  /** Equipes ativas para o select de gerente (admin) / corretores (gerente). */
  const equipesAtivas = useMemo(
    () => equipes.filter((e) => e.status === "ativo"),
    [equipes],
  );

  const formEquipe = useMemo(
    () => equipesAtivas.find((e) => e.id === form.equipeId) ?? null,
    [equipesAtivas, form.equipeId],
  );

  /** Corretores disponíveis no form conforme equipe selecionada (admin/gerente). */
  const formCorretorOptions = useMemo(() => {
    const selfOption =
      user && (isAdmin || isGerente)
        ? [
            {
              id: user.id,
              name: `${user.name} (eu)`,
              role: user.role,
              status: "ativo" as const,
            },
          ]
        : [];
    if (!isAdmin && !isGerente) return [];

    if (formEquipe) {
      const membros = formEquipe.membros.filter(
        (m) => isCorretorLike(m.role) && m.status === "ativo",
      );
      return [...selfOption, ...membros];
    }

    // Sem equipe: todos os corretores do tenant (assignees).
    const todos = corretorAssignees
      .filter((a) => isCorretorLike(a.role) || !a.role)
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: "corretor" as const,
        status: "ativo" as const,
      }));
    return [...selfOption, ...todos.filter((c) => c.id !== user?.id)];
  }, [isAdmin, isGerente, formEquipe, corretorAssignees, user]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const filtersActive =
    debouncedSearch !== "" ||
    stageFilter !== "all" ||
    corretorFilter !== "all" ||
    (canFilterEquipe && equipeFilter !== "all") ||
    prioridadeFilter !== "all" ||
    tipoRendaFilter !== "all" ||
    origemFilter !== "all" ||
    (!isCorretor && distribuicaoFilter !== "all") ||
    paradosFilter;

  const isLeadChegou = (l: Lead) =>
    !l.corretorId && (isGerente ? true : !l.equipeId);
  const isLeadDistribuido = (l: Lead) =>
    isGerente ? Boolean(l.corretorId) : Boolean(l.corretorId || l.equipeId);

  const extraFiltersActive =
    prioridadeFilter !== "all" ||
    tipoRendaFilter !== "all" ||
    origemFilter !== "all";

  // Filtra no cliente sobre a lista já carregada no store — evita round-trip
  // ao Postgres remoto a cada mudança de filtro.
  const filteredLeads = useMemo(() => {
    if (!filtersActive) return leads;
    const q = debouncedSearch.toLowerCase();
    const qDigits = phoneDigits(debouncedSearch);
    const equipeMembros =
      equipeFilter === "all" || equipeFilter === "none"
        ? null
        : new Set(
            equipes
              .find((e) => e.id === equipeFilter)
              ?.membros.map((m) => m.id) ?? [],
          );
    const anyEquipeMembroIds =
      equipeFilter === "none"
        ? new Set(equipes.flatMap((e) => e.membros.map((m) => m.id)))
        : null;
    return leads.filter((l) => {
      if (q) {
        const hay = `${l.nome} ${l.email} ${l.telefone}`.toLowerCase();
        const phoneOk =
          qDigits.length >= 3 && phoneDigits(l.telefone).includes(qDigits);
        if (!hay.includes(q) && !phoneOk) return false;
      }
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!isCorretor && corretorFilter !== "all") {
        if (corretorFilter === "__none__") {
          // Pool admin: sem equipe e sem corretor (igual "Chegaram").
          if (l.corretorId || l.equipeId) return false;
        } else if (corretorFilter === "__equipe_pool__") {
          // Já na equipe, ainda sem corretor individual.
          if (l.corretorId || !l.equipeId) return false;
        } else if (l.corretorId !== corretorFilter) {
          return false;
        }
      }
      if (canFilterEquipe && !isCorretor && equipeFilter === "none") {
        if (l.equipeId) return false;
        if (l.corretorId && anyEquipeMembroIds?.has(l.corretorId)) return false;
      } else if (canFilterEquipe && !isCorretor && equipeFilter !== "all") {
        const inPool = l.equipeId === equipeFilter;
        const inMembros =
          Boolean(l.corretorId) && Boolean(equipeMembros?.has(l.corretorId!));
        if (!inPool && !inMembros) return false;
      }
      if (prioridadeFilter !== "all" && l.prioridade !== prioridadeFilter)
        return false;
      if (tipoRendaFilter !== "all" && (l.tipoRenda || "") !== tipoRendaFilter)
        return false;
      if (origemFilter !== "all" && l.origem !== origemFilter) return false;
      if (!isCorretor && distribuicaoFilter === "chegaram" && !isLeadChegou(l))
        return false;
      if (
        !isCorretor &&
        distribuicaoFilter === "distribuidos" &&
        !isLeadDistribuido(l)
      )
        return false;
      if (
        isGerente &&
        distribuicaoFilter === "meus" &&
        !isLeadCarteiraPropria(l, user?.id)
      )
        return false;
      if (paradosFilter && !isLeadParado(l)) return false;
      return true;
    });
  }, [
    leads,
    filtersActive,
    debouncedSearch,
    stageFilter,
    corretorFilter,
    equipeFilter,
    equipes,
    prioridadeFilter,
    tipoRendaFilter,
    origemFilter,
    distribuicaoFilter,
    paradosFilter,
    isCorretor,
    isGerente,
    canFilterEquipe,
    user?.id,
  ]);

  const sortedLeads = useMemo(
    () =>
      sortByTableOrder(
        filteredLeads,
        sort,
        (l) => l.nome,
        (l) => l.createdAt,
      ),
    [filteredLeads, sort],
  );

  const leadsPager = useTablePager(
    sortedLeads,
    [
      debouncedSearch,
      stageFilter,
      corretorFilter,
      equipeFilter,
      prioridadeFilter,
      tipoRendaFilter,
      origemFilter,
      distribuicaoFilter,
      paradosFilter,
      sort,
    ].join("|"),
  );

  const distribuicaoCounts = useMemo(() => {
    let chegaram = 0;
    let distribuidos = 0;
    let meus = 0;
    for (const l of leads) {
      if (isLeadChegou(l)) chegaram += 1;
      else if (isLeadDistribuido(l)) distribuidos += 1;
      if (isLeadCarteiraPropria(l, user?.id)) meus += 1;
    }
    return { chegaram, distribuidos, meus, todos: leads.length };
  }, [leads, user?.id, isGerente]);

  const kpiCounts = useMemo(() => {
    let alta = 0;
    let novos = 0;
    for (const l of leads) {
      if (l.prioridade === "Alta") alta += 1;
      const stage = funnelStages.find((s) => s.id === l.stage);
      if (stage?.papel === "inicial" || l.stage === "novo") novos += 1;
    }
    return {
      total: leads.length,
      alta,
      novos,
      chegaram: distribuicaoCounts.chegaram,
      distribuidos: distribuicaoCounts.distribuidos,
      meus: distribuicaoCounts.meus,
    };
  }, [leads, funnelStages, distribuicaoCounts]);

  /** Contagem de leads ativos por corretor (respeita demais filtros, ignora filtro de corretor). */
  const leadsAtivosPorCorretor = useMemo(() => {
    if (isCorretor) return [];

    const q = debouncedSearch.toLowerCase();
    const qDigits = phoneDigits(debouncedSearch);
    const equipeMembros =
      equipeFilter === "all" || equipeFilter === "none"
        ? null
        : new Set(
            equipes
              .find((e) => e.id === equipeFilter)
              ?.membros.map((m) => m.id) ?? [],
          );
    const anyEquipeMembroIds =
      equipeFilter === "none"
        ? new Set(equipes.flatMap((e) => e.membros.map((m) => m.id)))
        : null;

    const scoped = leads.filter((l) => {
      if (q) {
        const hay = `${l.nome} ${l.email} ${l.telefone}`.toLowerCase();
        const phoneOk =
          qDigits.length >= 3 && phoneDigits(l.telefone).includes(qDigits);
        if (!hay.includes(q) && !phoneOk) return false;
      }
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (canFilterEquipe && equipeFilter === "none") {
        if (l.equipeId) return false;
        if (l.corretorId && anyEquipeMembroIds?.has(l.corretorId)) return false;
      } else if (canFilterEquipe && equipeFilter !== "all") {
        const inPool = l.equipeId === equipeFilter;
        const inMembros =
          Boolean(l.corretorId) && Boolean(equipeMembros?.has(l.corretorId!));
        if (!inPool && !inMembros) return false;
      }
      if (prioridadeFilter !== "all" && l.prioridade !== prioridadeFilter)
        return false;
      if (tipoRendaFilter !== "all" && (l.tipoRenda || "") !== tipoRendaFilter)
        return false;
      if (origemFilter !== "all" && l.origem !== origemFilter) return false;
      return true;
    });

    const byId = new Map<string, { id: string; name: string; count: number }>();
    // Gerente: só chips da própria equipe (mesma lista do select de filtro).
    for (const a of corretorFilterOptions) {
      byId.set(a.id, { id: a.id, name: a.name, count: 0 });
    }

    let naoDistribuidos = 0;
    let equipeSemCorretor = 0;
    for (const l of scoped) {
      if (!l.corretorId) {
        if (!l.equipeId) naoDistribuidos += 1;
        else equipeSemCorretor += 1;
        continue;
      }
      const existing = byId.get(l.corretorId);
      if (existing) {
        existing.count += 1;
      } else if (!isGerente) {
        // Admin/analista: inclui corretores que aparecem nos leads.
        byId.set(l.corretorId, {
          id: l.corretorId,
          name: l.corretor || "Corretor",
          count: 1,
        });
      }
    }

    const rows = [...byId.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"),
    );
    if (naoDistribuidos > 0) {
      rows.push({
        id: "__none__",
        name: "Sem corretor atribuído",
        count: naoDistribuidos,
      });
    }
    if (equipeSemCorretor > 0) {
      rows.push({
        id: "__equipe_pool__",
        name: "Na equipe sem corretor",
        count: equipeSemCorretor,
      });
    }
    return rows;
  }, [
    isCorretor,
    isGerente,
    leads,
    debouncedSearch,
    stageFilter,
    equipeFilter,
    equipes,
    prioridadeFilter,
    tipoRendaFilter,
    origemFilter,
    canFilterEquipe,
    corretorFilterOptions,
  ]);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStageFilter("all");
    setCorretorFilter("all");
    setEquipeFilter("all");
    setPrioridadeFilter("all");
    setTipoRendaFilter("all");
    setOrigemFilter("all");
    setDistribuicaoFilter("all");
    setParadosFilter(false);
    void navigate({ to: "/leads", search: {}, replace: true });
  }

  function equipeLabel(lead: Lead): string {
    if (lead.equipe) return lead.equipe;
    if (lead.corretorId) {
      const eq = equipes.find((e) =>
        e.membros.some((m) => m.id === lead.corretorId),
      );
      if (eq) return eq.name;
    }
    return "—";
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setPlatformLeadTab("empresa");
    // Sem vínculo: lead fica no pool do admin para distribuição.
    setForm({
      ...emptyForm(),
      equipeId: "",
      corretorId: "",
    });
    setOpen(true);
  }

  function openEdit(lead: Lead) {
    setFormMode("edit");
    setEditingId(lead.id);
    setPlatformLeadTab("empresa");
    const next = leadToForm(lead);
    if (!next.equipeId && lead.corretorId) {
      const eq = equipesAtivas.find((e) =>
        e.membros.some((m) => m.id === lead.corretorId),
      );
      if (eq) next.equipeId = eq.id;
    }
    setForm(next);
    setOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setProspeccao(
    key: keyof FormState["prospeccao"],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      prospeccao: { ...prev.prospeccao, [key]: value },
    }));
  }

  async function copyLeadPhone(telefone: string) {
    const value = formatPhone(telefone).trim() || telefone.trim();
    if (!phoneDigits(value)) {
      toast.error("Este lead não tem telefone.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Telefone copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  function openLeadWhatsApp(telefone: string) {
    const digits = phoneDigits(telefone);
    if (digits.length < 10) {
      toast.error("Este lead não tem telefone.");
      return;
    }
    const e164 = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(`https://wa.me/${e164}`, "_blank", "noopener,noreferrer");
  }

  function openLeadMaps(lead: Lead) {
    const url = googleMapsSearchUrl(
      lead.prospeccao?.endereco,
      lead.bairro,
      lead.cidade,
    );
    if (!url) {
      toast.error("Este lead não tem endereço no cadastro.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();

    if (!nome || !telefone) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido ou deixe em branco.");
      return;
    }
    if (!isValidPhone(telefone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (form.origem && !origemOptions.includes(form.origem)) {
      toast.error("Selecione uma origem válida ou deixe em branco.");
      return;
    }

    const rendaParsed = parseOptionalMoneyInput(String(form.renda));
    const rendaNum =
      rendaParsed != null ? Math.round(rendaParsed) : null;
    const orcamentoParsed = parseOptionalMoneyInput(String(form.orcamentoMax));
    const orcamentoMax =
      orcamentoParsed != null ? Math.round(orcamentoParsed) : null;
    const quartosMin = form.quartosMin.trim()
      ? Number.parseInt(form.quartosMin, 10)
      : null;
    const vagasMin = form.vagasMin.trim()
      ? Number.parseInt(form.vagasMin, 10)
      : null;
    const otherTags =
      formMode === "edit" && editingId
        ? (leads
            .find((l) => l.id === editingId)
            ?.tags.filter((t) => !["Quente", "Morno", "Frio"].includes(t)) ??
          [])
        : [];
    const tags = [form.temperatura, ...otherTags];
    const emailFinal =
      email || `contato.${phoneDigits(telefone)}@sem-email.local`;
    const origemFinal = form.origem.trim() || "Não informado";

    let equipeId: string | null | undefined;
    let corretorId: string | null | undefined;
    if (isCorretor) {
      equipeId = undefined;
      corretorId = undefined;
    } else if (isAdmin || isGerente) {
      const wantsPool = form.corretorId === "__pool__";
      const hasCorretor =
        Boolean(form.corretorId) &&
        form.corretorId !== "__pool__" &&
        form.corretorId !== "__none__";

      if (!form.equipeId && !hasCorretor && !wantsPool) {
        if (isGerente && !gerenteVerLeadsGerais) {
          const poolEquipe =
            equipesAtivas.find((e) => e.gerenteId === user?.id)?.id ?? "";
          if (!poolEquipe) {
            toast.error(
              "Selecione a sua equipe. Sem a opção do admin, o gerente não acessa o pool geral.",
            );
            return;
          }
          equipeId = poolEquipe;
          corretorId = null;
        } else {
          equipeId = null;
          corretorId = null;
        }
      } else if (wantsPool) {
        const poolEquipe =
          form.equipeId ||
          (isGerente
            ? (equipesAtivas.find((e) => e.gerenteId === user?.id)?.id ?? "")
            : "");
        if (!poolEquipe) {
          toast.error(
            "Para deixar no pool, selecione o gerente/equipe responsável.",
          );
          return;
        }
        equipeId = poolEquipe;
        corretorId = null;
      } else {
        equipeId = form.equipeId || null;
        corretorId = hasCorretor ? form.corretorId : null;
      }
    }

    try {
      if (formMode === "edit" && editingId) {
        await updateLead(editingId, {
          nome,
          telefone,
          email: emailFinal,
          origem: origemFinal,
          interesse: form.interesse,
          cidade: form.cidade.trim(),
          bairro: form.bairro.trim(),
          prioridade: form.prioridade,
          renda: rendaNum,
          tipoRenda: form.tipoRenda.trim() || null,
          estadoCivil: form.estadoCivil.trim() || null,
          cpf: form.cpf.trim() || null,
          rg: form.rg.trim() || null,
          endereco: form.endereco.trim() || null,
          cep: form.cep.trim() || null,
          orcamentoMax,
          quartosMin: Number.isFinite(quartosMin) ? quartosMin : null,
          vagasMin: Number.isFinite(vagasMin) ? vagasMin : null,
          tags,
          ...(isPlatformAdmin
            ? { prospeccao: formProspeccaoToPayload(form.prospeccao) }
            : {}),
          ...(equipeId !== undefined ? { equipeId } : {}),
          ...(corretorId !== undefined ? { corretorId } : {}),
          ...(form.createdAt ? { createdAt: form.createdAt } : {}),
        });
        setOpen(false);
        toast.success(`Lead ${nome} atualizado.`);
        return;
      }

      await addLead({
        tipo: "lead",
        nome,
        telefone,
        email: emailFinal,
        origem: origemFinal,
        interesse: form.interesse,
        cidade: form.cidade.trim(),
        bairro: form.bairro.trim(),
        prioridade: form.prioridade,
        ...(rendaNum != null ? { renda: rendaNum } : {}),
        ...(form.tipoRenda.trim() ? { tipoRenda: form.tipoRenda.trim() } : {}),
        ...(form.estadoCivil.trim()
          ? { estadoCivil: form.estadoCivil.trim() }
          : {}),
        ...(form.cpf.trim() ? { cpf: form.cpf.trim() } : {}),
        ...(form.rg.trim() ? { rg: form.rg.trim() } : {}),
        ...(form.endereco.trim() ? { endereco: form.endereco.trim() } : {}),
        ...(form.cep.trim() ? { cep: form.cep.trim() } : {}),
        ...(orcamentoMax != null ? { orcamentoMax } : {}),
        ...(Number.isFinite(quartosMin) && quartosMin != null
          ? { quartosMin }
          : {}),
        ...(Number.isFinite(vagasMin) && vagasMin != null ? { vagasMin } : {}),
        ...(isPlatformAdmin
          ? { prospeccao: formProspeccaoToPayload(form.prospeccao) }
          : {}),
        tags,
        ...(equipeId !== undefined ? { equipeId } : {}),
        ...(corretorId !== undefined ? { corretorId } : {}),
        ...(form.createdAt ? { createdAt: form.createdAt } : {}),
      });
      setOpen(false);
      toast.success(`Lead ${nome} criado com sucesso.`);
    } catch (err) {
      toast.error(userFacingError(err, "Não foi possível salvar o lead."));
    }
  }

  const allVisibleIds = useMemo(
    () => filteredLeads.map((l) => l.id),
    [filteredLeads],
  );
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(allVisibleIds) : new Set());
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteLead) return;
    const motivo =
      deleteMotivo === "__outro__"
        ? deleteMotivoOutro.trim()
        : deleteMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da exclusão.");
      return;
    }
    try {
      const id = deleteLead.id;
      const nome = deleteLead.nome;
      setDeleteLead(null);
      setDeleteMotivo("");
      setDeleteMotivoOutro("");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(`Lead ${nome} movido para Leads Perdidos.`);
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível excluir o lead.",
      );
    }
  }

  async function confirmBulkDelete() {
    const motivo =
      bulkMotivo === "__outro__" ? bulkMotivoOutro.trim() : bulkMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da exclusão.");
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleteOpen(false);
    setBulkMotivo("");
    setBulkMotivoOutro("");
    setBulkDeleting(true);
    try {
      const result = await markLeadsLost(ids, motivo);
      setSelectedIds(new Set());
      if (detailLead && ids.includes(detailLead.id)) setDetailLead(null);
      if (result.skipped === 0) {
        toast.success(
          result.updated === 1
            ? "1 lead movido para Leads Perdidos."
            : `${result.updated} leads movidos para Leads Perdidos.`,
        );
      } else {
        toast.error(
          `${result.updated} excluído(s), ${result.skipped} com erro.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir os leads.",
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  function openAtividade(lead: Lead) {
    if (!canWriteTriagem || !canAgenda) return;
    const stageName =
      funnelStages.find((s) => s.id === lead.stage)?.name ?? lead.stage;
    setAtividadePrompt({
      leadId: lead.id,
      leadNome: lead.nome,
      stage: lead.stage,
      stageName,
    });
  }

  async function afterAtividadeCreated(leadId: string) {
    try {
      const next = mapApiLead(await fetchLeadById(leadId));
      applyLead(next);
      setDetailLead((cur) => (cur?.id === leadId ? next : cur));
    } catch {
      void refresh();
    }
  }

  async function handleImportFile(file: File) {
    setImportParsing(true);
    setImportFileName(file.name);
    try {
      const rows = await parseLeadsFromFile(file, {
        origem: origemOptions[0] ?? "Importação",
      });
      if (rows.length === 0) {
        toast.error("Nenhum lead encontrado no arquivo.");
        return;
      }
      let existing: ImportExistingIndex = { phones: {}, emails: {} };
      try {
        existing = await checkImportDuplicates({
          telefones: rows
            .map((r) => r.telefone)
            .filter((t) => t.trim())
            .slice(0, 600),
          emails: rows
            .map((r) => r.email)
            .filter((e) => e.trim())
            .slice(0, 600),
          tipo: "lead",
        });
      } catch {
        toast.message(
          "Não foi possível conferir duplicados agora. Os válidos ainda podem ser importados; a base bloqueia telefone/e-mail já cadastrado.",
        );
      }
      setImportExisting(existing);
      setImportRows(applyImportConflictErrors(rows, existing, "lead"));
      setImportEditingInvalids(false);
      setImportOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível ler o arquivo.",
      );
    } finally {
      setImportParsing(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function patchImportRow(
    index: number,
    patch: Partial<Pick<ParsedImportLead, "nome" | "telefone" | "email" | "cidade" | "origem">>,
  ) {
    setImportRows((prev) =>
      applyImportConflictErrors(
        prev.map((row, i) =>
          i === index ? { ...row, ...patch } : row,
        ),
        importExisting,
        "lead",
      ),
    );
  }

  async function confirmImport() {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast.error("Nenhum lead válido para importar.");
      return;
    }
    const MAX_IMPORT = 600;
    const batch = valid.slice(0, MAX_IMPORT);
    if (valid.length > MAX_IMPORT) {
      toast.message(
        `A importação aceita no máximo ${MAX_IMPORT} registros por vez. Os demais não foram enviados.`,
      );
    }
    setImportSaving(true);
    try {
      const result = await importLeads(
        batch.map((r) => {
          const prospeccao = compactProspeccao(r.prospeccao);
          return {
          nome: r.nome,
          telefone: r.telefone,
          email: r.email || undefined,
          origem: r.origem || origemOptions[0] || "Importação",
          interesse: r.interesse,
          cidade: r.cidade || undefined,
          bairro: r.bairro || undefined,
          prioridade: r.prioridade,
          renda: r.renda,
            ...(prospeccao ? { prospeccao } : {}),
          };
        }),
      );
      setImportOpen(false);
      setImportRows([]);
      setImportEditingInvalids(false);
      await refresh({ silent: true });
      await refreshCatalog({ silent: true });
      if (result.failed > 0) {
        const sample = result.errors
          .slice(0, 3)
          .map((e) => `${e.nome}: ${e.message}`)
          .join(" · ");
        toast.error(
          `${result.created} importado(s), ${result.failed} com erro.${
            sample ? ` ${sample}` : ""
          }`,
        );
      } else {
        toast.success(`${result.created} lead(s) importado(s).`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível importar os leads.",
      );
    } finally {
      setImportSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={
          isCorretor ? "Meus leads" : isPlatformAdmin ? "Empresas" : "Leads"
        }
        description={
          loading
            ? "Carregando leads..."
            : filteredLeads.length === leads.length && !filtersActive
              ? isCorretor
                ? `${leads.length} leads atribuídos a você`
                : isGerente
                  ? `${leads.length} leads (equipe + pool do admin)`
                  : isPlatformAdmin
                    ? `${leads.length} empresas no funil`
                    : `${leads.length} leads de toda a equipe no funil`
              : `${filteredLeads.length} de ${leads.length} leads`
        }
        actions={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportHelpOpen(false);
                    void handleImportFile(file);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={importParsing}
                onClick={() => setImportHelpOpen(true)}
                className={SOFT_BTN}
                data-guia="leads-importar"
              >
                {importParsing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Importar
              </Button>
              {canDistribuir && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDistribuirOpen(true)}
                  className={SOFT_BTN}
                  data-guia="leads-distribuir"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Distribuir
                </Button>
              )}
              {canExportLeads ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filteredLeads.length === 0}
                    className={SOFT_BTN}
                    data-guia="leads-exportar"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportLeadsToExcel(
                        filteredLeads,
                        `leads-${new Date().toISOString().slice(0, 10)}.xlsx`,
                      )
                    }
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportLeadsToPdf(
                        filteredLeads,
                        `leads-${new Date().toISOString().slice(0, 10)}.pdf`,
                        user?.tenant?.name?.trim() || "Imobiliária",
                      )
                    }
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              ) : null}
              {selectedCount > 0 && canDeleteLeads && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkDeleting}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  {bulkDeleting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Excluir ({selectedCount})
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={openCreate}
              className={cn(LEADS_GRADIENT_BTN, "shrink-0")}
              style={LEADS_GRADIENT_STYLE}
              data-guia="leads-novo"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo lead
            </Button>
          </div>
        }
      />

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        className={isPlatformAdmin ? "max-w-3xl" : undefined}
        icon={
          formMode === "edit" ? (
            <Pencil className="w-5 h-5" />
          ) : isPlatformAdmin ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )
        }
        title={
          formMode === "edit"
            ? isPlatformAdmin
              ? "Editar empresa"
              : "Editar lead"
            : isPlatformAdmin
              ? "Nova empresa"
              : "Novo lead"
        }
        description={
          formMode === "edit"
            ? isPlatformAdmin
              ? "Atualize cada seção da ficha de prospecção."
              : "Atualize os dados do contato no funil."
            : isPlatformAdmin
              ? "Preencha cada seção: empresa, localização, digital, operação e fit."
            : "Preencha os dados para adicionar o contato ao funil."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody className={isPlatformAdmin ? "bg-muted/40" : undefined}>
            {isPlatformAdmin ? (
              <>
                <Tabs
                  value={platformLeadTab}
                  onValueChange={(value) =>
                    setPlatformLeadTab(value as PlatformLeadTab)
                  }
                >
                  <TabsList className="mb-1 flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
                    <TabsTrigger
                      value="empresa"
                      className="gap-1.5 rounded-full px-3"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Empresa
                    </TabsTrigger>
                    <TabsTrigger
                      value="localizacao"
                      className="gap-1.5 rounded-full px-3"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Local
                    </TabsTrigger>
                    <TabsTrigger
                      value="digital"
                      className="gap-1.5 rounded-full px-3"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Digital
                    </TabsTrigger>
                    <TabsTrigger
                      value="operacao"
                      className="gap-1.5 rounded-full px-3"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Operação
                    </TabsTrigger>
                    <TabsTrigger
                      value="fit"
                      className="gap-1.5 rounded-full px-3"
                    >
                      <Target className="h-3.5 w-3.5" />
                      Fit
                    </TabsTrigger>
                    <TabsTrigger
                      value="funil"
                      className="gap-1.5 rounded-full px-3"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Funil
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="empresa" className="mt-4">
                <FormSection
                  icon={<Building2 className="w-3.5 h-3.5 text-primary" />}
                  title="Empresa"
                  description="Identificação e contato de quem decide."
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lead-nome"
                      className="text-xs text-muted-foreground"
                    >
                      Empresa{" "}
                      <span className="text-destructive" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Input
                      id="lead-nome"
                      value={form.nome}
                      onChange={(e) => setField("nome", e.target.value)}
                      placeholder="Ex.: Âncora Imobiliária"
                      className="h-10 bg-background"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lead-telefone"
                        className="text-xs text-muted-foreground"
                      >
                        Telefone / WhatsApp{" "}
                        <span className="text-destructive" aria-hidden="true">
                          *
                        </span>
                      </Label>
                      <Input
                        id="lead-telefone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={form.telefone}
                        onChange={(e) =>
                          setField("telefone", formatPhone(e.target.value))
                        }
                        placeholder={PHONE_PLACEHOLDER}
                        className="h-10 bg-background"
                        maxLength={15}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lead-email"
                        className="text-xs text-muted-foreground"
                      >
                        E-mail{" "}
                        <span className="font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="lead-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Quem abordar
                      </Label>
                      <Input
                        value={form.prospeccao.quemAbordar}
                        onChange={(e) =>
                          setProspeccao("quemAbordar", e.target.value)
                        }
                        placeholder="Dono, gestor comercial, diretor…"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Responsável interno
                      </Label>
                      <div className="h-10 px-3 rounded-md border bg-muted/40 text-sm flex items-center text-muted-foreground">
                        {user?.name ?? "—"}
                      </div>
                    </div>
                  </div>
                </FormSection>
                  </TabsContent>

                  <TabsContent value="localizacao" className="mt-4">
                <FormSection
                  icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
                  title="Localização"
                  description="Onde a operação está."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lead-cidade"
                        className="text-xs text-muted-foreground"
                      >
                        Município
                      </Label>
                      <Input
                        id="lead-cidade"
                        value={form.cidade}
                        onChange={(e) => setField("cidade", e.target.value)}
                        placeholder="Ex.: Recife"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lead-bairro"
                        className="text-xs text-muted-foreground"
                      >
                        Bairro / Região
                      </Label>
                      <Input
                        id="lead-bairro"
                        value={form.bairro}
                        onChange={(e) => setField("bairro", e.target.value)}
                        placeholder="Ex.: Boa Viagem"
                        className="h-10 bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lead-endereco"
                      className="text-xs text-muted-foreground"
                    >
                      Endereço
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="lead-endereco"
                        value={form.prospeccao.endereco}
                        onChange={(e) =>
                          setProspeccao("endereco", e.target.value)
                        }
                        placeholder="Rua, número, sala"
                        className="h-10 bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0"
                        disabled={
                          !googleMapsSearchUrl(
                            form.prospeccao.endereco,
                            form.bairro,
                            form.cidade,
                          )
                        }
                        title="Abrir no Google Maps"
                        onClick={() => {
                          const url = googleMapsSearchUrl(
                            form.prospeccao.endereco,
                            form.bairro,
                            form.cidade,
                          );
                          if (url) {
                            window.open(url, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Maps
                      </Button>
                    </div>
                  </div>
                </FormSection>
                  </TabsContent>

                  <TabsContent value="digital" className="mt-4">
                <FormSection
                  icon={<Globe className="w-3.5 h-3.5 text-primary" />}
                  title="Presença digital"
                  description="Canais públicos para abordagem."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        Site
                      </Label>
                      <Input
                        value={form.prospeccao.site}
                        onChange={(e) => setProspeccao("site", e.target.value)}
                        placeholder="https://"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Instagram
                      </Label>
                      <Input
                        value={form.prospeccao.instagram}
                        onChange={(e) =>
                          setProspeccao("instagram", e.target.value)
                        }
                        placeholder="https://instagram.com/..."
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        LinkedIn
                      </Label>
                      <Input
                        value={form.prospeccao.linkedin}
                        onChange={(e) =>
                          setProspeccao("linkedin", e.target.value)
                        }
                        placeholder="https://linkedin.com/company/..."
                        className="h-10 bg-background"
                      />
                    </div>
                  </div>
                </FormSection>
                  </TabsContent>

                  <TabsContent value="operacao" className="mt-4">
                <FormSection
                  icon={<Link2 className="w-3.5 h-3.5 text-primary" />}
                  title="Operação"
                  description="O que a empresa vende e qual stack usa hoje."
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Atuação / Serviços
                    </Label>
                    <Input
                      value={form.prospeccao.atuacao}
                      onChange={(e) =>
                        setProspeccao("atuacao", e.target.value)
                      }
                      placeholder="Venda, locação, lançamentos…"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["lancamentos", "Lançamentos"],
                        ["usados", "Usados"],
                        ["locacao", "Locação"],
                        ["administracao", "Administração"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {label}
                        </Label>
                        <Select
                          value={form.prospeccao[key] || "__none__"}
                          onValueChange={(v) =>
                            setProspeccao(key, v === "__none__" ? "" : v)
                          }
                        >
                          <SelectTrigger className="h-10 bg-background">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {PROSPECCAO_SIM_NAO.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        CRM identificado
                      </Label>
                      <Input
                        value={form.prospeccao.crmIdentificado}
                        onChange={(e) =>
                          setProspeccao("crmIdentificado", e.target.value)
                        }
                        placeholder="Kenlo, Vista, nenhum…"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Tecnologia identificada
                      </Label>
                      <Input
                        value={form.prospeccao.tecnologia}
                        onChange={(e) =>
                          setProspeccao("tecnologia", e.target.value)
                        }
                        className="h-10 bg-background"
                      />
                    </div>
                  </div>
                </FormSection>
                  </TabsContent>

                  <TabsContent value="fit" className="mt-4">
                <FormSection
                  icon={<Target className="w-3.5 h-3.5 text-primary" />}
                  title="Fit comercial"
                  description="Produto Zone e o quanto a conta vale a abordagem."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Produto indicado
                      </Label>
                      <Input
                        value={form.prospeccao.produtoIndicado}
                        onChange={(e) =>
                          setProspeccao("produtoIndicado", e.target.value)
                        }
                        placeholder="CRM + IA SDR + Landing"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Fit (0–10)
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={form.prospeccao.fit}
                        onChange={(e) => setProspeccao("fit", e.target.value)}
                        placeholder="8.5"
                        className="h-10 bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Sinais para prospecção
                    </Label>
                    <Textarea
                      value={form.prospeccao.sinais}
                      onChange={(e) =>
                        setProspeccao("sinais", e.target.value)
                      }
                      placeholder="Volume de leads, equipe, presença digital…"
                      className="min-h-20 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Motivo do fit
                    </Label>
                    <Textarea
                      value={form.prospeccao.motivoFit}
                      onChange={(e) =>
                        setProspeccao("motivoFit", e.target.value)
                      }
                      placeholder="Por que esta conta entra agora."
                      className="min-h-20 bg-background"
                    />
                  </div>
                </FormSection>
                  </TabsContent>

                  <TabsContent value="funil" className="mt-4">
                <FormSection
                  icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                  title="Qualificação no funil"
                  description="Prioridade da abordagem e origem da pesquisa."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Origem / fonte
                      </Label>
                      <Select
                        value={form.origem || "__none__"}
                        onValueChange={(v) =>
                          setField("origem", v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem origem</SelectItem>
                          {origemOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                          {formMode === "edit" &&
                            form.origem &&
                            !origemOptions.includes(form.origem) && (
                              <SelectItem value={form.origem}>
                                {form.origem}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Data de cadastro
                      </Label>
                      <Input
                        type="date"
                        value={form.createdAt}
                        onChange={(e) => setField("createdAt", e.target.value)}
                        className="h-10 bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Prioridade
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          value: "Alta" as const,
                          active:
                            "border-red-300 bg-red-100 text-red-800 shadow-sm ring-1 ring-red-200/80",
                          idle: "hover:border-red-200 hover:bg-red-50 hover:text-red-700",
                        },
                        {
                          value: "Média" as const,
                          active:
                            "border-amber-300 bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200/80",
                          idle: "hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800",
                        },
                        {
                          value: "Baixa" as const,
                          active:
                            "border-sky-300 bg-sky-100 text-sky-800 shadow-sm ring-1 ring-sky-200/80",
                          idle: "hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField("prioridade", opt.value)}
                          className={cn(
                            "h-10 rounded-lg border text-sm font-medium transition-colors",
                            form.prioridade === opt.value
                              ? opt.active
                              : cn(
                                  "bg-background text-muted-foreground",
                                  opt.idle,
                                ),
                          )}
                        >
                          {opt.value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Temperatura
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          value: "Quente" as const,
                          active:
                            "border-orange-300 bg-orange-100 text-orange-900 shadow-sm ring-1 ring-orange-200/80",
                          idle: "hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800",
                        },
                        {
                          value: "Morno" as const,
                          active:
                            "border-yellow-300 bg-yellow-100 text-yellow-900 shadow-sm ring-1 ring-yellow-200/80",
                          idle: "hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-800",
                        },
                        {
                          value: "Frio" as const,
                          active:
                            "border-cyan-300 bg-cyan-100 text-cyan-900 shadow-sm ring-1 ring-cyan-200/80",
                          idle: "hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField("temperatura", opt.value)}
                          className={cn(
                            "h-10 rounded-lg border text-sm font-medium transition-colors",
                            form.temperatura === opt.value
                              ? opt.active
                              : cn(
                                  "bg-background text-muted-foreground",
                                  opt.idle,
                                ),
                          )}
                        >
                          {opt.value}
                        </button>
                      ))}
                    </div>
                  </div>
                </FormSection>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <>
            <FormSection
              icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
              title="Contato"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="lead-nome"
                  className="text-xs text-muted-foreground"
                >
                  {isPlatformAdmin ? "Empresa" : "Nome completo"}{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="lead-nome"
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  placeholder={
                    isPlatformAdmin
                      ? "Ex.: Âncora Imobiliária"
                      : "Ex.: João Pereira"
                  }
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-telefone"
                    className="text-xs text-muted-foreground"
                  >
                    Telefone{" "}
                    <span className="text-destructive" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Input
                    id="lead-telefone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setField("telefone", formatPhone(e.target.value))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    className="h-10 bg-background"
                    maxLength={15}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-email"
                    className="text-xs text-muted-foreground"
                  >
                    E-mail <span className="font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="email@exemplo.com"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Origem <span className="font-normal">(opcional)</span>
                  </Label>
                  <Select
                    value={form.origem || "__none__"}
                    onValueChange={(v) =>
                      setField("origem", v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem origem</SelectItem>
                      {origemOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                      {formMode === "edit" &&
                        form.origem &&
                        !origemOptions.includes(form.origem) && (
                          <SelectItem value={form.origem}>
                            {form.origem}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                {(isAdmin || isGerente) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Equipe / gerente{" "}
                      <span className="font-normal">(opcional)</span>
                    </Label>
                    <Select
                      value={form.equipeId || "__none__"}
                      onValueChange={(v) => {
                        const equipeId = v === "__none__" ? "" : v;
                        setForm((prev) => ({
                          ...prev,
                          equipeId,
                          corretorId: "",
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Sem equipe (pool admin)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Sem equipe (pool admin)
                        </SelectItem>
                        {equipesAtivas.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.gerente.name}
                            {eq.name ? ` · ${eq.name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!isCorretor ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Corretor <span className="font-normal">(opcional)</span>
                    </Label>
                    <Select
                      value={form.corretorId || "__none__"}
                      onValueChange={(v) =>
                        setField("corretorId", v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Sem corretor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem corretor</SelectItem>
                        {form.equipeId && (
                          <SelectItem value="__pool__">
                            Pool da equipe (sem corretor)
                          </SelectItem>
                        )}
                        {formCorretorOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Responsável
                    </Label>
                    <div className="h-10 px-3 rounded-md border bg-muted/40 text-sm flex items-center text-muted-foreground">
                      {user?.name ?? "—"}
                    </div>
                  </div>
                )}
              </div>
              {(isAdmin || isGerente) && (
                <p className="text-[11px] text-muted-foreground">
                  {isGerente && !gerenteVerLeadsGerais
                    ? "Sem a opção do admin, o gerente só opera a própria equipe — sem o pool geral."
                    : "Sem equipe = pool do admin. Admin e gerentes podem distribuir depois para qualquer equipe ou corretor."}
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Data de cadastro
                </Label>
                <Input
                  type="date"
                  value={form.createdAt}
                  onChange={(e) => setField("createdAt", e.target.value)}
                  className="h-10 bg-background"
                />
              </div>
            </FormSection>

            <FormSection
              icon={<FileText className="w-3.5 h-3.5 text-primary" />}
              title="Para contratos"
              description="Opcional. Se preencher, o contrato já sai com CPF, RG e endereço."
            >
              <ContatoContratoFields
                idPrefix="lead"
                values={{
                  cpf: form.cpf,
                  rg: form.rg,
                  endereco: form.endereco,
                  cep: form.cep,
                }}
                onChange={(patch) =>
                  setForm((prev) => ({ ...prev, ...patch }))
                }
              />
            </FormSection>

            <FormSection
              icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
              title="Renda"
            >
              {isPlatformAdmin ? null : (
              <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lead-renda"
                  className="text-xs text-muted-foreground"
                >
                  Renda mensal <span className="font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="lead-renda"
                    inputMode="numeric"
                    value={form.renda}
                    onChange={(e) =>
                      setField("renda", maskMoneyInput(e.target.value))
                    }
                    placeholder="0,00"
                    className="h-10 bg-background pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lead-tipo-renda"
                  className="text-xs text-muted-foreground"
                >
                  Tipo de renda <span className="font-normal">(opcional)</span>
                </Label>
                <Select
                  value={form.tipoRenda || "__none__"}
                  onValueChange={(v) =>
                    setField("tipoRenda", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger id="lead-tipo-renda" className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {TIPO_RENDA_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lead-estado-civil"
                  className="text-xs text-muted-foreground"
                >
                  Estado civil <span className="font-normal">(opcional)</span>
                </Label>
                <Select
                  value={form.estadoCivil || "__none__"}
                  onValueChange={(v) =>
                    setField("estadoCivil", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger id="lead-estado-civil" className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="Solteiro">Solteiro</SelectItem>
                    <SelectItem value="Casado">Casado</SelectItem>
                    <SelectItem value="Divorciado">Divorciado</SelectItem>
                    <SelectItem value="Viúvo">Viúvo</SelectItem>
                    <SelectItem value="União estável">União estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lead-orcamento"
                  className="text-xs text-muted-foreground"
                >
                  Orçamento máx. <span className="font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="lead-orcamento"
                    inputMode="numeric"
                    value={form.orcamentoMax}
                    onChange={(e) =>
                      setField("orcamentoMax", maskMoneyInput(e.target.value))
                    }
                    placeholder="0,00"
                    className="h-10 bg-background pl-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-quartos-min"
                    className="text-xs text-muted-foreground"
                  >
                    Quartos mín.
                  </Label>
                  <Input
                    id="lead-quartos-min"
                    inputMode="numeric"
                    value={form.quartosMin}
                    onChange={(e) =>
                      setField("quartosMin", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Ex.: 3"
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-vagas-min"
                    className="text-xs text-muted-foreground"
                  >
                    Vagas mín.
                  </Label>
                  <Input
                    id="lead-vagas-min"
                    inputMode="numeric"
                    value={form.vagasMin}
                    onChange={(e) =>
                      setField("vagasMin", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Ex.: 2"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Prioridade
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      value: "Alta" as const,
                      active:
                        "border-red-300 bg-red-100 text-red-800 shadow-sm ring-1 ring-red-200/80",
                      idle: "hover:border-red-200 hover:bg-red-50 hover:text-red-700",
                    },
                    {
                      value: "Média" as const,
                      active:
                        "border-amber-300 bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200/80",
                      idle: "hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800",
                    },
                    {
                      value: "Baixa" as const,
                      active:
                        "border-sky-300 bg-sky-100 text-sky-800 shadow-sm ring-1 ring-sky-200/80",
                      idle: "hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField("prioridade", opt.value)}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-medium transition-colors",
                        form.prioridade === opt.value
                          ? opt.active
                          : cn("bg-background text-muted-foreground", opt.idle),
                      )}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Temperatura
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      value: "Quente" as const,
                      active:
                        "border-orange-300 bg-orange-100 text-orange-900 shadow-sm ring-1 ring-orange-200/80",
                      idle: "hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800",
                    },
                    {
                      value: "Morno" as const,
                      active:
                        "border-yellow-300 bg-yellow-100 text-yellow-900 shadow-sm ring-1 ring-yellow-200/80",
                      idle: "hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-800",
                    },
                    {
                      value: "Frio" as const,
                      active:
                        "border-cyan-300 bg-cyan-100 text-cyan-900 shadow-sm ring-1 ring-cyan-200/80",
                      idle: "hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField("temperatura", opt.value)}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-medium transition-colors",
                        form.temperatura === opt.value
                          ? opt.active
                          : cn("bg-background text-muted-foreground", opt.idle),
                      )}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
              title="Localização"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-cidade"
                    className="text-xs text-muted-foreground"
                  >
                    Cidade
                  </Label>
                  <Input
                    id="lead-cidade"
                    value={form.cidade}
                    onChange={(e) => setField("cidade", e.target.value)}
                    placeholder="Ex.: Recife"
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lead-bairro"
                    className="text-xs text-muted-foreground"
                  >
                    Bairro
                  </Label>
                  <Input
                    id="lead-bairro"
                    value={form.bairro}
                    onChange={(e) => setField("bairro", e.target.value)}
                    placeholder="Ex.: Boa Viagem"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
            </FormSection>
              </>
            )}
          </FormDialogBody>

          <FormDialogActions
            hint={
              formMode === "edit" ? (
                "As alterações são salvas no banco."
              ) : isPlatformAdmin ? (
                <>A empresa entra na etapa{" "}
                  <span className="font-medium text-foreground">
                    {defaultStageName}
                  </span>
                  .
                </>
              ) : (
                <>
                  O lead entra na etapa{" "}
                  <span className="font-medium text-foreground">
                    {defaultStageName}
                  </span>
                  .
                </>
              )
            }
          >
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              {formMode === "edit" ? (
                "Salvar alterações"
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {isPlatformAdmin ? "Salvar empresa" : "Salvar lead"}
                </>
              )}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <LeadDetalheDialog
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(o) => !o && setDetailLead(null)}
        showCorretor={showTeamColumns}
        equipe={detailLead && showTeamColumns ? equipeLabel(detailLead) : null}
        showMeuLeadBadge={Boolean(
          isGerente &&
          detailLead &&
          isLeadCarteiraPropria(detailLead, user?.id),
        )}
        onAddAtividade={
          canWriteTriagem && canAgenda && detailLead
            ? () => openAtividade(detailLead)
            : undefined
        }
        footer={
          detailLead ? (
            <FormDialogActions>
              {canWriteTriagem &&
              canAgenda &&
              detailLead.monitoramento?.visual !== "vermelho" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => openAtividade(detailLead)}
                >
                  <CalendarClock className="w-4 h-4" />
                  Adicionar atividade
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setDetailLead(null)}
              >
                Fechar
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => {
                  const lead = detailLead;
                  setDetailLead(null);
                  openEdit(lead);
                }}
              >
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            </FormDialogActions>
          ) : null
        }
      />

      <LeadAtividadeDialog
        prompt={atividadePrompt}
        onClose={() => setAtividadePrompt(null)}
        onCreated={(leadId) => afterAtividadeCreated(leadId)}
      />

      <Dialog
        open={Boolean(contratoLead)}
        onOpenChange={(open) => {
          if (!open) setContratoLead(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contrato</DialogTitle>
            <DialogDescription>
              {contratoLead
                ? `Escolha o modelo. Os dados de ${contratoLead.nome} entram no formulário.`
                : "Escolha o modelo de contrato."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {contratoModelos.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-xl border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-primary/5"
                onClick={() => {
                  if (!contratoLead) return;
                  const leadId = contratoLead.id;
                  setContratoLead(null);
                  void navigate({
                    to: "/contratos",
                    search: { lead: leadId, modelo: template.id },
                  });
                }}
              >
                <div className="text-sm font-semibold">{template.titulo}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {template.descricao}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setContratoLead(null)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteLead}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteLead(null);
            setDeleteMotivo("");
            setDeleteMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Por que está excluindo este lead?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLead
                ? `${deleteLead.nome} sairá da sua lista e do funil, e irá para Leads Perdidos (visível só para o administrador).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={deleteMotivo}
              outroValue={deleteMotivoOutro}
              onChange={setDeleteMotivo}
              onOutroChange={setDeleteMotivoOutro}
              selectId="leads-lost-motivo"
              outroId="motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkDeleteOpen(false);
            setBulkMotivo("");
            setBulkMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedCount} lead(s) selecionado(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os leads sairão da lista e do funil, e irão para Leads Perdidos
              (visível só para o administrador). Informe o motivo da exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={bulkMotivo}
              outroValue={bulkMotivoOutro}
              onChange={setBulkMotivo}
              onOutroChange={setBulkMotivoOutro}
              selectId="leads-bulk-lost-motivo"
              outroId="leads-bulk-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmBulkDelete();
              }}
            >
              Excluir selecionados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className={cn(
          "mb-4 grid grid-cols-2 gap-3",
          isPlatformAdmin
            ? "lg:grid-cols-2"
            : isGerente
              ? "lg:grid-cols-5"
              : "lg:grid-cols-4",
        )}
      >
        <button
          type="button"
          className="min-w-0 cursor-pointer text-left"
          onClick={() => {
            setDistribuicaoFilter("all");
            setPrioridadeFilter("all");
            setStageFilter("all");
            setParadosFilter(false);
            void navigate({ to: "/leads", search: {}, replace: true });
          }}
        >
          <FinanceKpiCard
            label="Total de leads"
            value={kpiCounts.total}
            icon={Users}
            tone="blue-1"
            format="number"
            className={cn(
              distribuicaoFilter === "all" &&
                prioridadeFilter === "all" &&
                stageFilter === "all" &&
                !paradosFilter &&
                "shadow-md",
            )}
          />
        </button>
        {showTeamColumns ? (
          <>
            <button
              type="button"
              className="min-w-0 cursor-pointer text-left"
              data-guia="leads-chegaram"
              onClick={() => {
                setDistribuicaoFilter("chegaram");
                setPrioridadeFilter("all");
                setParadosFilter(false);
                void navigate({
                  to: "/leads",
                  search: { distribuicao: "chegaram" },
                  replace: true,
                });
              }}
            >
              <FinanceKpiCard
                label="Chegaram"
                value={kpiCounts.chegaram}
                icon={Inbox}
                tone="blue-2"
                format="number"
                className={cn(distribuicaoFilter === "chegaram" && "shadow-md")}
              />
            </button>
            <button
              type="button"
              className="min-w-0 cursor-pointer text-left"
              onClick={() => {
                setDistribuicaoFilter("distribuidos");
                setPrioridadeFilter("all");
                setParadosFilter(false);
                void navigate({
                  to: "/leads",
                  search: { distribuicao: "distribuidos" },
                  replace: true,
                });
              }}
            >
              <FinanceKpiCard
                label="Distribuídos"
                value={kpiCounts.distribuidos}
                icon={UserCheck}
                tone="blue-3"
                format="number"
                className={cn(
                  distribuicaoFilter === "distribuidos" && "shadow-md",
                )}
              />
            </button>
            {isGerente && (
              <button
                type="button"
                className="min-w-0 cursor-pointer text-left"
                onClick={() => {
                  setDistribuicaoFilter("meus");
                  setCorretorFilter("all");
                  setPrioridadeFilter("all");
                  setParadosFilter(false);
                  void navigate({
                    to: "/leads",
                    search: { distribuicao: "meus" },
                    replace: true,
                  });
                }}
              >
                <FinanceKpiCard
                  label="Meus leads"
                  value={kpiCounts.meus}
                  icon={Briefcase}
                  tone="blue-4"
                  format="number"
                  className={cn(distribuicaoFilter === "meus" && "shadow-md")}
                />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="min-w-0 cursor-pointer text-left"
            onClick={() => {
              const novoStage =
                funnelStages.find((s) => s.papel === "inicial")?.id ?? "novo";
              setStageFilter(stageFilter === novoStage ? "all" : novoStage);
              setPrioridadeFilter("all");
            }}
          >
            <FinanceKpiCard
              label="Novos na etapa"
              value={kpiCounts.novos}
              icon={Inbox}
              tone="blue-2"
              format="number"
              className={cn(
                (stageFilter === "novo" ||
                  funnelStages.find((s) => s.id === stageFilter)?.papel ===
                    "inicial") &&
                  "shadow-md",
              )}
            />
          </button>
        )}
        <button
          type="button"
          className="min-w-0 cursor-pointer text-left"
          onClick={() =>
            setPrioridadeFilter(prioridadeFilter === "Alta" ? "all" : "Alta")
          }
        >
          <FinanceKpiCard
            label="Prioridade alta"
            value={kpiCounts.alta}
            icon={Flame}
            tone={isCorretor ? "blue-3" : isGerente ? "blue-5" : "blue-4"}
            format="number"
            className={cn(prioridadeFilter === "Alta" && "shadow-md")}
          />
        </button>
        {isCorretor && (
          <button
            type="button"
            className="min-w-0 cursor-pointer text-left"
            onClick={() => {
              setStageFilter("all");
              setPrioridadeFilter("all");
              setDistribuicaoFilter("all");
            }}
          >
            <FinanceKpiCard
              label="Em atendimento"
              value={Math.max(0, kpiCounts.total - kpiCounts.novos)}
              icon={UserCheck}
              tone="blue-4"
              format="number"
            />
          </button>
        )}
      </div>

      <div className={cn("mb-4", FILTER_BAR_SURFACE)}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-55">
            <Search className={FILTER_SEARCH_ICON} />
            <Input
              placeholder="Buscar por nome, email, telefone..."
              className={cn("h-9 rounded-md pl-9", FILTER_CONTROL)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <TableSortSelect
            value={sort}
            onChange={setSort}
            className={FILTER_CONTROL}
          />
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className={cn("w-44 h-9", FILTER_CONTROL)}>
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas etapas</SelectItem>
              {funnelStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canFilterEquipe && (
            <Select value={equipeFilter} onValueChange={setEquipeFilter}>
              <SelectTrigger className={cn("w-44 h-9", FILTER_CONTROL)}>
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas equipes</SelectItem>
                <SelectItem value="none">Sem equipe</SelectItem>
                {equipes.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name}
                    {eq.leadsCount != null ? ` (${eq.leadsCount})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showTeamColumns && (
            <Select value={corretorFilter} onValueChange={setCorretorFilter}>
              <SelectTrigger className={cn("w-44 h-9", FILTER_CONTROL)}>
                <SelectValue placeholder="Corretor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos corretores</SelectItem>
                {leadsAtivosPorCorretor
                  .filter(
                    (r) => r.id === "__none__" || r.id === "__equipe_pool__",
                  )
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.count})
                    </SelectItem>
                  ))}
                {corretorFilterOptions.map((a) => {
                  const count =
                    leadsAtivosPorCorretor.find((r) => r.id === a.id)?.count ??
                    0;
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      {isGerente && a.id === user?.id
                        ? `${a.name} (eu)`
                        : a.name}{" "}
                      ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(SOFT_BTN, extraFiltersActive && "border-primary/40")}
            onClick={() => setShowExtraFilters((v) => !v)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Mais filtros
            {extraFiltersActive && (
              <Badge
                className="ml-1 h-5 px-1.5 text-[10px]"
                variant="secondary"
              >
                {
                  [prioridadeFilter, tipoRendaFilter, origemFilter].filter(
                    (v) => v !== "all",
                  ).length
                }
              </Badge>
            )}
          </Button>
          {(search ||
            stageFilter !== "all" ||
            corretorFilter !== "all" ||
            (canFilterEquipe && equipeFilter !== "all") ||
            distribuicaoFilter !== "all" ||
            paradosFilter ||
            extraFiltersActive) && (
            <Button
              variant="ghost"
              size="sm"
              className={FILTER_CLEAR_BTN}
              onClick={clearFilters}
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
          {showExtraFilters && (
            <div className="flex flex-wrap gap-2 w-full pt-2 border-t border-border/60 mt-1">
              <div className="space-y-1">
                <Label className={FILTER_LABEL}>Prioridade</Label>
                <Select
                  value={prioridadeFilter}
                  onValueChange={setPrioridadeFilter}
                >
                  <SelectTrigger className={cn("h-9 w-40", FILTER_CONTROL)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className={FILTER_LABEL}>Tipo de renda</Label>
                <Select
                  value={tipoRendaFilter}
                  onValueChange={setTipoRendaFilter}
                >
                  <SelectTrigger className={cn("h-9 w-44", FILTER_CONTROL)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {TIPO_RENDA_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className={FILTER_LABEL}>Origem</Label>
                <Select value={origemFilter} onValueChange={setOrigemFilter}>
                  <SelectTrigger className={cn("h-9 w-44", FILTER_CONTROL)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {origemOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTeamColumns && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/60 bg-card p-1">
            {(
              [
                {
                  id: "all" as const,
                  label: "Todos",
                  count: distribuicaoCounts.todos,
                  icon: null,
                },
                {
                  id: "chegaram" as const,
                  label: "Chegaram",
                  count: distribuicaoCounts.chegaram,
                  icon: Inbox,
                },
                {
                  id: "distribuidos" as const,
                  label: "Distribuídos",
                  count: distribuicaoCounts.distribuidos,
                  icon: UserCheck,
                },
                ...(isGerente
                  ? [
                      {
                        id: "meus" as const,
                        label: "Meus leads",
                        count: distribuicaoCounts.meus,
                        icon: Briefcase,
                      },
                    ]
                  : []),
              ] satisfies {
                id: DistribuicaoFilter;
                label: string;
                count: number;
                icon: LucideIcon | null;
              }[]
            ).map((opt) => {
              const Icon = opt.icon;
              const selected = distribuicaoFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDistribuicaoFilter(opt.id);
                    if (opt.id === "meus") setCorretorFilter("all");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    selected
                      ? "border-0 bg-transparent text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  style={selected ? LEADS_GRADIENT_STYLE : undefined}
                >
                  {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                  {opt.label}
                  <Badge
                    variant={selected ? "secondary" : "outline"}
                    className={cn(
                      "h-5 px-1.5 tabular-nums text-[11px]",
                      selected
                        ? "border-transparent bg-black/15 text-current"
                        : "border-transparent bg-primary/15 text-foreground",
                    )}
                  >
                    {opt.count}
                  </Badge>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {paradosFilter
              ? `Somente leads sem atualização há ${DIAS_PARADO} dias ou mais.`
              : distribuicaoFilter === "chegaram"
                ? "Leads no pool, ainda sem equipe nem corretor."
                : distribuicaoFilter === "distribuidos"
                  ? "Leads já atribuídos a uma equipe ou corretor."
                  : distribuicaoFilter === "meus"
                    ? "Somente leads da sua carteira, não os da equipe."
                    : "Visão completa do funil."}
          </p>
        </div>
      )}

      <Card className="min-w-0 overflow-hidden">
        <Table
          containerClassName="overflow-x-auto overflow-y-hidden overscroll-x-contain"
          className="w-full min-w-280 table-fixed text-[11px] leading-tight [&_th]:h-8 [&_th]:px-2.5 [&_th]:py-1 [&_th]:text-left [&_th]:whitespace-nowrap [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-left [&_td]:align-middle"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pr-0">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  aria-label="Selecionar todos os leads"
                  disabled={filteredLeads.length === 0 || bulkDeleting}
                />
              </TableHead>
              <TableHead className="w-[16%]">{isPlatformAdmin ? "Empresa" : "Lead"}</TableHead>
              <TableHead className="w-32">Origem</TableHead>
              <TableHead className="w-22 pr-4 text-center!">
                {isPlatformAdmin ? "Produto" : "Tipo de renda"}
              </TableHead>
              <TableHead className="w-36">Etapa</TableHead>
              {showTeamColumns && <TableHead className="w-28">Equipe</TableHead>}
              {showTeamColumns && (
                <TableHead className="w-[14%]">Corretor</TableHead>
              )}
              <TableHead className="w-[7%]">{isPlatformAdmin ? "Fit" : "Renda"}</TableHead>
              <TableHead className="w-[8%]">{isPlatformAdmin ? "Município" : "Estado civil"}</TableHead>
              <TableHead className="w-19">Prioridade</TableHead>
              <TableHead className="w-28">Atualizado</TableHead>
              <TableHead className="sticky right-0 z-20 w-16 text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={leadTableColSpan}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Carregando leads...
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={leadTableColSpan}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum lead encontrado com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              leadsPager.pageItems.map((l) => {
                const stage = funnelStages.find((s) => s.id === l.stage) ?? {
                  id: l.stage,
                  name: l.stage,
                  color: DEFAULT_CATALOG_COLOR,
                  papel: null,
                };
                const isNovoStage =
                  stage.papel === "inicial" ||
                  stage.id === "novo" ||
                  l.stage === "novo";
                const equipe = equipeLabel(l);
                return (
                  <TableRow
                    key={l.id}
                    className="group cursor-pointer hover:bg-muted/40"
                    onClick={() => setDetailLead(l)}
                    data-state={selectedIds.has(l.id) ? "selected" : undefined}
                  >
                    <TableCell
                      className="pr-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(l.id)}
                        onCheckedChange={(v) =>
                          toggleSelectOne(l.id, v === true)
                        }
                        aria-label={`Selecionar ${l.nome}`}
                        disabled={bulkDeleting}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="avatar-fallback-brand text-[9px]">
                            {l.nome
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div className="table-person-name truncate text-sm leading-snug">
                              {l.nome}
                            </div>
                            {isGerente &&
                              isLeadCarteiraPropria(l, user?.id) && (
                                <MeuLeadBadge />
                              )}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {l.telefone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="overflow-visible">
                      {l.origem ? (
                        <Badge
                          className={cn(
                            catalogColorBadgeClass(
                              colorByLabel("origem", l.origem),
                            ),
                            "w-auto max-w-full",
                          )}
                          style={catalogColorBadgeStyle(
                            colorByLabel("origem", l.origem),
                          )}
                          title={l.origem}
                        >
                          {l.origem}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="truncate pr-4 text-center!">
                      {isPlatformAdmin
                        ? l.prospeccao?.produtoIndicado || (
                            <span className="text-muted-foreground">—</span>
                          )
                        : l.tipoRenda || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          catalogColorBadgeClass(stage.color),
                          "w-28 justify-center",
                          isNovoStage && "badge-novo-glow",
                        )}
                        style={
                          isNovoStage
                            ? undefined
                            : catalogColorBadgeStyle(stage.color)
                        }
                        title={stage.name}
                      >
                        {stage.name}
                      </Badge>
                    </TableCell>
                    {showTeamColumns && (
                      <TableCell className="truncate">
                        {equipe === "—" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          equipe
                        )}
                      </TableCell>
                    )}
                    {showTeamColumns && (
                      <TableCell className="table-person-name truncate text-sm leading-snug">
                        {l.corretor || (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="truncate font-medium tabular-nums">
                      {isPlatformAdmin ? (
                        l.prospeccao?.fit != null ? (
                          l.prospeccao.fit
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : l.renda != null ? (
                        brl(l.renda)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="truncate">
                      {isPlatformAdmin
                        ? l.cidade || (
                            <span className="text-muted-foreground">—</span>
                          )
                        : l.estadoCivil || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="truncate">
                      <Badge
                        className={cn(
                          prioridadeBadgeClass(l.prioridade),
                          "w-auto max-w-full",
                        )}
                      >
                        {l.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {l.updatedAt}
                    </TableCell>
                    <TableCell
                      className="sticky right-0 z-10 bg-card text-right group-hover:bg-muted/40 group-data-[state=selected]:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Copiar telefone"
                          disabled={!phoneDigits(l.telefone)}
                          onClick={() => void copyLeadPhone(l.telefone)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        {isPlatformAdmin ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Abrir no Google Maps"
                            disabled={
                              !googleMapsSearchUrl(
                                l.prospeccao?.endereco,
                                l.bairro,
                                l.cidade,
                              )
                            }
                            onClick={() => openLeadMaps(l)}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </Button>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Mais opções"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setDetailLead(l)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(l)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={phoneDigits(l.telefone).length < 10}
                              onClick={() => openLeadWhatsApp(l.telefone)}
                            >
                              <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" />{" "}
                              WhatsApp
                            </DropdownMenuItem>
                            {canContratos ? (
                              <DropdownMenuItem
                                onClick={() => setContratoLead(l)}
                              >
                                <FileText className="w-4 h-4 mr-2" /> Contrato
                              </DropdownMenuItem>
                            ) : null}
                            {isPlatformAdmin ? (
                              <DropdownMenuItem
                                disabled={
                                  !googleMapsSearchUrl(
                                    l.prospeccao?.endereco,
                                    l.bairro,
                                    l.cidade,
                                  )
                                }
                                onClick={() => openLeadMaps(l)}
                              >
                                <MapPin className="w-4 h-4 mr-2" /> Google Maps
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteLead(l)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePager
          page={leadsPager.page}
          totalPages={leadsPager.totalPages}
          total={leadsPager.total}
          onPageChange={leadsPager.setPage}
        />
      </Card>

      <Dialog open={importHelpOpen} onOpenChange={setImportHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar leads</DialogTitle>
            <DialogDescription>
              Use o padrão abaixo para o arquivo ser lido corretamente.
              Preferível Excel (.xlsx).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {isPlatformAdmin ? (
              <div>
                <p className="font-medium mb-1.5">Planilha de prospecção</p>
                <p className="text-muted-foreground mb-2">
                  Aceita a planilha Zone Connection (aba de leads) com Empresa,
                  Município, Bairro/Região, Endereço, Telefone/WhatsApp, redes,
                  atuação, módulos, CRM, produto, fit, prioridade e fonte.
                </p>
                <div className="rounded-md border overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/60 text-left">
                        <th className="p-2 font-medium">Empresa</th>
                        <th className="p-2 font-medium">Município</th>
                        <th className="p-2 font-medium">Telefone/WhatsApp</th>
                        <th className="p-2 font-medium">Produto indicado</th>
                        <th className="p-2 font-medium">Fit</th>
                        <th className="p-2 font-medium">Fonte</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t text-muted-foreground">
                        <td className="p-2">Âncora Imobiliária</td>
                        <td className="p-2">Recife</td>
                        <td className="p-2 tabular-nums">(81) 2123-3333</td>
                        <td className="p-2">CRM + IA SDR</td>
                        <td className="p-2">9.5</td>
                        <td className="p-2">Google Maps</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            <div>
              <p className="font-medium mb-1.5">Colunas (nessa ordem)</p>
              <div className="rounded-md border overflow-x-auto overflow-y-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th className="p-2 font-medium">Nome</th>
                      <th className="p-2 font-medium">Telefone</th>
                      <th className="p-2 font-medium">Email</th>
                      <th className="p-2 font-medium">Localidade de interesse</th>
                      <th className="p-2 font-medium">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t text-muted-foreground">
                      <td className="p-2">Maria Silva</td>
                      <td className="p-2 tabular-nums">(81) 98888-7777</td>
                      <td className="p-2">maria@email.com</td>
                      <td className="p-2">Recife</td>
                      <td className="p-2">WhatsApp</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            )}

            <div>
              <p className="font-medium mb-1.5">Regras</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <span className="text-foreground">
                    {isPlatformAdmin ? "Empresa" : "Nome"}
                  </span>{" "}
                  e <span className="text-foreground">Telefone</span> são
                  obrigatórios
                </li>
                <li>
                  Telefone já com DDD, ex.: (81) 98888-7777 ou 81 98888-7777.
                  Se houver mais de um número na célula, usa o primeiro.
                </li>
                {isPlatformAdmin ? (
                  <li>
                    As demais colunas (endereço, redes, fit, produto, fonte)
                    são opcionais e entram na ficha de prospecção.
                  </li>
                ) : (
                <li>
                  Email, Localidade de interesse e Origem são opcionais
                </li>
                )}
                <li>Uma linha = um lead</li>
              </ul>
            </div>

            {isPlatformAdmin ? null : (
            <div>
              <p className="font-medium mb-1.5">Não incluir</p>
              <p className="text-muted-foreground">
                Hora da captura, DDD em coluna separada, mensagem de captura,
                etapa, corretor ou prioridade.
              </p>
            </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadImportTemplate(
                  isPlatformAdmin
                    ? "modelo-importacao-prospeccao.xlsx"
                    : undefined,
                  isPlatformAdmin ? { prospeccao: true } : undefined,
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Baixar modelo Excel
            </Button>
            <Button
              type="button"
              disabled={importParsing}
              onClick={() => importInputRef.current?.click()}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Escolher arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(next) => {
          setImportOpen(next);
          if (!next) setImportEditingInvalids(false);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {importFileName ? `Arquivo: ${importFileName}. ` : ""}
              {isPlatformAdmin
                ? "Lê a aba de leads da planilha de prospecção (Empresa, telefone, município, produto, fit e demais campos)."
                : "Formato: Nome, Telefone, Email, Localidade de interesse e Origem."}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const validCount = importRows.filter((r) => !r.error).length;
            const invalidRows = importRows
              .map((row, index) => ({ row, index }))
              .filter(({ row }) => Boolean(row.error));
            const shownRows = importEditingInvalids
              ? [
                  ...importRows
                    .map((row, index) => ({ row, index }))
                    .filter(({ row }) => Boolean(row.error)),
                  ...importRows
                    .map((row, index) => ({ row, index }))
                    .filter(({ row }) => !row.error),
                ]
              : importRows.map((row, index) => ({ row, index }));
            return (
              <>
                {invalidRows.length > 0 ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                    <p className="font-medium text-destructive">
                      {invalidRows.length} lead
                      {invalidRows.length === 1 ? "" : "s"} inválido
                      {invalidRows.length === 1 ? "" : "s"} — não sobem até
                      serem corrigidos ou ignorados.
                    </p>
                    <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-auto text-xs text-destructive/90">
                      {invalidRows.slice(0, 12).map(({ row, index }) => (
                        <li key={`inv-${index}`}>
                          Linha {index + 1}
                          {row.nome ? ` (${row.nome})` : ""}: {row.error}
                        </li>
                      ))}
                      {invalidRows.length > 12 ? (
                        <li>… e mais {invalidRows.length - 12}</li>
                      ) : null}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {validCount} lead{validCount === 1 ? "" : "s"} pronto
                    {validCount === 1 ? "" : "s"} para importar.
                  </p>
                )}
                <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2 font-medium">#</th>
                        <th className="p-2 font-medium">
                          {isPlatformAdmin ? "Empresa" : "Nome"}
                        </th>
                        <th className="p-2 font-medium">Telefone</th>
                        {isPlatformAdmin ? null : (
                          <th className="p-2 font-medium">Email</th>
                        )}
                        <th className="p-2 font-medium">
                          {isPlatformAdmin ? "Município" : "Localidade"}
                        </th>
                        {isPlatformAdmin ? (
                          <>
                            <th className="p-2 font-medium">Produto</th>
                            <th className="p-2 font-medium">Fit</th>
                          </>
                        ) : (
                          <th className="p-2 font-medium">Origem</th>
                        )}
                        <th className="p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRows.map(({ row, index }) => {
                        const editing = importEditingInvalids;
                        return (
                          <tr
                            key={`${row.telefone}-${index}`}
                            className={cn(
                              "border-b last:border-0",
                              row.error && "bg-destructive/5",
                            )}
                          >
                            <td className="p-2 tabular-nums text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="p-2">
                              {editing ? (
                                <Input
                                  className="h-8"
                                  value={row.nome}
                                  onChange={(e) =>
                                    patchImportRow(index, {
                                      nome: e.target.value,
                                    })
                                  }
                                />
                              ) : (
                                row.nome || "—"
                              )}
                            </td>
                            <td className="p-2 tabular-nums">
                              {editing ? (
                                <Input
                                  className="h-8"
                                  value={row.telefone}
                                  onChange={(e) =>
                                    patchImportRow(index, {
                                      telefone: e.target.value,
                                    })
                                  }
                                />
                              ) : (
                                row.telefone || "—"
                              )}
                            </td>
                            {isPlatformAdmin ? null : (
                              <td className="p-2">
                                {editing ? (
                                  <Input
                                    className="h-8"
                                    value={row.email}
                                    onChange={(e) =>
                                      patchImportRow(index, {
                                        email: e.target.value,
                                      })
                                    }
                                  />
                                ) : (
                                  row.email || "—"
                                )}
                              </td>
                            )}
                            <td className="p-2">
                              {editing ? (
                                <Input
                                  className="h-8"
                                  value={row.cidade}
                                  onChange={(e) =>
                                    patchImportRow(index, {
                                      cidade: e.target.value,
                                    })
                                  }
                                />
                              ) : isPlatformAdmin ? (
                                row.cidade || row.origem || "—"
                              ) : (
                                row.cidade || "—"
                              )}
                            </td>
                            {isPlatformAdmin ? (
                              <>
                                <td className="p-2">
                                  {row.prospeccao?.produtoIndicado || "—"}
                                </td>
                                <td className="p-2 tabular-nums">
                                  {row.prospeccao?.fit ?? "—"}
                                </td>
                              </>
                            ) : (
                              <td className="p-2">
                                {editing ? (
                                  <Input
                                    className="h-8"
                                    value={row.origem}
                                    onChange={(e) =>
                                      patchImportRow(index, {
                                        origem: e.target.value,
                                      })
                                    }
                                  />
                                ) : (
                                  row.origem || "—"
                                )}
                              </td>
                            )}
                            <td className="p-2">
                              {row.error ? (
                                <span className="text-xs text-destructive">
                                  {row.error}
                                </span>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {validCount} válido{validCount === 1 ? "" : "s"} ·{" "}
                  {invalidRows.length} inválido
                  {invalidRows.length === 1 ? "" : "s"}
                  {invalidRows.length > 0 && !importEditingInvalids
                    ? " (não serão enviados se você ignorar)"
                    : ""}
                </p>
                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importSaving}
                    onClick={() => setImportOpen(false)}
                  >
                    Cancelar
                  </Button>
                  {invalidRows.length > 0 && !importEditingInvalids ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={importSaving}
                      onClick={() => setImportEditingInvalids(true)}
                    >
                      Editar inválidos
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    disabled={importSaving || validCount === 0}
                    onClick={() => void confirmImport()}
                  >
                    {importSaving && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    {invalidRows.length > 0
                      ? `Ignorar inválidos e importar ${validCount}`
                      : `Importar ${validCount}`}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {canDistribuir && (
        <LeadsDistribuirDialog
          open={distribuirOpen}
          onOpenChange={setDistribuirOpen}
          onDone={() => void refresh()}
        />
      )}
    </div>
  );
}
