import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { ConverterLeadButton } from "@/components/converter-lead-button";
import { FiltrosPainel, FILTRO_CAMPO } from "@/components/filtros-painel";
import { FunilColumnShell } from "@/components/funil-column-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  brl,
  isLeadCarteiraPropria,
  type AnaliseStatus,
  type Lead,
  type StageId,
} from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { getAdminVerClientesCorretor } from "@/lib/clientes-nav-prefs";
import {
  canReassignLead as roleCanReassignLead,
  canViewTeamData,
  canWriteTriagem as roleCanWriteTriagem,
  isCorretorLike,
  isLeadInAtrasoScope,
} from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { EmpreendimentosInteresseChips } from "@/components/empreendimentos-interesse-panel";
import { useCatalog } from "@/lib/catalog-store";
import {
  LeadFunilAlerta,
  leadMonitoramentoCardClass,
} from "@/components/lead-funil-alerta";
import {
  MONITORAMENTO_FILTRO_OPTIONS,
  applyInatividadeThreshold,
  formatPrazoUnidade,
  isEtapaMonitoramentoTerminal,
  type MonitoramentoFiltro,
} from "@/lib/lead-monitoramento";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import { LeadDetalheDialog } from "@/components/lead-detalhe-dialog";
import { LeadOrigemLiberacaoBadge, LeadRoletaBadge } from "@/components/lead-origem-liberacao-badge";
import { LeadReatribuirDialog } from "@/components/lead-reatribuir-dialog";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
import {
  ANALISE_STATUS_LABEL,
  analiseBadgeClass,
  shouldShowAnaliseStatus,
} from "@/lib/analise-status";
import { leadPodeRedistribuir } from "@/lib/documentacao-status";
import { DocStatusFunilTags } from "@/components/doc-status1-funil-tag";
import { ApiError } from "@/lib/api";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
  DetailField,
} from "@/components/form-dialog";
import { fetchConstrutoras, type Construtora } from "@/lib/construtoras-api";
import {
  createEmpreendimento,
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { leadVisivelNoFunilEmUso } from "@/lib/funil-lead-visibilidade";
import { fetchFunilAtivo, recoverFunilEtapas, type Funil } from "@/lib/funis-api";
import { createTriagemEvent } from "@/lib/triagem-api";
import { TriagemFunilDialog } from "@/components/triagem-funil-dialog";
import {
  FunilTarefaDialog,
  type FunilTarefaPrompt,
} from "@/components/funil-tarefa-dialog";
import {
  LeadAtividadeDialog,
  type LeadAtividadePrompt,
} from "@/components/lead-atividade-dialog";
import { fetchLeadById, mapApiLead } from "@/lib/leads-api";
import { useTenantTheme } from "@/lib/tenant-theme";
import {
  assumirAnalise,
  fetchAnalises,
  updateAnalise,
  type Analise,
} from "@/lib/analise-api";
import {
  abrirFichaGuiada,
  createDocumentacao,
  fetchDocumentacoes,
  updateDocumentacao,
  type Documentacao,
} from "@/lib/documentacao-api";
import {
  nextCatalogColor,
} from "@/lib/catalog-colors";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import {
  Clock,
  User,
  CircleUser,
  Banknote,
  Phone,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  ClipboardList,
  UserRoundCog,
  Loader2,
  Plus,
  Check,
  ChevronsUpDown,
  Briefcase,
  LifeBuoy,
  Users,
  Settings,
} from "lucide-react";
import { SkeletonKanban } from "@/components/skeletons";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/env";
import { phoneDigits } from "@/lib/phone";
import { celebrateAfterDocumentacao } from "@/lib/celebrations";
import {
  isStatusAprovadoDoc,
  isStatusVendido,
  pickCatalogLabel,
} from "@/lib/documentacao-status";
import { leadEntraNoFunil } from "@/lib/funil-tipo-filtro";
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";

/** Slug legado (fallback se o funil não tiver papel configurado). */
const LOST_STAGE_SLUG_FALLBACK = "perdido";
/** Coluna virtual: leads cujo stage não existe no funil ativo. */
const FORA_DO_FUNIL_STAGE = "__fora_do_funil__";

function stageKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function leadMatchesStage(
  leadStage: string,
  columnId: string,
  exactIds: Set<string>,
) {
  if (leadStage === columnId) return true;
  if (exactIds.has(leadStage)) return false;
  return stageKey(leadStage) === stageKey(columnId);
}
const MAX_HISTORICO_TEXTO = 400;

/** Largura da coluna (w-72) + gap (gap-3) — um passo de scroll. */
const COLUMN_STEP_PX = 288 + 12;
/** Cards visíveis por coluna; cada clique em “Carregar mais” acrescenta este lote. */
const FUNIL_CARDS_PER_COLUMN = 100;

const FUNIL_GRADIENT_BTN =
  "border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110";
const FUNIL_GRADIENT_STYLE = BRAND_GRADIENT_STYLE;
const FUNIL_FILTER =
  "h-9 w-auto min-w-0 max-w-64 gap-2 rounded-full border-border/80 bg-card px-3 text-sm font-medium text-foreground shadow-sm hover:border-primary/40 hover:bg-card [&>span]:line-clamp-none [&>span]:flex [&>span]:min-w-0 [&>span]:items-center";
const FUNIL_FILTER_ON = "border-primary/50 bg-primary/10 text-primary";

export const Route = createFileRoute("/_app/funil")({
  validateSearch: (search: Record<string, unknown>) => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
  }),
  head: () => ({ meta: [{ title: "Funil de Vendas — Zone Connection" }] }),
  component: Funil,
});

function Funil() {
  const { lead } = Route.useSearch();
  return <ComercialFunilBoard tipoFiltro="lead" openLeadId={lead} />;
}

export type ComercialFunilTipoFiltro = "lead" | "cliente";

export function ComercialFunilBoard({
  tipoFiltro = "lead",
  openLeadId,
}: {
  tipoFiltro?: ComercialFunilTipoFiltro;
  openLeadId?: string;
}) {
  const isClientesFunil = tipoFiltro === "cliente";
  const navigate = useNavigate();
  const user = getSession();
  const isSolo = user?.tenant?.plano === "solo";
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const isCorretor = !canSeeTeam;
  const canWriteTriagem = roleCanWriteTriagem(user?.role);
  const { isModuleEnabled } = useTenantTheme();
  const canAgenda = isModuleEnabled("agenda");
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canReassign = roleCanReassignLead(user?.role) && !isSolo;
  const isPlatformAdmin = user?.role === "super_admin";
  const isGerente = user?.role === "gerente";
  const isManager = canSeeTeam;
  const adminVeClientesCorretor = getAdminVerClientesCorretor();
  /** Solo e Super Admin não usam filtros de equipe/corretor. */
  const showTeamFilters =
    !isSolo &&
    !isPlatformAdmin &&
    (!isClientesFunil || adminVeClientesCorretor);
  const {
    leads: allLeads,
    assignees,
    updateLeadStage,
    markLeadLost,
    applyLead,
    loading,
    refresh: refreshLeads,
  } = useLeads();
  const {
    funnelStages,
    loading: catalogLoading,
    colorByLabel,
    stageByPapel,
    applyFunnelEtapas,
    documentacaoStatus1,
    documentacaoStatus2,
    documentacaoFontes,
  } = useCatalog();
  const lostStageSlug = stageByPapel("perdido") ?? LOST_STAGE_SLUG_FALLBACK;

  function isLostStage(stage: StageId): boolean {
    const found = funnelStages.find((s) => s.id === stage);
    if (found?.papel === "perdido") return true;
    return stage === lostStageSlug || stage === LOST_STAGE_SLUG_FALLBACK;
  }

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [funilAtivo, setFunilAtivo] = useState<Funil | null>(null);
  const [filterEquipeId, setFilterEquipeId] = useState("__all__");
  const [filterCorretorId, setFilterCorretorId] = useState("__all__");
  const [filterMeusLeads, setFilterMeusLeads] = useState(false);
  const [filterMonitoramento, setFilterMonitoramento] =
    useState<MonitoramentoFiltro>("todos");
  const [corretorFilterOpen, setCorretorFilterOpen] = useState(false);
  const [recoveringStages, setRecoveringStages] = useState(false);
  const fichaGuiada =
    getSession()?.tenant?.modules?.fichaAnaliseGuiada === true;
  const [fichaEntrada, setFichaEntrada] = useState<{
    lead: Lead;
    stage: StageId;
  } | null>(null);
  const [fichaConstrutoraId, setFichaConstrutoraId] = useState("");
  const [fichaEmpreendimentoId, setFichaEmpreendimentoId] = useState("");
  const [fichaFonte, setFichaFonte] = useState("");
  const [fichaSaving, setFichaSaving] = useState(false);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [vendaConferencia, setVendaConferencia] = useState<{
    lead: Lead;
    stage: StageId;
    doc: Documentacao;
  } | null>(null);
  const [vendaVgv, setVendaVgv] = useState("");
  const [vendaObs, setVendaObs] = useState("");
  const [vendaStatus1, setVendaStatus1] = useState("");
  const [vendaStatus2, setVendaStatus2] = useState("Vendido");
  const [statusEtapa, setStatusEtapa] = useState<{
    lead: Lead;
    stage: StageId;
    doc: Documentacao;
  } | null>(null);
  const [statusEtapa1, setStatusEtapa1] = useState("");
  const [statusEtapa2, setStatusEtapa2] = useState("");
  const [visibleByStage, setVisibleByStage] = useState<Record<string, number>>(
    {},
  );

  function decorateLeadMonitoramento(lead: Lead): Lead {
    if (!funilAtivo || !lead.monitoramento) return lead;
    const papel = funnelStages.find((s) => s.id === lead.stage)?.papel;
    return {
      ...lead,
      monitoramento: applyInatividadeThreshold(
        lead.monitoramento,
        funilAtivo.inatividadeValor,
        funilAtivo.inatividadeUnidade,
        {
          terminal: isEtapaMonitoramentoTerminal(papel),
        },
      ),
    };
  }

  useEffect(() => {
    let cancelled = false;
    void refreshLeads({ silent: true });
    void fetchFunilAtivo("comercial")
      .then((funil) => {
        if (cancelled) return;
        setFunilAtivo(funil);
        applyFunnelEtapas(funil.etapas);
      })
      .catch(() => {
        if (!cancelled) setFunilAtivo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [applyFunnelEtapas, refreshLeads]);

  useEffect(() => {
    if (isSolo || isPlatformAdmin || (user?.role !== "admin" && !isGerente))
      return;
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
  }, [isAdmin, isGerente, isSolo, isPlatformAdmin, user?.role]);

  const corretorOptions = useMemo(() => {
    let list = assignees.filter((a) => !a.role || isCorretorLike(a.role));
    if (
      isAdmin &&
      filterEquipeId !== "__all__" &&
      filterEquipeId !== "__none__"
    ) {
      const eq = equipes.find((e) => e.id === filterEquipeId);
      if (eq) {
        const memberIds = new Set(eq.membros.map((m) => m.id));
        list = list.filter((a) => memberIds.has(a.id));
      }
    }
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [assignees, equipes, filterEquipeId, isAdmin]);

  const selectedCorretorLabel =
    filterCorretorId === "__all__"
      ? "Todos os corretores"
      : filterCorretorId === "__none__"
        ? "Sem corretor"
        : (corretorOptions.find((c) => c.id === filterCorretorId)?.name ??
          "Corretor");

  const teamScope = useMemo(() => {
    const memberIds = new Set<string>();
    const equipeIds = new Set<string>();
    if (user) memberIds.add(user.id);
    if (isGerente && user) {
      for (const eq of equipes) {
        if (eq.gerenteId !== user.id) continue;
        equipeIds.add(eq.id);
        for (const m of eq.membros) memberIds.add(m.id);
      }
      // Enquanto as equipes não carregam, usa o escopo já filtrado dos assignees.
      if (equipeIds.size === 0) {
        for (const a of assignees) memberIds.add(a.id);
      }
    } else {
      for (const a of assignees) memberIds.add(a.id);
    }
    return { memberIds, equipeIds };
  }, [assignees, equipes, isGerente, user]);

  const leads = useMemo(() => {
    const etapaInicialId =
      funnelStages.find((stage) => stage.papel === "inicial")?.id ?? null;
    let list = allLeads.filter((l) => {
      if (
        l.stage === lostStageSlug ||
        l.stage === LOST_STAGE_SLUG_FALLBACK ||
        funnelStages.find((s) => s.id === l.stage)?.papel === "perdido"
      ) {
        return false;
      }
      const aprovadoNaEntrada =
        etapaInicialId != null &&
        l.stage === etapaInicialId &&
        (l.analise?.status === "aprovado" ||
          isStatusAprovadoDoc(l.documentacaoStatus1));
      return leadEntraNoFunil({
        tipo: l.tipo,
        tipoFiltro,
        isClientesFunil,
        adminVeClientesCorretor,
        aprovadoNaEntrada,
      });
    });

    // Clientes = carteira pessoal, salvo admin com opção de ver corretores.
    if (isClientesFunil && user && !adminVeClientesCorretor) {
      list = list.filter(
        (l) => l.corretorId === user.id || l.corretor === user.name,
      );
    } else if (!isClientesFunil && user) {
      list = list.filter((l) => isLeadInAtrasoScope(user, l, teamScope));
    }

    if (funilAtivo) {
      list = list.filter((l) =>
        leadVisivelNoFunilEmUso(l.funilId, funilAtivo.id),
      );
      list = list.map((l) => decorateLeadMonitoramento(l));
    }

    if ((!isClientesFunil || adminVeClientesCorretor) && isAdmin && filterEquipeId !== "__all__") {
      if (filterEquipeId === "__none__") {
        list = list.filter((l) => !l.equipeId);
      } else {
        list = list.filter((l) => l.equipeId === filterEquipeId);
      }
    }

    if ((!isClientesFunil || adminVeClientesCorretor) && isManager && filterCorretorId !== "__all__") {
      if (filterCorretorId === "__none__") {
        list = list.filter((l) => !l.corretorId);
      } else {
        list = list.filter((l) => l.corretorId === filterCorretorId);
      }
    }

    if (!isClientesFunil && isGerente && filterMeusLeads && user) {
      list = list.filter((l) => isLeadCarteiraPropria(l, user.id));
    }

    if (filterMonitoramento !== "todos") {
      list = list.filter((l) => {
        const mon = l.monitoramento;
        if (!mon) return false;
        if (filterMonitoramento === "sem_movimentacao") {
          return mon.problemas.some((p) => p.tipo === "sem_movimentacao");
        }
        if (filterMonitoramento === "em_atraso") {
          return mon.problemas.some(
            (p) =>
              p.tipo === "prazo_ultrapassado" || p.tipo === "tarefa_atrasada",
          );
        }
        if (filterMonitoramento === "proximo_vencimento") {
          return mon.problemas.some((p) => p.tipo === "prazo_proximo");
        }
        return (
          Boolean(mon.prazoDueAt) &&
          mon.visual === "none" &&
          !mon.problemas.some((p) => p.tipo === "prazo_ultrapassado")
        );
      });
    }

    return list;
  }, [
    allLeads,
    funnelStages,
    lostStageSlug,
    filterCorretorId,
    filterEquipeId,
    filterMeusLeads,
    filterMonitoramento,
    funilAtivo,
    isAdmin,
    isClientesFunil,
    adminVeClientesCorretor,
    isGerente,
    isManager,
    teamScope,
    tipoFiltro,
    user,
  ]);

  const showKanbanSkeleton = useDeferredLoading(
    catalogLoading || (loading && leads.length === 0),
  );

  const funnelStageIds = useMemo(
    () => new Set(funnelStages.map((s) => s.id)),
    [funnelStages],
  );
  const orphanLeads = useMemo(
    () =>
      leads.filter(
        (l) =>
          !funnelStages.some((s) =>
            leadMatchesStage(l.stage, s.id, funnelStageIds),
          ),
      ),
    [leads, funnelStages, funnelStageIds],
  );
  const boardStages = useMemo(() => {
    if (orphanLeads.length === 0) return funnelStages;
    return [
      {
        id: FORA_DO_FUNIL_STAGE,
        name: "Funil anterior",
        color: "bg-amber-100 text-amber-800",
        papel: null,
      },
      ...funnelStages,
    ];
  }, [funnelStages, orphanLeads.length]);

  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [reassignLead, setReassignLead] = useState<Lead | null>(null);
  const didDrag = useRef(false);
  const dismissedOpenLeadId = useRef<string | null>(null);

  useEffect(() => {
    if (!openLeadId) return;
    if (dismissedOpenLeadId.current === openLeadId) return;
    let cancelled = false;

    async function openFromSearch(id: string) {
      const cached = allLeads.find((l) => l.id === id);
      if (cached) {
        if (cancelled) return;
        dismissedOpenLeadId.current = null;
        setDetailLead(decorateLeadMonitoramento(cached));
        return;
      }
      try {
        const found = mapApiLead(await fetchLeadById(id));
        if (cancelled) return;
        applyLead(found);
        dismissedOpenLeadId.current = null;
        setDetailLead(decorateLeadMonitoramento(found));
      } catch {
        /* o quadro continua carregando mesmo se a ficha falhar */
      }
    }

    void openFromSearch(openLeadId);
    return () => {
      cancelled = true;
    };
  }, [openLeadId, applyLead]);

  useEffect(() => {
    if (!detailLead?.monitoramento || !funilAtivo) return;
    setDetailLead((cur) => (cur ? decorateLeadMonitoramento(cur) : cur));
  }, [funilAtivo]);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragOverlayRef = useRef<HTMLDivElement>(null);
  const dragSession = useRef<{
    leadId: string;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    activated: boolean;
    sourceEl: HTMLElement | null;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    onMove: ((e: PointerEvent) => void) | null;
    onUp: ((e: PointerEvent) => void) | null;
  } | null>(null);
  const columnRectsRef = useRef<
    Array<{ id: StageId; left: number; right: number; top: number; bottom: number }>
  >([]);
  const boardRectRef = useRef<{ left: number; right: number } | null>(null);
  const activeDropStageRef = useRef<StageId | null>(null);
  const dragMoveRafRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fluxo de perda ao soltar o card na coluna "Perdido".
  const [lostTarget, setLostTarget] = useState<Lead | null>(null);
  const [lostMotivo, setLostMotivo] = useState("");
  const [lostMotivoOutro, setLostMotivoOutro] = useState("");

  /** Após mudar etapa (só corretor): formulário para registrar histórico. */
  const [triagemPrompt, setTriagemPrompt] = useState<{
    leadId: string;
    leadNome: string;
    stage: StageId;
    stageName: string;
    fromStage: StageId;
    fromStageName: string;
  } | null>(null);
  const [triagemTexto, setTriagemTexto] = useState("");
  const [triagemSaving, setTriagemSaving] = useState(false);
  const triagemFinalizedRef = useRef(false);
  const pendingTarefaRef = useRef<{ lead: Lead; stage: StageId } | null>(null);
  const [tarefaPrompt, setTarefaPrompt] = useState<FunilTarefaPrompt | null>(
    null,
  );
  const [atividadePrompt, setAtividadePrompt] =
    useState<LeadAtividadePrompt | null>(null);

  /** Consulta a triagem sem sair do quadro. */
  const [triagemLead, setTriagemLead] = useState<Lead | null>(null);

  /** Relato sem mudar etapa (só corretor), a partir dos detalhes do card. */
  const [manualTriagem, setManualTriagem] = useState<{
    leadId: string;
    leadNome: string;
  } | null>(null);
  const [manualTriagemTexto, setManualTriagemTexto] = useState("");
  const [manualTriagemSaving, setManualTriagemSaving] = useState(false);

  function offerTarefaAfterMove(lead: Lead, stage: StageId) {
    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    setTarefaPrompt({
      leadId: lead.id,
      leadNome: lead.nome,
      stage,
      stageName,
    });
  }

  function afterStageAdvanced(lead: Lead, stage: StageId) {
    pendingTarefaRef.current = { lead, stage };
    if (canWriteTriagem) {
      offerTriagemHistory(lead, stage);
      return;
    }
    pendingTarefaRef.current = null;
    offerTarefaAfterMove(lead, stage);
  }

  function finishTriagemThenTarefa() {
    const pending = pendingTarefaRef.current;
    pendingTarefaRef.current = null;
    if (!pending) return;
    window.setTimeout(() => {
      offerTarefaAfterMove(pending.lead, pending.stage);
    }, 150);
  }

  function cancelStageFollowUps() {
    pendingTarefaRef.current = null;
    closeTriagemPrompt();
    setTarefaPrompt(null);
  }

  function offerTriagemHistory(lead: Lead, stage: StageId) {
    if (!canWriteTriagem) return;
    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    const fromStageName =
      funnelStages.find((s) => s.id === lead.stage)?.name ?? lead.stage;
    triagemFinalizedRef.current = false;
    setTriagemTexto("");
    setTriagemPrompt({
      leadId: lead.id,
      leadNome: lead.nome,
      stage,
      stageName,
      fromStage: lead.stage,
      fromStageName,
    });
  }

  function closeTriagemPrompt() {
    setTriagemPrompt(null);
    setTriagemTexto("");
    setTriagemSaving(false);
  }

  async function registerFunilTriagem(texto: string) {
    if (!triagemPrompt || triagemFinalizedRef.current) return;
    triagemFinalizedRef.current = true;
    setTriagemSaving(true);
    try {
      await createTriagemEvent({
        leadId: triagemPrompt.leadId,
        texto,
        origem: "funil",
        stage: triagemPrompt.stage,
        stageAnterior: triagemPrompt.fromStage,
      });
      toast.success("Histórico registrado na Triagem.");
      closeTriagemPrompt();
      finishTriagemThenTarefa();
      void refreshLeads({ silent: true });
    } catch (err) {
      triagemFinalizedRef.current = false;
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o histórico.",
      );
    } finally {
      setTriagemSaving(false);
    }
  }

  async function skipTriagemHistory() {
    if (!triagemPrompt || triagemSaving || triagemFinalizedRef.current) return;
    const texto = `Etapa avançada de "${triagemPrompt.fromStageName}" para "${triagemPrompt.stageName}".`;
    await registerFunilTriagem(texto);
  }

  function openManualTriagem(lead: Lead) {
    if (!canWriteTriagem) return;
    setManualTriagemTexto("");
    setManualTriagem({ leadId: lead.id, leadNome: lead.nome });
  }

  function closeManualTriagem() {
    setManualTriagem(null);
    setManualTriagemTexto("");
    setManualTriagemSaving(false);
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
      const mapped = mapApiLead(await fetchLeadById(leadId));
      const next = decorateLeadMonitoramento(mapped);
      applyLead(next);
      setDetailLead((cur) => (cur?.id === leadId ? next : cur));
    } catch {
      void refreshLeads({ silent: true });
    }
  }

  async function saveManualTriagem() {
    if (!manualTriagem) return;
    const texto = manualTriagemTexto.trim();
    if (!texto) {
      toast.error("Escreva o relato do histórico.");
      return;
    }
    if (texto.length > MAX_HISTORICO_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_HISTORICO_TEXTO} caracteres.`,
      );
      return;
    }
    setManualTriagemSaving(true);
    try {
      await createTriagemEvent({
        leadId: manualTriagem.leadId,
        texto,
        origem: "manual",
      });
      toast.success("Histórico registrado (etapa mantida).");
      closeManualTriagem();
      void refreshLeads({ silent: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o histórico.",
      );
    } finally {
      setManualTriagemSaving(false);
    }
  }

  async function saveTriagemHistory() {
    if (!triagemPrompt) return;
    const texto = triagemTexto.trim();
    if (!texto) {
      toast.error("Escreva o relato do histórico ou pule esta etapa.");
      return;
    }
    if (texto.length > MAX_HISTORICO_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_HISTORICO_TEXTO} caracteres.`,
      );
      return;
    }
    await registerFunilTriagem(texto);
  }

  const updateScrollButtons = useCallback(() => {
    const el = boardRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons, boardStages.length, loading, catalogLoading]);

  function scrollBoard(direction: -1 | 1) {
    const el = boardRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * COLUMN_STEP_PX, behavior: "smooth" });
  }

  useEffect(() => {
    return () => {
      const s = dragSession.current;
      if (s?.longPressTimer != null) clearTimeout(s.longPressTimer);
      if (s?.onMove) window.removeEventListener("pointermove", s.onMove);
      if (s?.onUp) {
        window.removeEventListener("pointerup", s.onUp);
        window.removeEventListener("pointercancel", s.onUp);
      }
      if (dragMoveRafRef.current != null) {
        cancelAnimationFrame(dragMoveRafRef.current);
        dragMoveRafRef.current = null;
      }
      document.body.classList.remove("funil-card-dragging");
      dragSession.current = null;
    };
  }, []);

  function cacheColumnRects() {
    const board = boardRef.current;
    if (!board) {
      columnRectsRef.current = [];
      return;
    }
    columnRectsRef.current = Array.from(
      board.querySelectorAll("[data-funnel-stage]"),
    ).flatMap((el) => {
      const id = el.getAttribute("data-funnel-stage");
      if (!id) return [];
      const rect = el.getBoundingClientRect();
      return [{
        id: id as StageId,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      }];
    });
  }

  function stageFromPoint(x: number, y: number): StageId | null {
    const cols = columnRectsRef.current;
    for (const col of cols) {
      if (x >= col.left && x <= col.right && y >= col.top && y <= col.bottom) {
        return col.id;
      }
    }
    return null;
  }

  function columnEl(stage: StageId | null) {
    if (!stage || !boardRef.current) return null;
    return boardRef.current.querySelector<HTMLElement>(
      `[data-funnel-stage="${CSS.escape(stage)}"]`,
    );
  }

  function setDropStageIfChanged(stage: StageId | null) {
    if (activeDropStageRef.current === stage) return;
    columnEl(activeDropStageRef.current)?.removeAttribute("data-drop-active");
    activeDropStageRef.current = stage;
    columnEl(stage)?.setAttribute("data-drop-active", "");
  }

  function clearDragTimers() {
    const s = dragSession.current;
    if (s?.longPressTimer != null) {
      clearTimeout(s.longPressTimer);
      s.longPressTimer = null;
    }
  }

  function positionDragOverlay(clientX: number, clientY: number) {
    const s = dragSession.current;
    const el = dragOverlayRef.current;
    if (!s?.activated || !el) return;
    const x = clientX - s.offsetX;
    const y = clientY - s.offsetY;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function tickCardDrag() {
    const s = dragSession.current;
    if (!s?.activated) {
      dragMoveRafRef.current = null;
      return;
    }
    dragMoveRafRef.current = requestAnimationFrame(tickCardDrag);
    const board = boardRef.current;
    if (!board) return;
    const rect = boardRectRef.current;
    if (!rect) return;
    const edge = 80;
    let speed = 0;
    if (s.lastX < rect.left + edge) {
      const depth = Math.min(1, (rect.left + edge - s.lastX) / edge);
      speed = -Math.max(2, Math.round(depth * 22));
    } else if (s.lastX > rect.right - edge) {
      const depth = Math.min(1, (s.lastX - (rect.right - edge)) / edge);
      speed = Math.max(2, Math.round(depth * 22));
    }
    if (speed !== 0) {
      const before = board.scrollLeft;
      board.scrollLeft += speed;
      const delta = board.scrollLeft - before;
      if (delta !== 0) {
        for (const col of columnRectsRef.current) {
          col.left -= delta;
          col.right -= delta;
        }
      }
    }
    setDropStageIfChanged(stageFromPoint(s.lastX, s.lastY));
  }

  function hideDragOverlay() {
    const el = dragOverlayRef.current;
    if (!el) return;
    el.classList.add("hidden");
    el.replaceChildren();
  }

  function detachDragWindowListeners() {
    const s = dragSession.current;
    if (!s) return;
    if (s.onMove) window.removeEventListener("pointermove", s.onMove);
    if (s.onUp) {
      window.removeEventListener("pointerup", s.onUp);
      window.removeEventListener("pointercancel", s.onUp);
    }
    s.onMove = null;
    s.onUp = null;
  }

  function activateCardDrag(leadId: string, target: HTMLElement) {
    const s = dragSession.current;
    if (!s || s.leadId !== leadId || s.activated) return;
    s.activated = true;
    s.sourceEl = target;
    didDrag.current = true;
    const rect = target.getBoundingClientRect();
    s.offsetX = Math.min(Math.max(s.startX - rect.left, 16), rect.width - 16);
    s.offsetY = Math.min(Math.max(s.startY - rect.top, 16), rect.height - 16);
    s.width = rect.width;
    cacheColumnRects();
    const board = boardRef.current;
    if (board) {
      const rect = board.getBoundingClientRect();
      boardRectRef.current = { left: rect.left, right: rect.right };
    }
    document.body.classList.add("funil-card-dragging");
    boardRef.current?.classList.remove("scroll-smooth");
    target.style.opacity = "0.35";

    const overlay = dragOverlayRef.current;
    if (overlay) {
      const clone = target.cloneNode(true) as HTMLElement;
      clone.style.opacity = "1";
      clone.style.transform = "none";
      clone.style.transition = "none";
      clone.style.pointerEvents = "none";
      clone.classList.add("shadow-xl", "ring-2", "ring-primary/30");
      overlay.style.width = `${rect.width}px`;
      overlay.replaceChildren(clone);
      overlay.classList.remove("hidden");
    }
    positionDragOverlay(s.lastX, s.lastY);
    setDropStageIfChanged(stageFromPoint(s.lastX, s.lastY));
    if (dragMoveRafRef.current == null) {
      dragMoveRafRef.current = requestAnimationFrame(tickCardDrag);
    }
  }

  function finishCardDrag(clientX: number, clientY: number, drop: boolean, pointerId: number) {
    const s = dragSession.current;
    if (!s || s.pointerId !== pointerId) return;

    const { leadId, activated, sourceEl } = s;
    clearDragTimers();
    detachDragWindowListeners();
    if (dragMoveRafRef.current != null) {
      cancelAnimationFrame(dragMoveRafRef.current);
      dragMoveRafRef.current = null;
    }
    if (sourceEl) sourceEl.style.opacity = "";
    hideDragOverlay();
    columnEl(activeDropStageRef.current)?.removeAttribute("data-drop-active");
    document.body.classList.remove("funil-card-dragging");
    boardRef.current?.classList.add("scroll-smooth");
    boardRectRef.current = null;
    dragSession.current = null;
    activeDropStageRef.current = null;

    if (drop && activated) {
      const stage = stageFromPoint(clientX, clientY);
      if (stage) void dropLeadOnStage(leadId, stage);
      window.setTimeout(() => {
        didDrag.current = false;
      }, 0);
    }
  }

  function onCardPointerDown(e: React.PointerEvent<HTMLDivElement>, leadId: string) {
    if (e.button !== 0) return;
    if (dragSession.current) return;
    didDrag.current = false;
    const target = e.currentTarget;
    const pointerId = e.pointerId;

    const onMove = (ev: PointerEvent) => {
      const s = dragSession.current;
      if (!s || s.pointerId !== ev.pointerId) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;

      s.lastX = ev.clientX;
      s.lastY = ev.clientY;

      if (!s.activated) {
        if (Math.hypot(dx, dy) < 6) return;
        clearDragTimers();
        activateCardDrag(s.leadId, target);
      }

      if (!dragSession.current?.activated) return;
      positionDragOverlay(ev.clientX, ev.clientY);
    };

    const onUp = (ev: PointerEvent) => {
      const drop = ev.type === "pointerup";
      finishCardDrag(ev.clientX, ev.clientY, drop, ev.pointerId);
    };

    dragSession.current = {
      leadId,
      pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      width: 0,
      activated: false,
      sourceEl: target,
      longPressTimer: null,
      onMove,
      onUp,
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    target.setPointerCapture?.(pointerId);
  }

  async function loadCatalogoFicha() {
    if (construtoras.length > 0 && empreendimentos.length > 0) return;
    try {
      const [c, e] = await Promise.all([
        fetchConstrutoras(),
        fetchEmpreendimentos(),
      ]);
      setConstrutoras(c);
      setEmpreendimentos(e);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar construtoras e empreendimentos.",
      );
    }
  }

  async function confirmarEntradaAnalise() {
    if (!fichaEntrada) return;
    if (!fichaConstrutoraId || !fichaEmpreendimentoId || !fichaFonte) {
      toast.error("Informe a construtora, o empreendimento e a fonte.");
      return;
    }
    setFichaSaving(true);
    try {
      await abrirFichaGuiada({
        leadId: fichaEntrada.lead.id,
        nome: fichaEntrada.lead.nome,
        construtoraId: fichaConstrutoraId,
        empreendimentoId: fichaEmpreendimentoId,
        fonte: fichaFonte,
      });
      await updateLeadStage(fichaEntrada.lead.id, fichaEntrada.stage);
      toast.success(`${fichaEntrada.lead.nome} entrou em análise e a ficha foi aberta.`);
      setFichaEntrada(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir a ficha.",
      );
    } finally {
      setFichaSaving(false);
    }
  }

  async function abrirConferenciaVenda(lead: Lead, stage: StageId) {
    try {
      const docs = await fetchDocumentacoes();
      const doc = docs.find((item) => item.leadId === lead.id);
      if (!doc) {
        toast.error("Este lead ainda não tem ficha de documentação.");
        return;
      }
      if (doc.autor.id !== getSession()?.id) {
        toast.error("Só quem abriu a ficha pode registrar a venda.");
        return;
      }
      setVendaVgv(doc.vgv != null ? formatMoneyInput(doc.vgv) : "");
      setVendaObs(doc.obs ?? "");
      setVendaStatus1(doc.status1);
      setVendaStatus2("Vendido");
      setVendaConferencia({ lead, stage, doc });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir a ficha.",
      );
    }
  }

  async function confirmarVenda() {
    if (!vendaConferencia) return;
    const vgv = parseOptionalMoneyInput(vendaVgv);
    if (vgv == null) {
      toast.error("Informe o valor da venda.");
      return;
    }
    setFichaSaving(true);
    try {
      await updateDocumentacao(vendaConferencia.doc.id, {
        status1: vendaStatus1 || vendaConferencia.doc.status1,
        status2: vendaStatus2 || "Vendido",
        vgv,
        obs: vendaObs.trim() || null,
        dataVenda: new Date().toISOString().slice(0, 10),
      });
      await updateLeadStage(vendaConferencia.lead.id, vendaConferencia.stage);
      toast.success(`${vendaConferencia.lead.nome} foi para venda.`);
      setVendaConferencia(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível registrar a venda.",
      );
    } finally {
      setFichaSaving(false);
    }
  }

  async function abrirStatusEtapa(lead: Lead, stage: StageId) {
    const papel = funnelStages.find((s) => s.id === stage)?.papel;
    try {
      const docs = await fetchDocumentacoes();
      const doc = docs.find((item) => item.leadId === lead.id);
      if (!doc) {
        toast.error("Este lead ainda não tem ficha de documentação.");
        return;
      }
      if (doc.autor.id !== getSession()?.id) {
        toast.error("Só quem abriu a ficha pode atualizar os status.");
        return;
      }
      const preferido = papel === "reprovado" ? "Reprovado" : "Aprovado";
      setStatusEtapa1(
        documentacaoStatus1.includes(preferido) ? preferido : doc.status1,
      );
      setStatusEtapa2(doc.status2 || "Andamento");
      setStatusEtapa({ lead, stage, doc });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir a ficha.",
      );
    }
  }

  async function confirmarStatusEtapa() {
    if (!statusEtapa) return;
    if (!statusEtapa1 || !statusEtapa2) {
      toast.error("Informe o status da análise e o status do andamento.");
      return;
    }
    setFichaSaving(true);
    try {
      await updateDocumentacao(statusEtapa.doc.id, {
        status1: statusEtapa1,
        status2: statusEtapa2,
      });
      await updateLeadStage(
        statusEtapa.lead.id,
        statusEtapa.stage,
        isCorretor ? { omitTriagem: true } : undefined,
      );
      const stageName =
        funnelStages.find((s) => s.id === statusEtapa.stage)?.name ??
        statusEtapa.stage;
      toast.success(`${statusEtapa.lead.nome} foi para ${stageName}.`);
      setStatusEtapa(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar a ficha.",
      );
    } finally {
      setFichaSaving(false);
    }
  }

  async function dropLeadOnStage(leadId: string, stage: StageId) {
    const lead = allLeads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    if (stage === FORA_DO_FUNIL_STAGE) return;

    // Perdido não é uma etapa comum: pede o motivo e faz soft-delete.
    if (isLostStage(stage)) {
      setLostMotivo("");
      setLostMotivoOutro("");
      setLostTarget(lead);
      return;
    }

    const papel = funnelStages.find((s) => s.id === stage)?.papel;
    if (fichaGuiada && papel === "analise") {
      setFichaConstrutoraId("");
      setFichaEmpreendimentoId("");
      setFichaFonte("");
      setFichaEntrada({ lead, stage });
      void loadCatalogoFicha();
      return;
    }
    if (fichaGuiada && papel === "venda") {
      void abrirConferenciaVenda(lead, stage);
      return;
    }
    if (fichaGuiada && (papel === "aprovado" || papel === "reprovado")) {
      void abrirStatusEtapa(lead, stage);
      return;
    }

    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    toast.success(`${lead.nome} movido para ${stageName}`);
    const move = updateLeadStage(
      leadId,
      stage,
      isCorretor ? { omitTriagem: true } : undefined,
    );
    requestAnimationFrame(() => {
      afterStageAdvanced(lead, stage);
    });
    try {
      await move;
    } catch (err) {
      cancelStageFollowUps();
      toast.error(
        err instanceof Error ? err.message : "Não foi possível mover o lead.",
      );
    }
  }

  async function recoverOrphanStages() {
    if (!funilAtivo) return;
    setRecoveringStages(true);
    try {
      const updated = await recoverFunilEtapas(funilAtivo.id);
      setFunilAtivo(updated);
      applyFunnelEtapas(updated.etapas);
      await refreshLeads({ silent: true });
      toast.success(
        "Etapas do funil anterior foram restauradas. Os leads voltam a aparecer nas colunas.",
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível recuperar as etapas.",
      );
    } finally {
      setRecoveringStages(false);
    }
  }

  async function confirmLost() {
    if (!lostTarget) return;
    const motivo =
      lostMotivo === "__outro__" ? lostMotivoOutro.trim() : lostMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da perda.");
      return;
    }

    const { id, nome, tipo } = lostTarget;
    setLostTarget(null);
    setLostMotivo("");
    setLostMotivoOutro("");
    toast.success(
      tipo === "cliente"
        ? `${nome} movido para Perda de cliente.`
        : `${nome} movido para Leads Perdidos.`,
    );
    try {
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível marcar como perdido.",
      );
    }
  }

  function openDetail(lead: Lead) {
    if (didDrag.current) return;
    setDetailLead(lead);
  }

  function openTriagemFromCard(lead: Lead) {
    if (didDrag.current) return;
    setTriagemLead(lead);
  }

  function openLeadWhatsApp(telefone: string) {
    const digits = phoneDigits(telefone);
    if (digits.length < 10) {
      toast.error("Este lead não tem telefone.");
      return;
    }
    const e164 = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(getWhatsAppUrl(undefined, e164), "_blank", "noopener,noreferrer");
  }

  function openDetailFromTriagem() {
    if (!triagemLead) return;
    const lead = triagemLead;
    setTriagemLead(null);
    setDetailLead(lead);
  }

  async function moveDetailToStage(stage: StageId) {
    if (!detailLead || stage === detailLead.stage) return;

    // Perdido: fecha o detalhe e abre o modal de motivo (soft-delete).
    if (isLostStage(stage)) {
      const target = detailLead;
      setDetailLead(null);
      setLostMotivo("");
      setLostMotivoOutro("");
      setLostTarget(target);
      return;
    }

    const papelDetalhe = funnelStages.find((s) => s.id === stage)?.papel;
    if (fichaGuiada && papelDetalhe === "analise") {
      const target = detailLead;
      setDetailLead(null);
      setFichaConstrutoraId("");
      setFichaEmpreendimentoId("");
      setFichaFonte("");
      setFichaEntrada({ lead: target, stage });
      void loadCatalogoFicha();
      return;
    }
    if (fichaGuiada && papelDetalhe === "venda") {
      const target = detailLead;
      setDetailLead(null);
      void abrirConferenciaVenda(target, stage);
      return;
    }
    if (fichaGuiada && (papelDetalhe === "aprovado" || papelDetalhe === "reprovado")) {
      const target = detailLead;
      setDetailLead(null);
      void abrirStatusEtapa(target, stage);
      return;
    }

    const stageName = funnelStages.find((s) => s.id === stage)?.name ?? stage;
    const previousStage = detailLead.stage;
    // Atualização otimista no próprio modal + feedback imediato.
    setDetailLead({ ...detailLead, stage });
    toast.success(`${detailLead.nome} movido para ${stageName}`);
    afterStageAdvanced(detailLead, stage);
    try {
      await updateLeadStage(
        detailLead.id,
        stage,
        isCorretor ? { omitTriagem: true } : undefined,
      );
    } catch (err) {
      cancelStageFollowUps();
      setDetailLead((cur) =>
        cur && cur.id === detailLead.id
          ? { ...cur, stage: previousStage }
          : cur,
      );
      toast.error(
        err instanceof Error ? err.message : "Não foi possível mover o lead.",
      );
    }
  }

  function openLostFromDetail() {
    if (!detailLead) return;
    const target = detailLead;
    setDetailLead(null);
    setLostMotivo("");
    setLostMotivoOutro("");
    setLostTarget(target);
  }

  return (
    <div>
      <PageHeader
        title={isClientesFunil ? "Funil de Clientes" : "Funil de Vendas"}
        description={
          loading || catalogLoading
            ? "Carregando funil..."
            : isClientesFunil
              ? adminVeClientesCorretor
                ? "Sua carteira e a dos corretores no funil — arraste os cards para mover entre etapas."
                : "Sua carteira de clientes no funil — arraste os cards para mover entre etapas."
              : isSolo || isCorretor
                ? "Seus leads no funil — inclusive os em atraso. Arraste os cards para mover entre etapas."
                : isGerente
                  ? "Funil da sua equipe — seus leads e os da equipe, inclusive os em atraso."
                  : isPlatformAdmin
                    ? "Funil da plataforma — arraste os cards para mover entre etapas."
                    : adminVeClientesCorretor
                      ? "Funil da imobiliária — leads de captação e clientes dos corretores."
                      : "Funil da imobiliária — todos os leads de captação, inclusive os em atraso."
        }
        actionsClassName="lg:max-w-none"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
              <FiltrosPainel
                kicker={isClientesFunil ? "Clientes" : "Funil"}
                description="Escolha equipe, corretor e prazo."
                confirmLabel="Ver funil"
                resultCount={leads.length}
                activeCount={
                  [
                    showTeamFilters && isAdmin && filterEquipeId !== "__all__",
                    showTeamFilters && isManager && filterCorretorId !== "__all__",
                    !isClientesFunil && isGerente && filterMeusLeads,
                    filterMonitoramento !== "todos",
                  ].filter(Boolean).length
                }
                onClear={() => {
                  setFilterEquipeId("__all__");
                  setFilterCorretorId("__all__");
                  setFilterMeusLeads(false);
                  setFilterMonitoramento("todos");
                }}
              >
              {showTeamFilters && isAdmin && (
                <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-[#079ED4]" />
                  Equipe
                </Label>
                <Select
                  value={filterEquipeId}
                  onValueChange={(v) => {
                    setFilterEquipeId(v);
                    setFilterCorretorId("__all__");
                  }}
                >
                  <SelectTrigger className={FILTRO_CAMPO}>
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__all__">Todas as equipes</SelectItem>
                    <SelectItem value="__none__">Sem equipe</SelectItem>
                    {equipes.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              )}
              {showTeamFilters && isManager && (
                <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CircleUser className="size-3.5 text-[#079ED4]" />
                  Corretor
                </Label>
                <Popover
                  open={corretorFilterOpen}
                  onOpenChange={setCorretorFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={corretorFilterOpen}
                      className={cn(FILTRO_CAMPO, "justify-between font-normal")}
                    >
                      <span className="truncate">{selectedCorretorLabel}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    onWheel={(event) => event.stopPropagation()}
                  >
                    <Command>
                      <CommandInput placeholder="Pesquisar corretor…" />
                      <CommandList className="max-h-72">
                        <CommandEmpty>Nenhum corretor encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="todos os corretores"
                            onSelect={() => {
                              setFilterCorretorId("__all__");
                              setFilterMeusLeads(false);
                              setCorretorFilterOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterCorretorId === "__all__"
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Todos os corretores
                          </CommandItem>
                          <CommandItem
                            value="sem corretor"
                            onSelect={() => {
                              setFilterCorretorId("__none__");
                              setFilterMeusLeads(false);
                              setCorretorFilterOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterCorretorId === "__none__"
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Sem corretor
                          </CommandItem>
                          {corretorOptions.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name} ${c.id}`}
                              onSelect={() => {
                                setFilterCorretorId(c.id);
                                setFilterMeusLeads(false);
                                setCorretorFilterOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterCorretorId === c.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="truncate">{c.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                </div>
              )}
              {!isClientesFunil && isGerente && (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    FILTRO_CAMPO,
                    "justify-start",
                    filterMeusLeads && "border-[#079ED4] bg-[#E7F4FA] text-[#0B3148]",
                  )}
                  onClick={() => {
                    setFilterMeusLeads((v) => !v);
                    setFilterCorretorId("__all__");
                  }}
                >
                  <Briefcase className="size-3.5 shrink-0 text-[#079ED4]" />
                  Meus leads
                </Button>
              )}
              <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-[#079ED4]" />
                Prazos
              </Label>
              <Select
                value={filterMonitoramento}
                onValueChange={(v) =>
                  setFilterMonitoramento(v as MonitoramentoFiltro)
                }
              >
                <SelectTrigger className={FILTRO_CAMPO}>
                  <SelectValue placeholder="Prazos" />
                </SelectTrigger>
                <SelectContent>
                  {MONITORAMENTO_FILTRO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === "todos" ? "Todos os prazos" : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              </FiltrosPainel>
              {!isCorretor && (
                <Button
                  size="sm"
                  asChild
                  className={cn("h-9 gap-1.5 rounded-full px-4", FUNIL_GRADIENT_BTN)}
                  style={FUNIL_GRADIENT_STYLE}
                >
                  <Link
                    to="/configuracoes"
                    search={{ secao: "operacao", item: "funil" }}
                  >
                    <Settings className="size-3.5" />
                    Configurar funil
                  </Link>
                </Button>
              )}
            <div className="flex h-9 items-center overflow-hidden rounded-full border border-border/80 bg-card shadow-sm">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-none"
                disabled={!canScrollLeft}
                aria-label="Coluna anterior"
                title="Coluna anterior"
                onClick={() => scrollBoard(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-none"
                disabled={!canScrollRight}
                aria-label="Próxima coluna"
                title="Próxima coluna"
                onClick={() => scrollBoard(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        }
      />

      {showKanbanSkeleton ? (
        <SkeletonKanban columns={Math.max(boardStages.length, 5)} />
      ) : !catalogLoading && boardStages.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            Nenhum funil comercial ativo neste ambiente.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie as etapas em Configurações para o kanban aparecer aqui.
          </p>
          {!isCorretor ? (
            <Button
              asChild
              className={cn("mt-4", FUNIL_GRADIENT_BTN)}
              style={FUNIL_GRADIENT_STYLE}
            >
              <Link
                to="/configuracoes"
                search={{ secao: "operacao", item: "funil" }}
              >
                Configurar funil
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <>
      {orphanLeads.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p>
            {orphanLeads.length} lead(s) ainda estão nas etapas do funil
            anterior. Eles não foram apagados.
          </p>
          {(isAdmin || isGerente) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-background"
              loading={recoveringStages}
              loadingText="Restaurando..."
              disabled={!funilAtivo}
              onClick={() => void recoverOrphanStages()}
            >
              <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
              Restaurar etapas aqui
            </Button>
          )}
        </div>
      )}

      <div
        ref={boardRef}
        data-guia="funil-board"
        className={cn(
          "flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth",
        )}
      >
        {boardStages.map((stage) => {
          const isOrphanColumn = stage.id === FORA_DO_FUNIL_STAGE;
          const stageLeads = isOrphanColumn
            ? orphanLeads
            : leads.filter((l) =>
                leadMatchesStage(l.stage, stage.id, funnelStageIds),
              );
          const cap =
            visibleByStage[stage.id] ?? FUNIL_CARDS_PER_COLUMN;
          const visibleLeads = stageLeads.slice(0, cap);
          const hiddenCount = stageLeads.length - visibleLeads.length;
          const total = stageLeads.reduce((s, l) => s + (l.renda ?? 0), 0);
          return (
            <FunilColumnShell
              key={stage.id}
              data-funnel-stage={isOrphanColumn ? undefined : stage.id}
              title={stage.name}
              count={stageLeads.length}
              total={brl(total)}
              color={stage.color}
              orphan={isOrphanColumn}
            >
                {visibleLeads.map((l) => (
                  <Card
                    key={l.id}
                    onPointerDown={(e) => onCardPointerDown(e, l.id)}
                    onClick={() => openDetail(l)}
                    className={cn(
                      "rounded-xl border-black/5 p-3 cursor-grab touch-none select-none shadow-sm transition-[opacity,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md",
                      (l.origemAtrasoLiberacao === "retrabalho" ||
                        l.triagemOrigemHerdada === "retrabalho") &&
                        "border-amber-400/70 bg-amber-50/90 ring-1 ring-amber-400/30 dark:bg-amber-950/25",
                      l.roletaRedistribuido &&
                        "border-blue-500/70 bg-blue-50/90 ring-1 ring-blue-400/40 dark:bg-blue-950/30",
                      isClientesFunil &&
                        "border-2 bg-white dark:bg-card",
                      leadMonitoramentoCardClass(l),
                    )}
                  >
                    <div className="mb-1.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="table-person-name flex min-w-0 flex-1 items-start gap-1.5 text-sm">
                          <CircleUser
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="min-w-0 break-words leading-snug">
                            {l.nome}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                          {isGerente &&
                            !isClientesFunil &&
                            isLeadCarteiraPropria(l, user?.id) && (
                              <MeuLeadBadge />
                            )}
                          <LeadOrigemLiberacaoBadge lead={l} compact />
                          {l.roletaRedistribuido ? <LeadRoletaBadge compact /> : null}
                          {l.tipo === "cliente" && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-5 border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                              title={`Cliente da carteira de ${l.corretor}`}
                            >
                              Cliente
                            </Badge>
                          )}
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              l.prioridade === "Alta"
                                ? "bg-destructive"
                                : l.prioridade === "Média"
                                  ? "bg-warning"
                                  : "bg-muted-foreground"
                            }`}
                          />
                        </div>
                      </div>
                      <DocStatusFunilTags
                        status1={l.documentacaoStatus1}
                        status2={l.documentacaoStatus2}
                        layout="split"
                      />
                    </div>
                    {isOrphanColumn && (
                      <Badge
                        variant="outline"
                        className="mb-1 h-5 px-1.5 text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                        title="Etapa do funil anterior"
                      >
                        {l.stage}
                      </Badge>
                    )}
                    {l.analise && shouldShowAnaliseStatus(l.analise.status) && (
                      <Badge
                        variant="outline"
                        className={cn("mb-1", analiseBadgeClass(l.analise.status))}
                        title={ANALISE_STATUS_LABEL[l.analise.status]}
                      >
                        {ANALISE_STATUS_LABEL[l.analise.status]}
                      </Badge>
                    )}
                    <div className="grid grid-cols-[14px_minmax(0,1fr)_22px] items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="truncate">{l.telefone}</span>
                      <button
                        type="button"
                        title="Abrir WhatsApp"
                        aria-label="Abrir WhatsApp"
                        disabled={phoneDigits(l.telefone).length < 10}
                        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[#25D366] hover:bg-[#25D366]/15 disabled:pointer-events-none disabled:opacity-40"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          openLeadWhatsApp(l.telefone);
                        }}
                      >
                        <FaWhatsapp className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    {l.tipo === "cliente" &&
                      !isCorretor &&
                      !isPlatformAdmin &&
                      !isClientesFunil && (
                      <div className="text-[10px] text-violet-600 dark:text-violet-300 mt-1">
                        Carteira de {l.corretor.split(" ")[0]}
                      </div>
                    )}
                    <div className="mt-1.5 grid grid-cols-[14px_minmax(0,1fr)_22px] items-center gap-1.5">
                      <Banknote
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="text-sm font-semibold text-primary">
                        {l.renda != null ? brl(l.renda) : "—"}
                      </span>
                    </div>
                    <EmpreendimentosInteresseChips interesses={l.interesses} />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                      {isPlatformAdmin ? (
                        <ConverterLeadButton leadId={l.id} leadNome={l.nome} />
                      ) : (
                        <div className="flex min-w-0 items-center gap-1">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{l.corretor.split(" ")[0]}</span>
                        </div>
                      )}
                      <div className="flex shrink-0 items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {l.updatedAt}
                      </div>
                    </div>
                    <div className="mt-2 flex w-full flex-col gap-1.5">
                      <div
                        className={cn(
                          "flex w-full gap-1.5",
                          canReassign &&
                            leadPodeRedistribuir(
                              l,
                              funnelStages.find((s) => s.id === l.stage)?.papel,
                            )
                            ? "flex-row"
                            : "flex-col",
                        )}
                      >
                        <button
                          type="button"
                          className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-border/70 bg-muted/30 px-1.5 text-[11px] font-medium text-foreground hover:border-primary/30 hover:bg-muted/60"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTriagemFromCard(l);
                          }}
                        >
                          <ClipboardList
                            className="h-3 w-3 text-primary"
                            aria-hidden
                          />
                          Triagem
                        </button>
                        {canReassign &&
                        leadPodeRedistribuir(
                          l,
                          funnelStages.find((s) => s.id === l.stage)?.papel,
                        ) ? (
                          <button
                            type="button"
                            className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-border/70 bg-muted/30 px-1.5 text-[11px] font-medium text-foreground hover:border-primary/30 hover:bg-muted/60"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReassignLead(l);
                            }}
                          >
                            <UserRoundCog
                              className="h-3 w-3 text-primary"
                              aria-hidden
                            />
                            Reatribuir
                          </button>
                        ) : null}
                      </div>
                      <LeadFunilAlerta
                        lead={l}
                        onUpdated={(next) => {
                          applyLead(next);
                          setDetailLead((cur) =>
                            cur && cur.id === next.id ? next : cur,
                          );
                          setTriagemLead((cur) =>
                            cur && cur.id === next.id ? next : cur,
                          );
                          setReassignLead((cur) =>
                            cur && cur.id === next.id ? next : cur,
                          );
                        }}
                      />
                    </div>
                  </Card>
                ))}
                {hiddenCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() =>
                      setVisibleByStage((prev) => ({
                        ...prev,
                        [stage.id]: cap + FUNIL_CARDS_PER_COLUMN,
                      }))
                    }
                  >
                    Carregar mais 100
                    {hiddenCount > FUNIL_CARDS_PER_COLUMN
                      ? ` · restam ${hiddenCount}`
                      : ` (${hiddenCount})`}
                  </Button>
                ) : null}
            </FunilColumnShell>
          );
        })}
      </div>
        </>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dragOverlayRef}
            className="pointer-events-none fixed left-0 top-0 z-[200] hidden will-change-transform"
            style={{ transform: "translate3d(0, 0, 0)" }}
          />,
          document.body,
        )}

      <LeadDetalheDialog
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(o) => {
          if (!o) {
            if (openLeadId) dismissedOpenLeadId.current = openLeadId;
            setDetailLead(null);
          }
        }}
        onUpdated={(next) => {
          applyLead(next);
          setDetailLead(next);
        }}
        showCorretor={!isCorretor && !isPlatformAdmin}
        showMeuLeadBadge={Boolean(
          isGerente &&
          !isClientesFunil &&
          detailLead &&
          isLeadCarteiraPropria(detailLead, user?.id),
        )}
        inatividadeFallback={
          funilAtivo
            ? formatPrazoUnidade(
                funilAtivo.inatividadeValor,
                funilAtivo.inatividadeUnidade,
              )
            : undefined
        }
        onAddAtividade={
          canWriteTriagem && canAgenda && detailLead
            ? () => openAtividade(detailLead)
            : undefined
        }
        monitoramentoSlot={
          detailLead ? (
            <LeadFunilAlerta
              lead={detailLead}
              onUpdated={(next) => {
                applyLead(next);
                setDetailLead(next);
              }}
            />
          ) : null
        }
        moreActions={
          detailLead
            ? [
          {
            label: "Ver triagem",
            icon: ClipboardList,
            onClick: () => {
              const id = lead.id;
              setDetailLead(null);
              void navigate({ to: "/triagem", search: { leadId: id } });
            },
          },
          ...(canWriteTriagem
            ? [
                {
                  label: "Registrar histórico",
                  icon: ClipboardList,
                  onClick: () => openManualTriagem(detailLead),
                },
              ]
            : []),
          ...(canReassign &&
          leadPodeRedistribuir(
            detailLead,
            funnelStages.find((s) => s.id === detailLead.stage)?.papel,
          )
            ? [
                {
                  label: "Reatribuir",
                  icon: UserRoundCog,
                  onClick: () => {
                    const lead = detailLead;
                    setDetailLead(null);
                    setReassignLead(lead);
                  },
                },
              ]
            : []),
          ...(canWriteTriagem &&
          canAgenda &&
          detailLead.monitoramento?.visual !== "vermelho"
            ? [
                {
                  label: "Adicionar atividade",
                  icon: CalendarClock,
                  onClick: () => openAtividade(detailLead),
                },
              ]
            : []),
          {
            label: "Dar perda",
            destructive: true,
            onClick: openLostFromDetail,
          },
            ]
            : undefined
        }
        onSelectStage={(stage) => void moveDetailToStage(stage)}
        stageControl={
          detailLead ? (
          <Select
            value={detailLead.stage}
            onValueChange={(v) => void moveDetailToStage(v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              {funnelStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          ) : null
        }
      />

      <LeadReatribuirDialog
        lead={reassignLead}
        open={!!reassignLead}
        onOpenChange={(o) => {
          if (!o) setReassignLead(null);
        }}
        onReassigned={(next) => {
          applyLead(next);
          setDetailLead((cur) => (cur && cur.id === next.id ? next : cur));
          setTriagemLead((cur) => (cur && cur.id === next.id ? next : cur));
        }}
      />

      <Dialog open={!!fichaEntrada} onOpenChange={(open) => !open && !fichaSaving && setFichaEntrada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entrar em análise</DialogTitle>
            <DialogDescription>
              {fichaEntrada
                ? `Informe a construtora, o empreendimento e a fonte de ${fichaEntrada.lead.nome}. Os três são obrigatórios.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3" key={fichaEntrada?.lead.id ?? "ficha"}>
            <div className="space-y-1.5">
              <Label>Construtora</Label>
              <Select
                value={fichaConstrutoraId}
                onValueChange={(id) => {
                  setFichaConstrutoraId(id);
                  setFichaEmpreendimentoId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {construtoras.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Empreendimento</Label>
              <Select value={fichaEmpreendimentoId} onValueChange={setFichaEmpreendimentoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empreendimentos
                    .filter((item) => !fichaConstrutoraId || item.construtoraId === fichaConstrutoraId)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fonte</Label>
              <Select value={fichaFonte} onValueChange={setFichaFonte}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {documentacaoFontes.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={fichaSaving} onClick={() => setFichaEntrada(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={fichaSaving} onClick={() => void confirmarEntradaAnalise()}>
              Abrir ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusEtapa} onOpenChange={(open) => !open && !fichaSaving && setStatusEtapa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {funnelStages.find((s) => s.id === statusEtapa?.stage)?.papel === "reprovado"
                ? "Reprovado"
                : "Aprovados"}
            </DialogTitle>
            <DialogDescription>
              {statusEtapa
                ? `Escolha o status da análise e o status do andamento de ${statusEtapa.lead.nome}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Status da análise</Label>
              <Select value={statusEtapa1} onValueChange={setStatusEtapa1}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {documentacaoStatus1.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status do andamento</Label>
              <Select value={statusEtapa2} onValueChange={setStatusEtapa2}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {documentacaoStatus2.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={fichaSaving} onClick={() => setStatusEtapa(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={fichaSaving} onClick={() => void confirmarStatusEtapa()}>
              Salvar status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vendaConferencia} onOpenChange={(open) => !open && !fichaSaving && setVendaConferencia(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferir a venda</DialogTitle>
            <DialogDescription>
              Revise a ficha e informe o valor. Você pode ajustar a observação antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          {vendaConferencia ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Lead: </span>{vendaConferencia.doc.nome}</p>
              <p><span className="text-muted-foreground">Construtora: </span>{vendaConferencia.doc.construtora?.nome ?? "—"}</p>
              <p><span className="text-muted-foreground">Empreendimento: </span>{vendaConferencia.doc.empreendimento?.nome ?? "—"}</p>
              <div className="space-y-1.5">
                <Label>Status da análise</Label>
                <Select value={vendaStatus1} onValueChange={setVendaStatus1}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {documentacaoStatus1.map((label) => (
                      <SelectItem key={label} value={label}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status do andamento</Label>
                <Select value={vendaStatus2} onValueChange={setVendaStatus2}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {documentacaoStatus2.map((label) => (
                      <SelectItem key={label} value={label}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p><span className="text-muted-foreground">Quem abriu: </span>{vendaConferencia.doc.autor.name}</p>
              <p><span className="text-muted-foreground">Gerente: </span>{vendaConferencia.doc.gerente?.name ?? "—"}</p>
              <div className="space-y-1.5 pt-2">
                <Label>Observação</Label>
                <Textarea value={vendaObs} onChange={(e) => setVendaObs(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor da venda</Label>
                <Input
                  value={vendaVgv}
                  onChange={(e) => setVendaVgv(maskMoneyInput(e.target.value))}
                  placeholder="0,00"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={fichaSaving} onClick={() => setVendaConferencia(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={fichaSaving} onClick={() => void confirmarVenda()}>
              Confirmar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!lostTarget}
        onOpenChange={(o) => {
          if (!o) {
            setLostTarget(null);
            setLostMotivo("");
            setLostMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Por que este lead foi perdido?</AlertDialogTitle>
            <AlertDialogDescription>
              {lostTarget
                ? lostTarget.tipo === "cliente"
                  ? `${lostTarget.nome} sairá do funil e da carteira, e irá para Perda de cliente (visível só para o corretor).`
                  : `${lostTarget.nome} sairá do funil e das listas operacionais, e irá para Leads Perdidos (visível só para o administrador).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={lostMotivo}
              outroValue={lostMotivoOutro}
              onChange={setLostMotivo}
              onOutroChange={setLostMotivoOutro}
              selectId="funil-lost-motivo"
              outroId="funil-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmLost();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TriagemFunilDialog
        lead={triagemLead}
        open={Boolean(triagemLead)}
        onOpenChange={(open) => {
          if (!open) setTriagemLead(null);
        }}
        stageName={(slug) =>
          slug ? (funnelStages.find((s) => s.id === slug)?.name ?? slug) : "—"
        }
        canWrite={canWriteTriagem}
        onOpenDetails={openDetailFromTriagem}
        onLeadTouched={() => {
          void refreshLeads({ silent: true });
        }}
      />

      <FunilTarefaDialog
        prompt={tarefaPrompt}
        onClose={() => setTarefaPrompt(null)}
        onCreated={() => {
          void refreshLeads({ silent: true });
        }}
      />

      <LeadAtividadeDialog
        prompt={atividadePrompt}
        onClose={() => setAtividadePrompt(null)}
        onCreated={(leadId) => afterAtividadeCreated(leadId)}
      />

      <Dialog
        open={Boolean(triagemPrompt)}
        onOpenChange={(open) => {
          if (!open && triagemPrompt && !triagemSaving) {
            void skipTriagemHistory();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Registrar histórico?</DialogTitle>
                <DialogDescription>
                  {triagemPrompt
                    ? `${triagemPrompt.leadNome} foi movido para ${triagemPrompt.stageName}. Deseja registrar um relato nesta mudança de etapa?`
                    : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="funil-historico-texto">Relato</Label>
              <span className="text-xs text-muted-foreground">
                {triagemTexto.length}/{MAX_HISTORICO_TEXTO}
              </span>
            </div>
            <Textarea
              id="funil-historico-texto"
              value={triagemTexto}
              onChange={(e) => setTriagemTexto(e.target.value)}
              placeholder="Ex.: Cliente pediu simulação do empreendimento X…"
              maxLength={MAX_HISTORICO_TEXTO}
              rows={4}
              disabled={triagemSaving}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={triagemSaving}
              onClick={() => void skipTriagemHistory()}
            >
              Não, obrigado
            </Button>
            <Button
              type="button"
              disabled={triagemSaving}
              onClick={() => void saveTriagemHistory()}
            >
              {triagemSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Salvar histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(manualTriagem)}
        onOpenChange={(open) => {
          if (!open && !manualTriagemSaving) closeManualTriagem();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Registrar histórico</DialogTitle>
                <DialogDescription>
                  {manualTriagem
                    ? `Relato sobre ${manualTriagem.leadNome}. A etapa do funil não será alterada.`
                    : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="funil-manual-historico-texto">Relato</Label>
              <span className="text-xs text-muted-foreground">
                {manualTriagemTexto.length}/{MAX_HISTORICO_TEXTO}
              </span>
            </div>
            <Textarea
              id="funil-manual-historico-texto"
              value={manualTriagemTexto}
              onChange={(e) => setManualTriagemTexto(e.target.value)}
              placeholder="Ex.: Cliente pediu simulação do empreendimento X…"
              maxLength={MAX_HISTORICO_TEXTO}
              rows={4}
              disabled={manualTriagemSaving}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={manualTriagemSaving}
              onClick={closeManualTriagem}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={manualTriagemSaving}
              onClick={() => void saveManualTriagem()}
            >
              {manualTriagemSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ANALISTA_COLUMNS: {
  id: AnaliseStatus;
  label: string;
}[] = [
  { id: "pendente", label: "Pendente" },
  { id: "em_analise", label: "Em análise" },
  { id: "aprovado", label: "Aprovado" },
  { id: "reprovado", label: "Reprovado" },
];

function AnalistaFunilBoard() {
  const navigate = useNavigate();
  const {
    documentacaoFontes,
    documentacaoStatus1,
    documentacaoStatus2,
    addItem,
  } = useCatalog();
  const fonteOptions = documentacaoFontes;
  const status1Options = documentacaoStatus1;
  const status2Options = documentacaoStatus2;

  const [items, setItems] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);
  const showAnalistaSkeleton = useDeferredLoading(loading && items.length === 0);
  const [docPrompt, setDocPrompt] = useState<Analise | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [docTarget, setDocTarget] = useState<Analise | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docFonte, setDocFonte] = useState("Outro");
  const [docStatus1, setDocStatus1] = useState("Em análise");
  const [docStatus2, setDocStatus2] = useState("Andamento");
  const [docObs, setDocObs] = useState("");
  const [docTemEntrada, setDocTemEntrada] = useState(false);
  const [docValorEntrada, setDocValorEntrada] = useState("");
  const [docTemFgts, setDocTemFgts] = useState(false);
  const [docValorFgts, setDocValorFgts] = useState("");
  const [docTemDependente, setDocTemDependente] = useState(false);
  const [quickCatalogOpen, setQuickCatalogOpen] = useState<
    null | "documentacao_fonte" | "documentacao_status1" | "documentacao_status2"
  >(null);
  const [quickCatalogLabel, setQuickCatalogLabel] = useState("");
  const [quickCatalogSaving, setQuickCatalogSaving] = useState(false);
  const [parecerTarget, setParecerTarget] = useState<Analise | null>(null);
  const [parecerStatus, setParecerStatus] = useState<AnaliseStatus>("aprovado");
  const [parecerTexto, setParecerTexto] = useState("");
  const [parecerSaving, setParecerSaving] = useState(false);
  const [vgvModalOpen, setVgvModalOpen] = useState(false);
  const [vgvValor, setVgvValor] = useState("");
  const fichaGuiadaAnalista =
    getSession()?.tenant?.modules?.fichaAnaliseGuiada === true;
  const [statusFichaOpen, setStatusFichaOpen] = useState(false);
  const [statusFicha1, setStatusFicha1] = useState("Aprovado");
  const [statusFicha2, setStatusFicha2] = useState("Andamento");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAnalises());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a fila de análise.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssumir(item: Analise) {
    try {
      const updated = await assumirAnalise(item.id);
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success("Processo assumido (Em análise).");
      setDocPrompt(updated);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível assumir.",
      );
    }
  }

  /** Evita auto-registro quando o usuário escolhe preencher o formulário. */
  const skipAutoDocRef = useRef(false);

  function defaultDocFonte() {
    return pickCatalogLabel(fonteOptions, ["Outro"]);
  }

  function defaultDocStatus1() {
    return pickCatalogLabel(status1Options, ["Em análise"]);
  }

  function defaultDocStatus2() {
    return pickCatalogLabel(status2Options, ["Andamento"]);
  }

  async function autoRegisterDoc(item: Analise) {
    try {
      const existing = await fetchDocumentacoes();
      // Uma ficha por lead: se corretor/gerente já registrou, não cria outra.
      if (existing.some((d) => d.leadId === item.leadId)) {
        toast.success("Documentação já existente para este cliente.");
        return;
      }
      const created = await createDocumentacao({
        leadId: item.leadId,
        nome: item.nome,
        construtoraId: item.lead.construtoraId,
        empreendimentoId: item.lead.empreendimentoId,
        fonte: defaultDocFonte(),
        status1: defaultDocStatus1(),
        status2: defaultDocStatus2(),
        corretorId: item.lead.corretorId,
        vgv: null,
        obs: null,
        dataAnalise: new Date().toISOString().slice(0, 10),
        temEntrada: item.temEntrada,
        valorEntrada: item.temEntrada ? item.valorEntrada : null,
        temFgts: item.temFgts,
        valorFgts: item.temFgts ? item.valorFgts : null,
        temDependente: item.temDependente,
      });
      toast.success("Documentação registrada automaticamente.");
      void celebrateAfterDocumentacao({
        corretorId: created.corretorId ?? item.lead.corretorId,
        docCreated: true,
        becameVendido: isStatusVendido(created.status2),
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar a documentação automaticamente.",
      );
    }
  }

  function openDocForm(item: Analise) {
    setDocTarget(item);
    setDocFonte(defaultDocFonte());
    setDocStatus1(defaultDocStatus1());
    setDocStatus2(defaultDocStatus2());
    setDocObs("");
    setDocTemEntrada(item.temEntrada);
    setDocValorEntrada(
      item.valorEntrada != null ? formatMoneyInput(item.valorEntrada) : "",
    );
    setDocTemFgts(item.temFgts);
    setDocValorFgts(
      item.valorFgts != null ? formatMoneyInput(item.valorFgts) : "",
    );
    setDocTemDependente(item.temDependente);
    setDocOpen(true);
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
      const count =
        quickCatalogOpen === "documentacao_fonte"
          ? fonteOptions.length
          : quickCatalogOpen === "documentacao_status1"
            ? status1Options.length
            : status2Options.length;
      await addItem({
        type: quickCatalogOpen,
        label,
        color: nextCatalogColor(count),
      });
      if (quickCatalogOpen === "documentacao_fonte") setDocFonte(label);
      if (quickCatalogOpen === "documentacao_status1") setDocStatus1(label);
      if (quickCatalogOpen === "documentacao_status2") setDocStatus2(label);
      setQuickCatalogOpen(null);
      setQuickCatalogLabel("");
      toast.success(`"${label}" adicionado.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível adicionar.",
      );
    } finally {
      setQuickCatalogSaving(false);
    }
  }

  async function saveDoc() {
    if (!docTarget) return;
    setDocSaving(true);
    try {
      const created = await createDocumentacao({
        leadId: docTarget.leadId,
        nome: docTarget.nome,
        construtoraId: docTarget.lead.construtoraId,
        empreendimentoId: docTarget.lead.empreendimentoId,
        fonte: docFonte,
        status1: docStatus1,
        status2: docStatus2,
        corretorId: docTarget.lead.corretorId,
        vgv: null,
        obs: docObs.trim() || null,
        dataAnalise: new Date().toISOString().slice(0, 10),
        temEntrada: docTemEntrada,
        valorEntrada: docTemEntrada
          ? parseOptionalMoneyInput(docValorEntrada)
          : null,
        temFgts: docTemFgts,
        valorFgts: docTemFgts
          ? parseOptionalMoneyInput(docValorFgts)
          : null,
        temDependente: docTemDependente,
      });
      toast.success("Documentação registrada.");
      void celebrateAfterDocumentacao({
        corretorId: created.corretorId ?? docTarget.lead.corretorId,
        docCreated: true,
        becameVendido: isStatusVendido(created.status2 ?? docStatus2),
      });
      setDocOpen(false);
      setDocTarget(null);
      void navigate({ to: "/documentacao" });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar a documentação.",
      );
    } finally {
      setDocSaving(false);
    }
  }

  async function saveParecer() {
    if (!parecerTarget) return;
    if (fichaGuiadaAnalista && (parecerStatus === "aprovado" || parecerStatus === "reprovado")) {
      setStatusFicha1(parecerStatus === "aprovado" ? "Aprovado" : "Reprovado");
      setStatusFicha2("Andamento");
      setStatusFichaOpen(true);
      return;
    }
    if (parecerStatus === "aprovado") {
      setVgvValor("");
      setVgvModalOpen(true);
      return;
    }
    await commitParecer(null);
  }

  async function confirmarStatusFicha() {
    if (!parecerTarget) return;
    if (!statusFicha1 || !statusFicha2) {
      toast.error("Selecione os dois status.");
      return;
    }
    setParecerSaving(true);
    try {
      const docs = await fetchDocumentacoes();
      const doc = docs.find((item) => item.leadId === parecerTarget.leadId);
      if (!doc) {
        toast.error("Abra a ficha levando o lead para a análise antes do parecer.");
        return;
      }
      if (doc.autor.id !== getSession()?.id) {
        toast.error("Só quem abriu a ficha pode atualizar estes status.");
        return;
      }
      await updateDocumentacao(doc.id, {
        status1: statusFicha1,
        status2: statusFicha2,
      });
      setStatusFichaOpen(false);
      await commitParecer(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível atualizar a ficha.",
      );
    } finally {
      setParecerSaving(false);
    }
  }

  async function confirmParecerComVgv() {
    const vgv = parseOptionalMoneyInput(vgvValor);
    if (vgv == null) {
      toast.error("Informe o VGV do processo.");
      return;
    }
    if (vgv < 0) {
      toast.error("VGV inválido.");
      return;
    }
    setVgvModalOpen(false);
    await commitParecer(vgv);
  }

  async function commitParecer(vgv: number | null) {
    if (!parecerTarget) return;
    setParecerSaving(true);
    try {
      const updated = await updateAnalise(parecerTarget.id, {
        status: parecerStatus,
        parecer: parecerTexto.trim() || null,
        ...(vgv != null ? { vgv } : {}),
      });
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(
        parecerStatus === "aprovado"
          ? "Processo aprovado — documentação e VGV atualizados."
          : "Processo reprovado — documentação atualizada.",
      );
      setParecerTarget(null);
      setVgvModalOpen(false);
      setVgvValor("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setParecerSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fila de Análise"
        description="Processos de toda a imobiliária: em análise e com resultado."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/resultado">Abrir Análise</Link>
          </Button>
        }
      />

      {showAnalistaSkeleton ? (
        <SkeletonKanban columns={ANALISTA_COLUMNS.length} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
          {ANALISTA_COLUMNS.map((col) => {
            const colItems = items.filter((i) => i.status === col.id);
            return (
              <FunilColumnShell
                key={col.id}
                title={col.label}
                count={colItems.length}
                color="#334155"
              >
                  {colItems.map((item) => (
                    <Card key={item.id} className="space-y-2 rounded-xl border-black/5 p-3 shadow-sm">
                      <div className="text-sm font-semibold text-foreground/80 truncate">
                        {item.nome}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.lead.tipo === "cliente" ? "Cliente · " : ""}
                        {item.lead.corretor?.name ?? "Sem responsável"}
                        {item.lead.corretor?.role === "gerente"
                          ? " (Gerente)"
                          : item.lead.corretor?.role === "admin"
                            ? " (Admin)"
                            : ""}
                        {item.lead.empreendimento
                          ? ` · ${item.lead.empreendimento.nome}`
                          : ""}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {col.id === "pendente" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => void handleAssumir(item)}
                          >
                            Assumir
                          </Button>
                        )}
                        {col.id === "em_analise" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openDocForm(item)}
                            >
                              Documentação
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setParecerTarget(item);
                                setParecerStatus("aprovado");
                                setParecerTexto(item.parecer ?? "");
                              }}
                            >
                              Parecer
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
              </FunilColumnShell>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(docPrompt)}
        onOpenChange={(open) => {
          if (open) return;
          const target = docPrompt;
          setDocPrompt(null);
          if (!skipAutoDocRef.current && target) {
            void autoRegisterDoc(target);
          }
          skipAutoDocRef.current = false;
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar documentação?</AlertDialogTitle>
            <AlertDialogDescription>
              {docPrompt
                ? `O processo de ${docPrompt.nome} foi assumido. Deseja registrar a documentação agora? Construtora e empreendimento já vêm do lead. Se preferir depois, a documentação será criada automaticamente com valores padrão.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!docPrompt) return;
                skipAutoDocRef.current = true;
                const target = docPrompt;
                setDocPrompt(null);
                openDocForm(target);
              }}
            >
              Registrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialogShell
        open={docOpen}
        onOpenChange={setDocOpen}
        icon={<ClipboardList className="w-5 h-5" />}
        title="Registrar documentação"
        description={
          docTarget
            ? `${docTarget.nome} · dados do lead já preenchidos`
            : undefined
        }
      >
        <FormDialogBody>
          <FormSection title="Do processo (automático)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <DetailField
                label="Corretor"
                value={docTarget?.lead.corretor?.name ?? "—"}
              />
              <DetailField
                label="Gerente"
                value={
                  docTarget?.lead.corretor?.equipe?.gerente.name ?? "—"
                }
              />
              <DetailField
                label="Construtora"
                value={docTarget?.lead.construtora?.nome ?? "—"}
              />
              <DetailField
                label="Empreendimento"
                value={docTarget?.lead.empreendimento?.nome ?? "—"}
              />
            </div>
          </FormSection>
          <FormSection title="Dados restantes">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Fonte</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setQuickCatalogLabel("");
                      setQuickCatalogOpen("documentacao_fonte");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nova
                  </Button>
                </div>
                <Select value={docFonte} onValueChange={setDocFonte}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonteOptions.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Status 1</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setQuickCatalogLabel("");
                      setQuickCatalogOpen("documentacao_status1");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Novo
                  </Button>
                </div>
                <Select value={docStatus1} onValueChange={setDocStatus1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {status1Options.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Status 2</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setQuickCatalogLabel("");
                      setQuickCatalogOpen("documentacao_status2");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Novo
                  </Button>
                </div>
                <Select value={docStatus2} onValueChange={setDocStatus2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {status2Options.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 sm:col-span-2 rounded-lg border border-border/60 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Condições do cliente
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="doc-tem-entrada">Tem entrada?</Label>
                      <Switch
                        id="doc-tem-entrada"
                        checked={docTemEntrada}
                        onCheckedChange={(checked) => {
                          setDocTemEntrada(checked);
                          if (!checked) setDocValorEntrada("");
                        }}
                      />
                    </div>
                    {docTemEntrada && (
                      <Input
                        inputMode="numeric"
                        placeholder="0,00"
                        value={docValorEntrada}
                        onChange={(e) =>
                          setDocValorEntrada(maskMoneyInput(e.target.value))
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="doc-tem-fgts">Tem FGTS?</Label>
                      <Switch
                        id="doc-tem-fgts"
                        checked={docTemFgts}
                        onCheckedChange={(checked) => {
                          setDocTemFgts(checked);
                          if (!checked) setDocValorFgts("");
                        }}
                      />
                    </div>
                    {docTemFgts && (
                      <Input
                        inputMode="numeric"
                        placeholder="0,00"
                        value={docValorFgts}
                        onChange={(e) =>
                          setDocValorFgts(maskMoneyInput(e.target.value))
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>OBS</Label>
                <Input
                  value={docObs}
                  onChange={(e) => setDocObs(e.target.value)}
                />
              </div>
            </div>
          </FormSection>
        </FormDialogBody>
        <FormDialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDocOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={docSaving}
            onClick={() => void saveDoc()}
          >
            {docSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Salvar documentação
          </Button>
        </FormDialogActions>
      </FormDialogShell>

      <Dialog
        open={Boolean(parecerTarget) && !vgvModalOpen && !statusFichaOpen}
        onOpenChange={(o) => {
          if (!o) {
            setParecerTarget(null);
            setVgvModalOpen(false);
            setVgvValor("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parecer da análise</DialogTitle>
            <DialogDescription>{parecerTarget?.nome}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <Select
                value={parecerStatus}
                onValueChange={(v) => setParecerStatus(v as AnaliseStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Parecer</Label>
              <Input
                value={parecerTexto}
                onChange={(e) => setParecerTexto(e.target.value)}
                placeholder="Observações do parecer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParecerTarget(null)}>
              Cancelar
            </Button>
            <Button disabled={parecerSaving} onClick={() => void saveParecer()}>
              {parecerSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusFichaOpen} onOpenChange={(open) => !parecerSaving && setStatusFichaOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {parecerStatus === "aprovado" ? "Aprovado" : "Reprovado"}
            </DialogTitle>
            <DialogDescription>
              Escolha o status da análise e o status do andamento. A ficha já aberta será atualizada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Status da análise</Label>
              <Select value={statusFicha1} onValueChange={setStatusFicha1}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {status1Options.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status do andamento</Label>
              <Select value={statusFicha2} onValueChange={setStatusFicha2}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {status2Options.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={parecerSaving} onClick={() => setStatusFichaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={parecerSaving} onClick={() => void confirmarStatusFicha()}>
              Salvar status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={vgvModalOpen}
        onOpenChange={(o) => {
          if (!o) {
            setVgvModalOpen(false);
            setVgvValor("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe o VGV</DialogTitle>
            <DialogDescription>
              {parecerTarget
                ? `Valor geral de vendas do processo de ${parecerTarget.nome}. Esse valor atualiza a documentação e os indicadores.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="parecer-vgv">VGV (R$)</Label>
            <Input
              id="parecer-vgv"
              inputMode="numeric"
              placeholder="0,00"
              value={vgvValor}
              onChange={(e) => setVgvValor(maskMoneyInput(e.target.value))}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVgvModalOpen(false);
                setVgvValor("");
              }}
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={parecerSaving}
              onClick={() => void confirmParecerComVgv()}
            >
              {parecerSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(quickCatalogOpen)}
        onOpenChange={(o) => !o && setQuickCatalogOpen(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {quickCatalogOpen === "documentacao_fonte"
                ? "Nova fonte"
                : quickCatalogOpen === "documentacao_status1"
                  ? "Novo status 1"
                  : "Novo status 2"}
            </DialogTitle>
            <DialogDescription>
              O item fica disponível na fila do analista e em Configurações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={quickCatalogLabel}
              onChange={(e) => setQuickCatalogLabel(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveQuickCatalog();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickCatalogOpen(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickCatalogSaving}
              onClick={() => void saveQuickCatalog()}
            >
              {quickCatalogSaving && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
