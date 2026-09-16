import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { LeadDetalheDialog } from "@/components/lead-detalhe-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { getSession } from "@/lib/auth";
import {
  canViewTeamData,
  canWriteTriagem,
  isCorretorLike,
} from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { brl, type Lead } from "@/lib/crm-types";
import { useLeads } from "@/lib/leads-store";
import { getWhatsAppUrl } from "@/lib/env";
import { phoneDigits } from "@/lib/phone";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { SOFT_BTN } from "@/lib/soft-btn";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { FILTER_CONTROL } from "@/lib/filter-bar";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { useCatalog } from "@/lib/catalog-store";
import {
  createTriagemEvent,
  fetchTriagemKpis,
  type TriagemContact,
  type TriagemKpis,
  type TriagemOrigem,
} from "@/lib/triagem-api";
import { prependTriagemHistoryCached } from "@/lib/triagem-history-cache";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import {
  triagemHerdadaHint,
  triagemHerdadaLabel,
} from "@/lib/triagem-herdada";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HistoryTimeline,
  MAX_TRIAGEM_TEXTO,
  personInitials,
  useTriagemHistory,
} from "@/components/triagem-history-timeline";
import {
  ClipboardList,
  Clock,
  Clock3,
  Plus,
  Search,
  Target,
  UserRound,
  FileText,
  Loader2,
  Repeat,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TriagemSearch = {
  leadId?: string;
  stage?: string;
};

export const Route = createFileRoute("/_app/triagem")({
  head: () => ({ meta: [{ title: "Triagem — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): TriagemSearch => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    stage: typeof search.stage === "string" ? search.stage : undefined,
  }),
  component: TriagemPage,
});

const MAX_TEXTO = MAX_TRIAGEM_TEXTO;

function leadToContact(l: Lead): TriagemContact {
  return {
    id: l.id,
    tipo: l.tipo,
    nome: l.nome,
    telefone: l.telefone,
    email: l.email,
    stage: l.stage,
    prioridade: l.prioridade,
    interesse: l.interesse,
    cidade: l.cidade,
    bairro: l.bairro,
    corretorId: l.corretorId ?? null,
    corretor: l.corretorId ? { id: l.corretorId, name: l.corretor } : null,
    origemAtrasoLiberacao: l.origemAtrasoLiberacao ?? null,
    triagemOrigemHerdada: l.triagemOrigemHerdada ?? null,
    updatedAt: l.updatedAt,
  };
}

function TriagemPage() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;

  if (!user) return null;
  if (isManager) return <ManagerTriagem />;
  return <CorretorTriagem />;
}

function sortTriagemContacts(list: TriagemContact[]) {
  return [...list].sort((a, b) => {
    const ha = a.triagemOrigemHerdada || a.origemAtrasoLiberacao ? 0 : 1;
    const hb = b.triagemOrigemHerdada || b.origemAtrasoLiberacao ? 0 : 1;
    if (ha !== hb) return ha - hb;
    return 0;
  });
}

function formatRelativePt(iso?: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.round(hours / 24);
  return `Há ${days}d`;
}

function formatDurationMs(ms: number) {
  if (ms <= 0) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function TriagemLeadCard({
  lead,
  stageName,
  stageColor,
  active,
  onSelect,
  onDetails,
}: {
  lead: Lead;
  stageName: string;
  stageColor?: string | null;
  active: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const herdada = triagemHerdadaLabel(
    lead.triagemOrigemHerdada ?? lead.origemAtrasoLiberacao,
  );
  const digits = phoneDigits(lead.telefone);
  const wa = digits.length >= 10 ? getWhatsAppUrl(undefined, digits) : null;
  const metaChips = [
    lead.estadoCivil,
    lead.tipoRenda,
  ].filter(Boolean) as string[];
  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
        active
          ? "border-sky-200 bg-sky-50 ring-1 ring-sky-100 dark:border-sky-900/50 dark:bg-sky-950/25 dark:ring-sky-900/40"
          : "border-black/5 bg-card hover:bg-muted/40",
        herdada && !active && "border-amber-200 bg-amber-50/90",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback
              className={cn(
                "text-xs font-semibold text-white",
                lostLeadAvatarClass(lead.nome),
              )}
            >
              {personInitials(lead.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{lead.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lead.telefone || "Sem telefone"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    catalogColorBadgeClass(stageColor),
                    "h-6 w-auto min-w-0 max-w-[10rem] rounded-full px-2.5 justify-center",
                  )}
                  style={catalogColorBadgeStyle(stageColor)}
                  title={stageName}
                >
                  {stageName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativePt(lead.updatedAtIso ?? lead.updatedAt)}
                </span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {lead.tipo === "cliente" ? (
                <span className="inline-flex items-center rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Cliente
                </span>
              ) : null}
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:brightness-110"
                >
                  <FaWhatsapp className="size-3" />
                  WhatsApp
                </a>
              ) : null}
              {lead.renda != null ? (
                <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:text-sky-300">
                  {brl(lead.renda)}
                </span>
              ) : null}
              {metaChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {chip}
                </span>
              ))}
              {herdada ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
                  <Repeat className="size-3" />
                  {herdada}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs", SOFT_BTN)}
          onClick={onDetails}
        >
          Ver detalhes
        </Button>
        <Button
          asChild
          size="sm"
          className={cn("h-8 text-xs", BRAND_GRADIENT_BTN)}
          style={BRAND_GRADIENT_STYLE}
        >
          <Link to="/funil" search={{ lead: lead.id }}>
            Avançar etapa
          </Link>
        </Button>
      </div>
    </div>
  );
}

function TriagemRelatoBar({
  id,
  value,
  onChange,
  onSubmit,
  saving,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <form
      className="shrink-0 border-t border-black/5 bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-end gap-2">
        <Textarea
          id={id}
          value={value}
          maxLength={MAX_TEXTO}
          rows={2}
          className="min-h-11 max-h-28 resize-none rounded-xl"
          placeholder="Escrever relato… (Ctrl+Enter para registrar)"
          disabled={saving}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          className={cn("h-11 w-11 shrink-0 rounded-xl", BRAND_GRADIENT_BTN)}
          style={BRAND_GRADIENT_STYLE}
          disabled={saving || !value.trim()}
          title="Registrar relato"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}

function useStageLabel() {
  const { funnelStages } = useCatalog();
  return useCallback(
    (slug: string | null) =>
      slug ? (funnelStages.find((s) => s.id === slug)?.name ?? slug) : "—",
    [funnelStages],
  );
}

/* ───────────────────────── Corretor ───────────────────────── */

function CorretorTriagem() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = getSession();
  const { leads: allLeads, refresh } = useLeads();
  const { funnelStages } = useCatalog();
  const stageName = useStageLabel();
  const [kpis, setKpis] = useState<TriagemKpis | null>(null);

  const mine = useMemo(() => {
    if (!user) return [];
    return allLeads.filter(
      (l) => l.corretorId === user.id || l.corretor === user.name,
    );
  }, [allLeads, user]);

  const leads = useMemo(
    () => mine.filter((l) => l.tipo === "lead").map(leadToContact),
    [mine],
  );
  const clientes = useMemo(
    () => mine.filter((l) => l.tipo === "cliente").map(leadToContact),
    [mine],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchTriagemKpis()
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch(() => {
        if (!cancelled) setKpis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [allLeads]);

  const [selectedId, setSelectedId] = useState<string | null>(
    search.leadId ?? null,
  );
  const {
    events,
    setEvents,
    loading: historyLoading,
  } = useTriagemHistory(selectedId);

  const [createOpen, setCreateOpen] = useState(Boolean(search.leadId));
  const [createOrigem, setCreateOrigem] = useState<TriagemOrigem>(
    search.leadId ? "funil" : "manual",
  );
  const [createLeadId, setCreateLeadId] = useState(search.leadId ?? "");
  const [createClienteId, setCreateClienteId] = useState("");
  const [createStage, setCreateStage] = useState<string>(
    search.stage ?? "__none__",
  );
  const [createTexto, setCreateTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("__all__");
  /** Relato rápido no painel (sem avançar etapa). */
  const [quickTexto, setQuickTexto] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const filteredLeads = useMemo(
    () =>
      sortTriagemContacts(
        stageFilter === "__all__"
          ? leads
          : leads.filter((c) => c.stage === stageFilter),
      ),
    [leads, stageFilter],
  );
  const filteredClientes = useMemo(
    () =>
      stageFilter === "__all__"
        ? clientes
        : clientes.filter((c) => c.stage === stageFilter),
    [clientes, stageFilter],
  );

  // Prefill vindo do funil (?leadId=&stage=) — listas já vêm do store em memória.
  useEffect(() => {
    if (!search.leadId) return;
    setSelectedId(search.leadId);
    setCreateLeadId(search.leadId);
    setCreateClienteId("");
    setCreateStage(search.stage ?? "__none__");
    setCreateOrigem("funil");
    setCreateTexto("");
    setCreateOpen(true);
  }, [search.leadId, search.stage]);

  function selectContact(id: string) {
    setSelectedId(id);
    setQuickTexto("");
  }

  function openCreateManual() {
    setCreateOrigem("manual");
    const selected = [...leads, ...clientes].find((c) => c.id === selectedId);
    if (selected?.tipo === "cliente") {
      setCreateLeadId("");
      setCreateClienteId(selected.id);
    } else if (selected) {
      setCreateLeadId(selected.id);
      setCreateClienteId("");
    } else {
      setCreateLeadId("");
      setCreateClienteId("");
    }
    setCreateStage("__none__");
    setCreateTexto("");
    setCreateOpen(true);
  }

  async function submitQuickRelato() {
    if (!selectedId) {
      toast.error("Selecione um lead ou cliente.");
      return;
    }
    const texto = quickTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }

    setQuickSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: selectedId,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(selectedId, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      setQuickTexto("");
      toast.success("Relato registrado (etapa mantida).");
      void refresh({ silent: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar o relato.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  function closeCreate() {
    setCreateOpen(false);
    if (search.leadId || search.stage) {
      void navigate({ to: "/triagem", search: {}, replace: true });
    }
  }

  const selectedContact = useMemo(() => {
    const all = [...leads, ...clientes];
    return all.find((c) => c.id === selectedId) ?? null;
  }, [leads, clientes, selectedId]);
  const detalheLead = mine.find((l) => l.id === detalheId) ?? null;
  const leadMap = useMemo(
    () => new Map(mine.map((l) => [l.id, l])),
    [mine],
  );

  async function submitCreate() {
    const leadId = createLeadId || createClienteId;
    if (!leadId) {
      toast.error("Selecione um lead ou um cliente.");
      return;
    }
    const texto = createTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }

    setSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId,
        texto,
        origem: createOrigem,
        ...(createStage !== "__none__" ? { stage: createStage } : {}),
      });
      prependTriagemHistoryCached(leadId, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      toast.success("Relato registrado na triagem.");
      closeCreate();
      setSelectedId(leadId);
      void refresh({ silent: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar o relato.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <PageHeader
          eyebrow="Triagem"
          title="Triagem"
          description="Organize, analise e direcione cada oportunidade."
          actions={
            <Button size="sm" onClick={openCreateManual}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar lead
            </Button>
          }
        />
        <PagePanel inset="muted" className="mb-4">
          <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 xl:grid-cols-4">
            <FinanceKpiCard
              label="Meus leads"
              value={leads.length}
              icon={ClipboardList}
              tone="blue"
              format="number"
              variant="dash"
              detail="Aguardando atendimento"
            />
            <FinanceKpiCard
              label="Clientes"
              value={clientes.length}
              icon={UserRound}
              tone="violet"
              format="number"
              variant="dash"
            />
            <FinanceKpiCard
              label="Em análise"
              value={
                mine.filter((l) => {
                  const papel = funnelStages.find((s) => s.id === l.stage)?.papel;
                  return papel === "analise";
                }).length
              }
              icon={Target}
              tone="orange"
              format="number"
              variant="dash"
            />
            <FinanceKpiCard
              label="Tempo médio"
              value={0}
              valueLabel={formatDurationMs(kpis?.tempoMedioMs ?? 0)}
              icon={Clock3}
              tone="teal"
              format="number"
              variant="dash"
              detail={
                kpis?.amostra
                  ? `${kpis.amostra} relato${kpis.amostra === 1 ? "" : "s"}`
                  : "Tempo entre relatos"
              }
            />
          </div>
        </PagePanel>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:w-55">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Etapa do funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as etapas</SelectItem>
                {funnelStages
                  .filter((s) => s.papel !== "perdido")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {stageFilter !== "__all__" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStageFilter("__all__")}
            >
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 max-lg:min-h-0 lg:grid-cols-12 lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-4 max-lg:min-h-80 lg:col-span-5">
          <section className={cn(SOFT_SURFACE, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-2">
              <div>
                <h2 className="text-sm font-semibold">Leads</h2>
                <p className="text-xs text-muted-foreground">
                  {filteredLeads.length}
                  {stageFilter !== "__all__" ? ` de ${leads.length}` : ""}
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-muted/20 p-3">
              {filteredLeads.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {stageFilter !== "__all__"
                    ? "Nenhum lead nesta etapa."
                    : "Nenhum lead."}
                </p>
              )}
              {filteredLeads.map((c) => {
                const full = leadMap.get(c.id);
                if (!full) return null;
                const stage = funnelStages.find((s) => s.id === c.stage);
                return (
                  <TriagemLeadCard
                    key={c.id}
                    lead={full}
                    stageName={stageName(c.stage)}
                    stageColor={stage?.color}
                    active={selectedId === c.id}
                    onSelect={() => selectContact(c.id)}
                    onDetails={() => {
                      selectContact(c.id);
                      setDetalheId(c.id);
                    }}
                  />
                );
              })}
            </div>
          </section>

          <section className={cn(SOFT_SURFACE, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
            <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold">
              Clientes
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredClientes.length})
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-muted/20 p-3">
              {filteredClientes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum cliente.
                </p>
              )}
              {filteredClientes.map((c) => {
                const full = leadMap.get(c.id);
                if (!full) return null;
                const stage = funnelStages.find((s) => s.id === c.stage);
                return (
                  <TriagemLeadCard
                    key={c.id}
                    lead={full}
                    stageName={stageName(c.stage)}
                    stageColor={stage?.color}
                    active={selectedId === c.id}
                    onSelect={() => selectContact(c.id)}
                    onDetails={() => {
                      selectContact(c.id);
                      setDetalheId(c.id);
                    }}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <section className={cn(SOFT_SURFACE, "flex min-h-0 flex-col overflow-hidden max-lg:min-h-80 lg:col-span-7")}>
          {!selectedContact ? (
            <>
              <div className="shrink-0 px-4 pt-4 pb-1">
                <h2 className="text-sm font-semibold">Histórico do lead</h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhe cada passo do atendimento.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-3">
                <TriagemEmptyState
                  heading="Selecione um lead para ver o histórico"
                  description="Atividades, alterações de etapa, documentos e interações."
                  illustration={<HistoryEmptyIllustration />}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-black/5 px-4 py-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold text-white",
                      lostLeadAvatarClass(selectedContact.nome),
                    )}
                  >
                    {personInitials(selectedContact.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {selectedContact.nome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedContact.tipo === "cliente" ? "Cliente" : "Lead"} ·{" "}
                    {stageName(selectedContact.stage)}
                  </p>
                </div>
              </div>
              {triagemHerdadaHint(
                selectedContact.triagemOrigemHerdada ??
                  selectedContact.origemAtrasoLiberacao,
              ) ? (
                <div className="shrink-0 mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                  <span className="font-semibold">
                    {triagemHerdadaLabel(
                      selectedContact.triagemOrigemHerdada ??
                        selectedContact.origemAtrasoLiberacao,
                    )}
                    .{" "}
                  </span>
                  {triagemHerdadaHint(
                    selectedContact.triagemOrigemHerdada ??
                      selectedContact.origemAtrasoLiberacao,
                  )}
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                <HistoryTimeline
                  events={events}
                  contactName={selectedContact.nome}
                  stageLabel={stageName}
                  fallbackStage={selectedContact.stage}
                  loading={historyLoading}
                  leadId={selectedId}
                  onEventUpdated={(updated) => {
                    setEvents((prev) =>
                      prev.map((e) => (e.id === updated.id ? updated : e)),
                    );
                    void refresh({ silent: true });
                  }}
                />
              </div>
              <TriagemRelatoBar
                id="triagem-quick-texto"
                value={quickTexto}
                onChange={setQuickTexto}
                onSubmit={() => void submitQuickRelato()}
                saving={quickSaving}
              />
            </>
          )}
        </section>
      </div>

      <LeadDetalheDialog
        lead={detalheLead}
        open={Boolean(detalheLead)}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
      />

      <FormDialogShell
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreate();
          else setCreateOpen(true);
        }}
        icon={<FileText className="w-5 h-5" />}
        title="Criar triagem"
        description={
          createOrigem === "funil"
            ? "Registre o histórico desta mudança de etapa no funil."
            : "Registre um relato. Deixe “Manter etapa atual” se não quiser avançar o funil."
        }
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={closeCreate}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void submitCreate()}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection title="Contato">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead</Label>
                <Select
                  value={createLeadId || "__none__"}
                  onValueChange={(v) => {
                    setCreateLeadId(v === "__none__" ? "" : v);
                    if (v !== "__none__") setCreateClienteId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={createClienteId || "__none__"}
                  onValueChange={(v) => {
                    setCreateClienteId(v === "__none__" ? "" : v);
                    if (v !== "__none__") setCreateLeadId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Etapa (opcional)">
            <div className="space-y-2">
              <Label>Avançar status</Label>
              <Select value={createStage} onValueChange={setCreateStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Manter etapa atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Manter etapa atual</SelectItem>
                  {funnelStages
                    .filter((s) => s.papel !== "perdido")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {createStage === "__none__" ? (
                <p className="text-xs text-muted-foreground">
                  O lead permanece na etapa atual — só o histórico é registrado.
                </p>
              ) : createOrigem === "funil" ? (
                <p className="text-xs text-muted-foreground">
                  A etapa já foi atualizada no funil; o relato será vinculado a{" "}
                  {stageName(createStage)}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ao salvar, o lead será movido para {stageName(createStage)}.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Relato">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="triagem-texto">O que aconteceu?</Label>
                <span className="text-xs text-muted-foreground">
                  {createTexto.length}/{MAX_TEXTO}
                </span>
              </div>
              <Textarea
                id="triagem-texto"
                value={createTexto}
                maxLength={MAX_TEXTO}
                rows={5}
                placeholder="Descreva o acontecimento (máx. 400 caracteres)..."
                onChange={(e) => setCreateTexto(e.target.value)}
              />
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}

/* ───────────────────────── Admin / Gerente ───────────────────────── */

function ManagerTriagem() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const isPlatformAdmin = user?.role === "super_admin";
  const canWrite = canWriteTriagem(user?.role);
  const { leads: allLeads, assignees, loading, refresh } = useLeads();
  const { funnelStages } = useCatalog();
  const stageName = useStageLabel();

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipesLoading, setEquipesLoading] = useState(false);
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>("__all__");
  const [corretorSearch, setCorretorSearch] = useState("");
  const [selectedCorretorId, setSelectedCorretorId] = useState<string | null>(
    null,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("__all__");
  const [kpis, setKpis] = useState<TriagemKpis | null>(null);
  const {
    events,
    setEvents,
    loading: historyLoading,
  } = useTriagemHistory(selectedLeadId);
  const [quickTexto, setQuickTexto] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [leadSort, setLeadSort] = useState<"recent" | "name">("recent");

  useEffect(() => {
    if (!isAdmin) return;
    setEquipesLoading(true);
    void fetchEquipes()
      .then(setEquipes)
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as equipes.",
        );
      })
      .finally(() => setEquipesLoading(false));
  }, [isAdmin]);

  const allCorretores = useMemo(
    () => assignees.filter((a) => !a.role || isCorretorLike(a.role)),
    [assignees],
  );

  const corretorIdsNaEquipe = useMemo(() => {
    if (!isAdmin || selectedEquipeId === "__all__") return null;
    if (selectedEquipeId === "__none__") {
      const inAny = new Set(
        equipes.flatMap((eq) => eq.membros.map((m) => m.id)),
      );
      return new Set(
        allCorretores.filter((c) => !inAny.has(c.id)).map((c) => c.id),
      );
    }
    const eq = equipes.find((e) => e.id === selectedEquipeId);
    return new Set((eq?.membros ?? []).map((m) => m.id));
  }, [isAdmin, selectedEquipeId, equipes, allCorretores]);

  const corretores = useMemo(() => {
    const byEquipe = !corretorIdsNaEquipe
      ? allCorretores
      : allCorretores.filter((c) => corretorIdsNaEquipe.has(c.id));
    const q = corretorSearch.trim().toLocaleLowerCase("pt-BR");
    if (!q) return byEquipe;
    return byEquipe.filter((c) =>
      c.name.toLocaleLowerCase("pt-BR").includes(q),
    );
  }, [allCorretores, corretorIdsNaEquipe, corretorSearch]);

  const leads = useMemo(() => {
    const raw = isPlatformAdmin
      ? allLeads.filter((l) => l.tipo === "lead")
      : !selectedCorretorId
        ? []
        : allLeads.filter(
            (l) => l.tipo === "lead" && l.corretorId === selectedCorretorId,
          );
    return raw.map(leadToContact);
  }, [allLeads, isPlatformAdmin, selectedCorretorId]);

  const filteredLeads = useMemo(() => {
    const sorted = sortTriagemContacts(
      stageFilter === "__all__"
        ? leads
        : leads.filter((l) => l.stage === stageFilter),
    );
    const byId = new Map(allLeads.map((l) => [l.id, l]));
    return [...sorted].sort((a, b) => {
      if (leadSort === "name") return a.nome.localeCompare(b.nome, "pt-BR");
      const ta = new Date(byId.get(a.id)?.updatedAtIso ?? a.updatedAt).getTime();
      const tb = new Date(byId.get(b.id)?.updatedAtIso ?? b.updatedAt).getTime();
      return tb - ta;
    });
  }, [leads, stageFilter, leadSort, allLeads]);

  const selectedLead =
    filteredLeads.find((l) => l.id === selectedLeadId) ??
    leads.find((l) => l.id === selectedLeadId) ??
    null;
  const selectedCorretor =
    allCorretores.find((c) => c.id === selectedCorretorId) ??
    corretores.find((c) => c.id === selectedCorretorId);
  const detalheLead = allLeads.find((l) => l.id === detalheId) ?? null;

  const leadStatsByCorretor = useMemo(() => {
    const map = new Map<string, { leads: number; analise: number }>();
    for (const l of allLeads) {
      if (l.tipo !== "lead" || !l.corretorId) continue;
      const cur = map.get(l.corretorId) ?? { leads: 0, analise: 0 };
      cur.leads += 1;
      if (funnelStages.find((s) => s.id === l.stage)?.papel === "analise") {
        cur.analise += 1;
      }
      map.set(l.corretorId, cur);
    }
    return map;
  }, [allLeads, funnelStages]);

  const teamLeads = useMemo(
    () => allLeads.filter((l) => l.tipo === "lead"),
    [allLeads],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchTriagemKpis({
      equipeId:
        selectedEquipeId !== "__all__" && selectedEquipeId !== "__none__"
          ? selectedEquipeId
          : undefined,
      semEquipe: selectedEquipeId === "__none__",
    })
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch(() => {
        if (!cancelled) setKpis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEquipeId, allLeads]);

  function selectEquipe(id: string) {
    setSelectedEquipeId(id);
    setCorretorSearch("");
    setSelectedCorretorId(null);
    setSelectedLeadId(null);
    setStageFilter("__all__");
  }

  function selectCorretor(id: string) {
    if (selectedCorretorId === id) {
      setSelectedCorretorId(null);
      setSelectedLeadId(null);
      setStageFilter("__all__");
      setQuickTexto("");
      return;
    }
    setSelectedCorretorId(id);
    setSelectedLeadId(null);
    setStageFilter("__all__");
    setQuickTexto("");
  }

  async function submitQuickRelato() {
    if (!selectedLeadId) {
      toast.error("Selecione um lead.");
      return;
    }
    const texto = quickTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TEXTO} caracteres.`);
      return;
    }

    setQuickSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: selectedLeadId,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(selectedLeadId, created);
      setEvents((prev) => [
        created,
        ...prev.filter((e) => e.id !== created.id),
      ]);
      setQuickTexto("");
      toast.success("Relato registrado (etapa mantida).");
      void refresh({ silent: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar o relato.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <PageHeader
          eyebrow="Triagem"
          title="Triagem"
          description="Organize, analise e direcione cada oportunidade."
        />
        <PagePanel inset="muted" className="mb-4">
          <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 xl:grid-cols-5">
            <FinanceKpiCard
              label="Corretores ativos"
              value={corretores.length}
              icon={UserRound}
              tone="blue"
              format="number"
              variant="dash"
              detail="Todas na equipe"
            />
            <FinanceKpiCard
              label="Leads em triagem"
              value={teamLeads.length}
              icon={ClipboardList}
              tone="violet"
              format="number"
              variant="dash"
              detail="Aguardando evolução"
            />
            <FinanceKpiCard
              label="Tempo médio de triagem"
              value={0}
              valueLabel={formatDurationMs(kpis?.tempoMedioMs ?? 0)}
              icon={Clock3}
              tone="orange"
              format="number"
              variant="dash"
              detail={
                kpis?.amostra
                  ? `${kpis.amostra} relato${kpis.amostra === 1 ? "" : "s"} medido${kpis.amostra === 1 ? "" : "s"}`
                  : "Sem relatos suficientes"
              }
            />
            <FinanceKpiCard
              label="Atualizados hoje"
              value={kpis?.atualizadosHoje ?? 0}
              icon={Target}
              tone="emerald"
              format="number"
              variant="dash"
              valorMesAnterior={kpis?.atualizadosOntem ?? 0}
              evolucaoPct={
                kpis?.atualizadosOntem
                  ? Math.round(
                      ((kpis.atualizadosHoje - kpis.atualizadosOntem) /
                        kpis.atualizadosOntem) *
                        1000,
                    ) / 10
                  : kpis?.atualizadosHoje
                    ? 100
                    : 0
              }
            />
            <FinanceKpiCard
              label="Triagem mais rápida"
              value={0}
              valueLabel={kpis?.maisRapida?.nome || "—"}
              icon={Zap}
              tone="teal"
              format="number"
              variant="dash"
              detail={
                kpis?.maisRapida
                  ? `Média de ${formatDurationMs(kpis.maisRapida.tempoMedioMs)}`
                  : "Menor tempo médio na equipe"
              }
            />
          </div>
        </PagePanel>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 max-lg:min-h-0 lg:grid-cols-12 lg:overflow-hidden">
        {isPlatformAdmin ? null : (
        <section className={cn(SOFT_SURFACE, "flex min-h-0 flex-col overflow-hidden max-lg:min-h-80 lg:col-span-3")}>
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div>
              <h2 className="text-sm font-semibold">Corretores</h2>
              <p className="text-xs text-muted-foreground">
                {corretores.length} na lista
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-sky-800">
              {corretores.length}
            </span>
          </div>

          {isAdmin && (
            <div className="shrink-0 space-y-1.5 px-4">
              <Label className="text-xs text-muted-foreground">Equipe</Label>
              <Select
                value={selectedEquipeId}
                onValueChange={selectEquipe}
                disabled={equipesLoading}
              >
                <SelectTrigger className={cn("h-9 bg-background", FILTER_CONTROL)}>
                  <SelectValue placeholder="Filtrar por equipe" />
                </SelectTrigger>
                <SelectContent>
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

          <div className="relative mx-4 mt-2 shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={corretorSearch}
              onChange={(e) => setCorretorSearch(e.target.value)}
              placeholder="Buscar corretor…"
              className="h-9 bg-background pl-8"
              aria-label="Buscar corretor pelo nome"
            />
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain bg-muted/20 p-3">
            {(loading || equipesLoading) && corretores.length === 0 && (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            )}
            {!loading && !equipesLoading && corretores.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {corretorSearch.trim()
                  ? "Nenhum corretor encontrado."
                  : isAdmin && selectedEquipeId !== "__all__"
                    ? "Nenhum corretor nesta equipe."
                    : "Nenhum corretor."}
              </p>
            )}
            {corretores.map((c) => {
              const stats = leadStatsByCorretor.get(c.id);
              const active = selectedCorretorId === c.id;
              return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCorretor(c.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-sky-200 bg-sky-50 font-medium dark:border-sky-900/50 dark:bg-sky-950/30"
                    : "border-black/5 bg-card hover:bg-muted/40",
                )}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-semibold text-white",
                      lostLeadAvatarClass(c.name),
                    )}
                  >
                    {personInitials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="shrink-0 text-right text-[11px] text-muted-foreground">
                  <span className="block font-semibold tabular-nums text-foreground">
                    {stats?.leads ?? 0}
                  </span>
                  leads
                </span>
                <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                  <span className="block font-semibold tabular-nums text-foreground">
                    {stats?.analise ?? 0}
                  </span>
                  em análise
                </span>
              </button>
              );
            })}
          </div>
        </section>
        )}

        <section className={cn(
          SOFT_SURFACE,
          "flex min-h-0 flex-col overflow-hidden max-lg:min-h-80",
          isPlatformAdmin ? "lg:col-span-4" : "lg:col-span-4",
        )}>
          {!isPlatformAdmin && !selectedCorretorId ? (
            <div className="p-4">
            <TriagemEmptyState
              title="Leads do corretor"
              icon={ClipboardList}
              heading="Selecione um corretor"
              description="Escolha um corretor na lista ao lado para visualizar os leads atribuídos a ele."
              illustration={<LeadsEmptyIllustration />}
            />
            </div>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2">
                <div>
                  <h2 className="text-sm font-semibold">
                    {isPlatformAdmin
                      ? "Empresas"
                      : `Leads de ${selectedCorretor?.name ?? "—"}`}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredLeads.length} na etapa
                  </p>
                </div>
                <Button asChild size="sm" className="h-8 text-xs">
                  <Link to="/leads">+ Adicionar lead</Link>
                </Button>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 px-4 pb-2">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className={cn("h-9 min-w-40 flex-1 bg-background", FILTER_CONTROL)}>
                  <SelectValue placeholder="Etapa do funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as etapas</SelectItem>
                  {funnelStages
                    .filter((s) => s.papel !== "perdido")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                value={leadSort}
                onValueChange={(v) => setLeadSort(v as "recent" | "name")}
              >
                <SelectTrigger className={cn("h-9 w-40 bg-background", FILTER_CONTROL)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="name">A–Z</SelectItem>
                </SelectContent>
              </Select>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-muted/20 p-3">
                {filteredLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {stageFilter !== "__all__"
                      ? "Nenhum lead nesta etapa."
                      : "Nenhum lead deste corretor."}
                  </p>
                )}
                {filteredLeads.map((l) => {
                  const full = allLeads.find((item) => item.id === l.id);
                  if (!full) return null;
                  const stage = funnelStages.find((s) => s.id === l.stage);
                  return (
                    <TriagemLeadCard
                      key={l.id}
                      lead={full}
                      stageName={stageName(l.stage)}
                      stageColor={stage?.color}
                      active={selectedLeadId === l.id}
                      onSelect={() => {
                        setSelectedLeadId(l.id);
                        setQuickTexto("");
                      }}
                      onDetails={() => {
                        setSelectedLeadId(l.id);
                        setDetalheId(l.id);
                        setQuickTexto("");
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className={cn(
          SOFT_SURFACE,
          "flex min-h-0 flex-col overflow-hidden max-lg:min-h-80",
          isPlatformAdmin ? "lg:col-span-8" : "lg:col-span-5",
        )}>
          {!isPlatformAdmin && !selectedCorretorId ? (
            <>
              <div className="shrink-0 px-4 pt-4 pb-1">
                <h2 className="text-sm font-semibold">Histórico do lead</h2>
                <p className="text-xs text-muted-foreground">
                  Cada passo do atendimento, da primeira conversa ao fechamento.
                </p>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <TriagemEmptyState
                  heading="O histórico aparece aqui"
                  description="Após selecionar um corretor, o histórico de atividades será exibido neste espaço."
                  illustration={<HistoryEmptyIllustration />}
                />
              </div>
            </>
          ) : !selectedLead ? (
            <>
              <div className="shrink-0 px-4 pt-4 pb-1">
                <h2 className="text-sm font-semibold">Histórico do lead</h2>
                <p className="text-xs text-muted-foreground">
                  Cada passo do atendimento, da primeira conversa ao fechamento.
                </p>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <TriagemEmptyState
                  heading="Selecione um lead para ver o histórico"
                  description="Atividades, alterações de etapa, documentos, propostas e interações."
                  illustration={<HistoryEmptyIllustration />}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-black/5 px-4 py-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold text-white",
                      lostLeadAvatarClass(selectedLead.nome),
                    )}
                  >
                    {personInitials(selectedLead.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {selectedLead.nome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Lead · {stageName(selectedLead.stage)}
                  </p>
                </div>
              </div>
              {triagemHerdadaHint(
                selectedLead.triagemOrigemHerdada ??
                  selectedLead.origemAtrasoLiberacao,
              ) ? (
                <div className="mx-3 mt-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                  <span className="font-semibold">
                    {triagemHerdadaLabel(
                      selectedLead.triagemOrigemHerdada ??
                        selectedLead.origemAtrasoLiberacao,
                    )}
                    .{" "}
                  </span>
                  {triagemHerdadaHint(
                    selectedLead.triagemOrigemHerdada ??
                      selectedLead.origemAtrasoLiberacao,
                  )}
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                <HistoryTimeline
                  events={events}
                  contactName={selectedLead.nome}
                  stageLabel={stageName}
                  fallbackStage={selectedLead.stage}
                  loading={historyLoading}
                  leadId={selectedLeadId}
                  onEventUpdated={(updated) => {
                    setEvents((prev) =>
                      prev.map((e) => (e.id === updated.id ? updated : e)),
                    );
                    void refresh({ silent: true });
                  }}
                />
              </div>
              {canWrite ? (
                <TriagemRelatoBar
                  id="triagem-gerente-quick-texto"
                  value={quickTexto}
                  onChange={setQuickTexto}
                  onSubmit={() => void submitQuickRelato()}
                  saving={quickSaving}
                />
              ) : null}
            </>
          )}
        </section>
      </div>

      <LeadDetalheDialog
        lead={detalheLead}
        open={Boolean(detalheLead)}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
        onUpdated={() => {
          void refresh({ silent: true });
        }}
      />
    </div>
  );
}

function TriagemEmptyState({
  title,
  icon: Icon,
  heading,
  description,
  illustration,
}: {
  title?: string;
  icon?: LucideIcon;
  heading: string;
  description: string;
  illustration: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {title && Icon ? (
        <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-2 text-center">
        {illustration}
        <div className="max-w-68 space-y-1.5">
          <p className="text-sm font-semibold text-primary">{heading}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function LeadsEmptyIllustration() {
  return (
    <div aria-hidden className="relative flex w-30 flex-col items-center gap-2">
      <div className="h-3.5 w-18 rounded-full bg-primary/15" />
      <div className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-2.5 shadow-sm">
        <span className="h-7 w-7 shrink-0 rounded-lg bg-primary/25" />
        <span className="h-2.5 flex-1 rounded-full bg-primary" />
      </div>
      <div className="flex w-[90%] items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-2.5 py-2">
        <span className="h-6 w-6 shrink-0 rounded-lg bg-primary/20" />
        <span className="h-2 flex-1 rounded-full bg-primary/35" />
      </div>
      <div className="flex w-[80%] items-center gap-2 rounded-xl border border-primary/10 bg-primary/3 px-2.5 py-1.5">
        <span className="h-5 w-5 shrink-0 rounded-md bg-primary/15" />
        <span className="h-1.5 flex-1 rounded-full bg-primary/25" />
      </div>
    </div>
  );
}

function HistoryEmptyIllustration() {
  return (
    <div aria-hidden className="relative">
      <div className="flex h-24 w-19 flex-col gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-3.5 shadow-sm">
        <span className="h-1.5 w-full rounded-full bg-primary/35" />
        <span className="h-1.5 w-[85%] rounded-full bg-primary/25" />
        <span className="h-1.5 w-[70%] rounded-full bg-primary/20" />
        <span className="mt-1 h-1.5 w-full rounded-full bg-primary/15" />
        <span className="h-1.5 w-[60%] rounded-full bg-primary/15" />
      </div>
      <span className="absolute -bottom-1.5 -right-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-white shadow-sm">
        <Clock className="h-4 w-4" />
      </span>
    </div>
  );
}
