import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FunnelBarChart } from "@/components/funnel-bar-chart";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canAccessRoute, isCorretorLike } from "@/lib/permissions";
import { hasUserModule } from "@/lib/user-permissions";
import { catalogColorToChartHex } from "@/lib/catalog-colors";
import { useCatalog, type FunnelStage } from "@/lib/catalog-store";
import {
  fetchDashboardAdmin,
  fetchDashboardCorretor,
  type DashboardAdmin,
  type DashboardCorretor,
} from "@/lib/dashboard-api";
import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Goal,
  Loader2,
  Percent,
  TrendingUp,
  UserRound,
  UserX,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";

function buildFunnelChartData(
  funil: { etapa: string; total: number }[],
  funnelStages: FunnelStage[],
) {
  const totals = new Map(funil.map((item) => [item.etapa, item.total]));
  const known = new Set(funnelStages.map((stage) => stage.id));
  const fromFunil = funnelStages
    .filter((stage) => stage.papel !== "perdido")
    .map((stage) => ({
      etapa: stage.name,
      total: totals.get(stage.id) ?? 0,
      fill: catalogColorToChartHex(stage.color),
    }))
    .filter((row) => row.total > 0);
  const extras = funil
    .filter((item) => item.total > 0 && !known.has(item.etapa))
    .map((item) => ({
      etapa: item.etapa,
      total: item.total,
      fill: "hsl(var(--primary))",
    }));
  return [...fromFunil, ...extras];
}

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zone Connection" }] }),
  component: Page,
});

const ANALISE_LABELS = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovada",
  reprovado: "Reprovada",
} as const;

const META_TIPO_LABEL: Record<string, string> = {
  vendas: "Vendas",
  documentacoes: "Documentações",
  vgv: "VGV",
};

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DASHBOARD_PAGE_SIZE = 5;

function usePagedList<T>(items: T[], pageSize = DASHBOARD_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages, items.length]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    total: items.length,
    showPager: items.length > pageSize,
  };
}

function ListPager({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Exibindo até {DASHBOARD_PAGE_SIZE} por página · {total} no total
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Anterior
        </button>
        <span className="px-2 tabular-nums text-foreground">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const MOTIVO_COLORS = ["#f43f5e", "#fb923c", "#f59e0b", "#94a3b8", "#64748b"];
const EQUIPE_ACCENTS = [
  "border-l-sky-500",
  "border-l-emerald-500",
  "border-l-violet-500",
  "border-l-orange-500",
  "border-l-slate-400",
];

function MotivosDonut({
  items,
}: {
  items: Array<{ motivo: string; valor: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.valor, 0);
  if (total === 0) {
    return (
      <div className="mx-auto flex size-36 items-center justify-center rounded-full border-10 border-muted px-3 text-center text-[11px] leading-snug text-muted-foreground">
        Nenhum lead perdido neste mês
      </div>
    );
  }
  const r = 40;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        {items.map((item, index) => {
          const len = (item.valor / total) * circ;
          const node = (
            <circle
              key={item.motivo}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              strokeWidth="16"
              stroke={MOTIVO_COLORS[index % MOTIVO_COLORS.length]}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return node;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums">{total}</span>
        <span className="text-[10px] text-muted-foreground">perdidos</span>
      </div>
    </div>
  );
}

function ConversionRing({
  value,
  caption,
}: {
  value: number;
  caption?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-36">
        <svg viewBox="0 0 128 128" className="-rotate-90">
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            strokeWidth="10"
            className="stroke-muted"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="stroke-teal-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        </div>
      </div>
      {caption ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

function AgendaStatusBadge({
  status,
  startsAt,
}: {
  status: string;
  startsAt: string;
}) {
  if (status === "concluido") {
    return (
      <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
        Concluído
      </span>
    );
  }
  const late = new Date(startsAt).getTime() < Date.now();
  if (late) {
    return (
      <span className="rounded-full bg-rose-500/12 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
        Atrasado
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
      Pendente
    </span>
  );
}

type PanelHref =
  | "/leads"
  | "/leads-perdidos"
  | "/clientes"
  | "/vendas"
  | "/documentacao"
  | "/financeiro/comissao"
  | "/agenda"
  | "/metas"
  | "/funil"
  | "/corretores";

function PanelLink({
  to,
  children,
}: {
  to: PanelHref;
  children: ReactNode;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs", SOFT_BTN)}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}

/** Ano/mês corrente no fuso de Brasília (UTC−3). */
function agoraBrasil() {
  const brasil = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return {
    ano: brasil.getUTCFullYear(),
    mes: brasil.getUTCMonth() + 1,
  };
}

function Page() {
  const user = getSession();
  const dashboardLiberado = Boolean(
    user &&
      hasUserModule(
        user.role,
        user.permissions,
        "dashboard",
        user.tenant?.plano,
      ),
  );

  if (isCorretorLike(user?.role)) {
    return <DashboardCorretorView />;
  }

  if (user?.role === "admin" || user?.role === "gerente" || dashboardLiberado) {
    return <DashboardAdminView />;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Painel gerencial disponível para admin e gerente."
      />
      <SemConexao
        title="Sem painel para este perfil"
        description="Peça ao administrador para liberar o módulo Dashboard nas permissões do seu usuário."
      />
    </div>
  );
}

function DashboardAdminView() {
  const user = getSession();
  const { funnelStages, origens } = useCatalog();
  const agora = useMemo(() => agoraBrasil(), []);
  const [mes, setMes] = useState(agora.mes);
  const [ano, setAno] = useState(agora.ano);
  const [origemFilter, setOrigemFilter] = useState("all");
  const [summary, setSummary] = useState<DashboardAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const isPlatformAdmin = user?.role === "super_admin";
  const isSolo = user?.tenant?.plano === "solo";

  const anosDisponiveis = useMemo(() => {
    const list: number[] = [];
    for (let y = agora.ano; y >= agora.ano - 5; y -= 1) list.push(y);
    return list;
  }, [agora.ano]);

  const load = useCallback(async () => {
    setLoading(true);
    setSummary(null);
    try {
      setSummary(
        await fetchDashboardAdmin({
          mes,
          ano,
          origem: origemFilter === "all" ? undefined : origemFilter,
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [mes, ano, origemFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const funnelData = useMemo(() => {
    if (!summary) return [];
    return buildFunnelChartData(summary.funil, funnelStages);
  }, [summary, funnelStages]);

  const mesLabel = useMemo(
    () =>
      new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    [mes, ano],
  );

  const perdidosMotivos = summary?.perdidos.motivos ?? [];
  const agendaItens = summary?.agenda.itens ?? [];
  const rankingItens = summary?.ranking ?? [];
  const equipesItens = summary?.equipes ?? [];
  const metasEquipes = summary?.metas.equipes ?? [];
  const metasCorretores = summary?.metas.corretores ?? [];

  const perdidosPage = usePagedList(perdidosMotivos);
  const agendaPage = usePagedList(agendaItens);
  const rankingPage = usePagedList(rankingItens);
  const equipesPage = usePagedList(equipesItens);
  const metasEquipesPage = usePagedList(metasEquipes);
  const metasCorretoresPage = usePagedList(metasCorretores);

  const filtros = (
    <div className="flex w-full flex-wrap items-end gap-2">
      <div className="min-w-28 flex-1 space-y-1 sm:flex-none">
        <Label className="text-[11px] text-muted-foreground">Mês</Label>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="h-9 w-full bg-background sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES_PT.map((nome, idx) => (
              <SelectItem key={nome} value={String(idx + 1)}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-20 flex-1 space-y-1 sm:flex-none">
        <Label className="text-[11px] text-muted-foreground">Ano</Label>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="h-9 w-full bg-background sm:w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anosDisponiveis.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-32 flex-1 space-y-1 sm:min-w-40 sm:flex-none">
        <Label className="text-[11px] text-muted-foreground">Origem</Label>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="h-9 w-full bg-background sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {origens.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading && !summary) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão gerencial da imobiliária."
          actions={filtros}
        />
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando indicadores…
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <PageHeader title="Dashboard" actions={filtros} />
        <SemConexao
          title="Indicadores indisponíveis"
          description="Não foi possível carregar os dados do dashboard."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Visão gerencial · ${mesLabel} · comparação com o mês anterior.`}
        actions={filtros}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando indicadores…
        </div>
      ) : null}

      <PagePanel
        inset="muted"
        guia="dashboard-kpis"
        title="Entrada do mês"
        description={`Novos leads e VGV em ${mesLabel}.`}
        action={<PanelLink to="/leads">Ver leads</PanelLink>}
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <FinanceKpiCard
            label="Novos leads (mês)"
            value={summary.entradas.mes.valor}
            evolucaoPct={summary.entradas.mes.evolucaoPct}
            valorMesAnterior={summary.entradas.mes.valorMesAnterior}
            icon={TrendingUp}
            tone="emerald"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Novos hoje"
            value={summary.entradas.hoje}
            icon={UsersRound}
            tone="blue"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Novos na semana"
            value={summary.entradas.semana}
            icon={ClipboardList}
            tone="violet"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="VGV vendido (mês)"
            value={summary.conversao.vgv.valor}
            evolucaoPct={summary.conversao.vgv.evolucaoPct}
            valorMesAnterior={summary.conversao.vgv.valorMesAnterior}
            icon={Wallet}
            tone="teal"
            variant="dash"
          />
        </div>
      </PagePanel>

      <PagePanel
        inset="muted"
        title="Precisa de atenção"
        description={
          isPlatformAdmin
            ? "Leads parados, perdidos e taxa de conversão neste período."
            : "Leads sem dono, parados e perdidos neste período."
        }
        action={<PanelLink to="/leads">Ver leads</PanelLink>}
      >
        <div
          className={
            isPlatformAdmin
              ? "grid grid-cols-2 gap-3 xl:grid-cols-3"
              : "grid grid-cols-2 gap-3 xl:grid-cols-4"
          }
        >
          {isPlatformAdmin ? null : (
            <FinanceKpiCard
              label="Sem corretor atribuído"
              value={summary.atencao.semDono}
              icon={UserX}
              tone="orange"
              format="number"
              variant="dash"
            />
          )}
          <FinanceKpiCard
            label={`Parados (${summary.atencao.diasParado}d)`}
            value={summary.atencao.parados}
            icon={AlertTriangle}
            tone="rose"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Perdidos no mês"
            value={summary.perdidos.mes.valor}
            evolucaoPct={summary.perdidos.mes.evolucaoPct}
            valorMesAnterior={summary.perdidos.mes.valorMesAnterior}
            invertEvolucao
            icon={UserX}
            tone="red"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label={
              isPlatformAdmin ? "Taxa de conversão" : "Conversão (doc → venda)"
            }
            value={summary.conversao.taxa.valor}
            evolucaoPct={summary.conversao.taxa.evolucaoPct}
            valorMesAnterior={summary.conversao.taxa.valorMesAnterior}
            icon={Goal}
            tone="teal"
            format="percent"
            variant="dash"
          />
        </div>
      </PagePanel>

      {isPlatformAdmin ? null : (
      <div className="grid gap-4 xl:grid-cols-2">
        <PagePanel
          inset="muted"
          title="Pipeline de documentação"
          description={`Processos cadastrados em ${mesLabel}.`}
          action={<PanelLink to="/documentacao">Ver documentação</PanelLink>}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FinanceKpiCard
              label="Aprovadas"
              value={summary.documentacaoPipeline.aprovadas.valor}
              evolucaoPct={summary.documentacaoPipeline.aprovadas.evolucaoPct}
              valorMesAnterior={
                summary.documentacaoPipeline.aprovadas.valorMesAnterior
              }
              icon={CheckCircle2}
              tone="emerald"
              format="number"
              variant="dash"
              wash
            />
            <FinanceKpiCard
              label="Reprovadas"
              value={summary.documentacaoPipeline.reprovadas.valor}
              evolucaoPct={summary.documentacaoPipeline.reprovadas.evolucaoPct}
              valorMesAnterior={
                summary.documentacaoPipeline.reprovadas.valorMesAnterior
              }
              invertEvolucao
              icon={XCircle}
              tone="red"
              format="number"
              variant="dash"
              wash
            />
            <FinanceKpiCard
              label="Em análise"
              value={summary.documentacaoPipeline.emAnalise.valor}
              evolucaoPct={summary.documentacaoPipeline.emAnalise.evolucaoPct}
              valorMesAnterior={
                summary.documentacaoPipeline.emAnalise.valorMesAnterior
              }
              icon={Clock3}
              tone="orange"
              format="number"
              variant="dash"
              wash
            />
          </div>
        </PagePanel>

        <PagePanel
          inset="muted"
          guia="dashboard-comissao"
          title={
            summary.comissao.papel === "admin"
              ? "Comissões do mês"
              : "Sua comissão do mês"
          }
          description={
            summary.comissao.papel === "admin"
              ? `Comissão líquida lançada nas vendas de ${mesLabel}.`
              : summary.comissao.papel === "gerente"
                ? `Valor a receber nas vendas de ${mesLabel} (sua fatia de gerente).`
                : `Quanto você recebe nas vendas de ${mesLabel}.`
          }
          action={<PanelLink to="/financeiro/comissao">Ver comissões</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-3">
            <FinanceKpiCard
              label={
                summary.comissao.papel === "admin"
                  ? "Total líquido"
                  : "A receber"
              }
              value={
                summary.comissao.papel === "admin"
                  ? summary.comissao.total.valor
                  : summary.comissao.aReceber.valor
              }
              evolucaoPct={
                summary.comissao.papel === "admin"
                  ? summary.comissao.total.evolucaoPct
                  : summary.comissao.aReceber.evolucaoPct
              }
              valorMesAnterior={
                summary.comissao.papel === "admin"
                  ? summary.comissao.total.valorMesAnterior
                  : summary.comissao.aReceber.valorMesAnterior
              }
              icon={Percent}
              tone="violet"
              variant="dash"
            />
            <FinanceKpiCard
              label="Pendentes"
              value={summary.comissao.pendente.valor}
              evolucaoPct={summary.comissao.pendente.evolucaoPct}
              valorMesAnterior={summary.comissao.pendente.valorMesAnterior}
              icon={Clock3}
              tone="orange"
              variant="dash"
            />
            <FinanceKpiCard
              label="Liberadas"
              value={summary.comissao.liberada.valor}
              evolucaoPct={summary.comissao.liberada.evolucaoPct}
              valorMesAnterior={summary.comissao.liberada.valorMesAnterior}
              icon={Banknote}
              tone="blue"
              variant="dash"
            />
            <FinanceKpiCard
              label="Pagas"
              value={summary.comissao.paga.valor}
              evolucaoPct={summary.comissao.paga.evolucaoPct}
              valorMesAnterior={summary.comissao.paga.valorMesAnterior}
              icon={CheckCircle2}
              tone="emerald"
              variant="dash"
            />
          </div>
        </PagePanel>
      </div>
      )}

      <section
        data-guia="dashboard-funil"
        className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]"
      >
        <PagePanel
          title="Funil geral"
          description="Leads ativos nas etapas do funil de vendas."
          action={<PanelLink to="/funil">Ver funil</PanelLink>}
        >
          <FunnelBarChart
            data={funnelData}
            emptyLabel="Nenhum lead ativo no funil."
          />
        </PagePanel>

        <PagePanel
          title="Conversão do mês"
          description={
            isPlatformAdmin
              ? "% de conversão do mês (vs mês anterior)."
              : "% das documentações do mês que viraram venda (vs mês anterior)."
          }
          action={
            <PanelLink to={isPlatformAdmin ? "/taxa-conversao" : "/documentacao"}>
              {isPlatformAdmin ? "Ver conversão" : "Ver documentação"}
            </PanelLink>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <ConversionRing value={summary.conversao.taxa.valor} />
              <div className="w-full flex-1 space-y-3">
                {isPlatformAdmin ? null : (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-600">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-muted-foreground">
                          Documentações
                        </span>
                        <span className="font-semibold tabular-nums">
                          {summary.conversao.documentacoes.valor}
                        </span>
                      </div>
                      <EvolucaoBadge
                        value={summary.conversao.documentacoes.evolucaoPct}
                        previous={summary.conversao.documentacoes.valorMesAnterior}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        Viraram venda
                      </span>
                      <span className="font-semibold tabular-nums">
                        {summary.conversao.vendas.valor}
                      </span>
                    </div>
                    <EvolucaoBadge
                      value={summary.conversao.vendas.evolucaoPct}
                      previous={summary.conversao.vendas.valorMesAnterior}
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/12 text-teal-600">
                    <Wallet className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        VGV do mês
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {money(summary.conversao.vgv.valor)}
                      </span>
                    </div>
                    <EvolucaoBadge
                      value={summary.conversao.vgv.evolucaoPct}
                      previous={summary.conversao.vgv.valorMesAnterior}
                    />
                  </div>
                </div>
              </div>
            </div>
            {summary.entradas.semana > 0 ? (
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {summary.entradas.semana} novo
                {summary.entradas.semana === 1 ? "" : "s"} nesta semana
                {summary.entradas.semana > summary.entradas.mes.valor
                  ? " — parte pode ser de dias do mês passado (a semana começa na segunda)."
                  : "."}
              </div>
            ) : null}
          </div>
        </PagePanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PagePanel
          title="Leads perdidos — motivos"
          description={`Motivos registrados em ${mesLabel}.`}
          action={<PanelLink to="/leads-perdidos">Ver perdidos</PanelLink>}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <MotivosDonut items={perdidosMotivos} />
            <div className="min-w-0 flex-1 space-y-3">
            {perdidosMotivos.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nenhum lead perdido neste mês.
              </p>
            ) : (
              <>
                {perdidosPage.pageItems.map((m) => {
                  const total = perdidosMotivos.reduce((s, row) => s + row.valor, 0) || 1;
                  const share = Math.round((m.valor / total) * 100);
                  return (
                  <div key={m.motivo} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{m.motivo}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {m.valor} · {share}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-rose-400"
                        style={{ width: `${Math.max(8, share)}%` }}
                      />
                    </div>
                  </div>
                  );
                })}
                <ListPager
                  page={perdidosPage.page}
                  totalPages={perdidosPage.totalPages}
                  total={perdidosPage.total}
                  onPageChange={perdidosPage.setPage}
                />
              </>
            )}
            </div>
          </div>
        </PagePanel>

        <PagePanel
          title="Agenda de hoje"
          description={`${summary.agenda.totalHoje} compromisso${summary.agenda.totalHoje === 1 ? "" : "s"} · ${summary.agenda.atrasados} atrasado${summary.agenda.atrasados === 1 ? "" : "s"}`}
          action={<PanelLink to="/agenda">Abrir agenda</PanelLink>}
        >
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-sky-500/12 px-2.5 py-1 font-medium text-sky-700 dark:text-sky-300">
              {summary.agenda.pendentesHoje} pendente
              {summary.agenda.pendentesHoje === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
              {summary.agenda.concluidosHoje} concluído
              {summary.agenda.concluidosHoje === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-rose-500/12 px-2.5 py-1 font-medium text-rose-700 dark:text-rose-300">
              {summary.agenda.atrasados} atrasado
              {summary.agenda.atrasados === 1 ? "" : "s"}
            </span>
          </div>
          {agendaItens.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum compromisso hoje.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {agendaPage.pageItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
                  >
                    <time className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {new Date(item.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.titulo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.contato ?? item.tipo}
                      </p>
                    </div>
                    <AgendaStatusBadge
                      status={item.status}
                      startsAt={item.startsAt}
                    />
                  </div>
                ))}
              </div>
              <ListPager
                page={agendaPage.page}
                totalPages={agendaPage.totalPages}
                total={agendaPage.total}
                onPageChange={agendaPage.setPage}
              />
            </>
          )}
        </PagePanel>
      </section>

      {isSolo || isPlatformAdmin ? null : (
      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <PagePanel
          title="Ranking de corretores"
          description="Ordenado por VGV do mês."
          action={<PanelLink to="/corretores">Ver corretores</PanelLink>}
        >
          {rankingItens.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum corretor ativo.
            </p>
          ) : (
            <>
              <div className="-mx-1 overflow-x-auto overflow-y-hidden overscroll-x-contain">
                <table className="w-full min-w-140 text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium whitespace-nowrap">
                        #
                      </th>
                      <th className="pb-2 pr-3 font-medium whitespace-nowrap">
                        Corretor
                      </th>
                      <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">
                        Leads
                      </th>
                      <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">
                        Visitas
                      </th>
                      <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">
                        Vendas
                      </th>
                      <th className="pb-2 text-right font-medium whitespace-nowrap">
                        VGV
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingPage.pageItems.map((r, index) => (
                      <tr
                        key={r.corretorId}
                        className="border-b border-black/5 last:border-0"
                      >
                        <td className="py-2.5 pr-2 text-xs tabular-nums text-muted-foreground">
                          {(rankingPage.page - 1) * DASHBOARD_PAGE_SIZE +
                            index +
                            1}
                        </td>
                        <td className="max-w-52 py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-bold text-sky-700">
                              {initials(r.nome)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{r.nome}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {r.equipe ?? "Sem equipe"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap">
                          {r.leads}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap">
                          {r.visitas}
                        </td>
                        <td className="py-2.5 pr-3 text-right whitespace-nowrap">
                          <div className="font-medium tabular-nums">
                            {r.vendas.valor}
                          </div>
                          <EvolucaoBadge value={r.vendas.evolucaoPct} />
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <div className="font-medium tabular-nums">
                            {money(r.vgv.valor)}
                          </div>
                          <EvolucaoBadge value={r.vgv.evolucaoPct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ListPager
                page={rankingPage.page}
                totalPages={rankingPage.totalPages}
                total={rankingPage.total}
                onPageChange={rankingPage.setPage}
              />
            </>
          )}
        </PagePanel>

        <PagePanel
          title="Carteira por equipe"
          description="Leads e clientes ativos por time."
          action={<PanelLink to="/leads">Ver carteira</PanelLink>}
        >
          <div className="space-y-3">
            {equipesItens.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nenhuma equipe cadastrada.
              </p>
            ) : (
              <>
                {equipesPage.pageItems.map((eq, index) => (
                  <div
                    key={eq.equipeId}
                    className={cn(
                      "rounded-xl border border-black/5 bg-background px-3 py-2.5 border-l-4",
                      EQUIPE_ACCENTS[index % EQUIPE_ACCENTS.length],
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{eq.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {eq.corretores} corretor
                          {eq.corretores === 1 ? "" : "es"}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold tabular-nums">
                          {eq.total}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {eq.leads} leads · {eq.clientes} clientes
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <ListPager
                  page={equipesPage.page}
                  totalPages={equipesPage.totalPages}
                  total={equipesPage.total}
                  onPageChange={equipesPage.setPage}
                />
              </>
            )}
          </div>
        </PagePanel>
      </section>
      )}

      <PagePanel
        title="Metas vs realizado"
        description={
          isPlatformAdmin
            ? "Metas mensais ativas da empresa."
            : isSolo
            ? "Metas ativas do período · tipo, valor e progresso."
            : "Metas mensais ativas · imobiliária, equipes e corretores."
        }
        action={<PanelLink to="/metas">Ver metas</PanelLink>}
      >
        <div className="space-y-5">
          {isSolo ? (
            metasCorretores.length > 0 ? (
              <div className="space-y-3">
                {metasCorretoresPage.pageItems.map((m) => (
                  <div key={m.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {META_TIPO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {m.tipo === "vgv"
                          ? `${money(m.atual)} / ${money(m.valor)}`
                          : `${m.atual.toLocaleString("pt-BR")} / ${m.valor.toLocaleString("pt-BR")}`}{" "}
                        ({m.percentual}%)
                      </span>
                    </div>
                    <Progress value={m.percentual} />
                  </div>
                ))}
                <ListPager
                  page={metasCorretoresPage.page}
                  totalPages={metasCorretoresPage.totalPages}
                  total={metasCorretoresPage.total}
                  onPageChange={metasCorretoresPage.setPage}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma meta mensal ativa. Cadastre em Metas.
              </p>
            )
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isPlatformAdmin ? "Empresa" : "Imobiliária"}
                </h3>
                <div>
                  <div className="mb-1.5 flex justify-between gap-3 text-sm">
                    <span className="font-medium">Meta do mês</span>
                    <span className="tabular-nums text-muted-foreground">
                      {summary.metas.imobiliaria.atual.toLocaleString("pt-BR")} /{" "}
                      {summary.metas.imobiliaria.meta.toLocaleString("pt-BR")} (
                      {summary.metas.imobiliaria.percentual}%)
                    </span>
                  </div>
                  <Progress value={summary.metas.imobiliaria.percentual} />
                </div>
              </div>

              {isPlatformAdmin ? null : (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Por equipe
                  </h3>
                  {metasEquipes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma meta de equipe.
                    </p>
                  ) : (
                    <>
                      {metasEquipesPage.pageItems.map((eq) => (
                        <div key={eq.equipeId}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{eq.nome}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {eq.percentual}%
                            </span>
                          </div>
                          <Progress value={eq.percentual} />
                        </div>
                      ))}
                      <ListPager
                        page={metasEquipesPage.page}
                        totalPages={metasEquipesPage.totalPages}
                        total={metasEquipesPage.total}
                        onPageChange={metasEquipesPage.setPage}
                      />
                    </>
                  )}
                </div>
              )}

              {isPlatformAdmin ? null : (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Por corretor
                  </h3>
                  {metasCorretores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma meta mensal ativa. Cadastre em Metas.
                    </p>
                  ) : (
                    <>
                      {metasCorretoresPage.pageItems.map((m) => (
                        <div key={m.id}>
                          <div className="mb-1 flex justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {m.corretorNome}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {META_TIPO_LABEL[m.tipo] ?? m.tipo}
                                {m.equipeNome ? ` · ${m.equipeNome}` : ""}
                              </div>
                            </div>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {m.percentual}%
                            </span>
                          </div>
                          <Progress value={m.percentual} className="h-1.5" />
                        </div>
                      ))}
                      <ListPager
                        page={metasCorretoresPage.page}
                        totalPages={metasCorretoresPage.totalPages}
                        total={metasCorretoresPage.total}
                        onPageChange={metasCorretoresPage.setPage}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </PagePanel>
    </div>
  );
}

function DashboardCorretorView() {
  const user = getSession();
  const canOpenDocumentacao = user
    ? canAccessRoute(
        user.role,
        "/documentacao",
        user.tenant?.modules ?? null,
        user.tenant?.plano ?? null,
        user.permissions ?? null,
      )
    : false;
  const { funnelStages, stageByPapel } = useCatalog();
  const [summary, setSummary] = useState<DashboardCorretor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchDashboardCorretor());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os indicadores.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const funnelData = useMemo(() => {
    if (!summary) return [];
    return buildFunnelChartData(summary.funil, funnelStages);
  }, [summary, funnelStages]);

  const analiseData = useMemo(
    () =>
      summary?.analises.map((item) => ({
        label: ANALISE_LABELS[item.status],
        total: item.total,
      })) ?? [],
    [summary],
  );
  const agendaPessoal = useMemo(
    () =>
      summary?.agenda.itens.filter((item) => item.categoria === "pessoal") ??
      [],
    [summary],
  );
  const agendaCompartilhada = useMemo(
    () =>
      summary?.agenda.itens.filter(
        (item) => item.categoria === "compartilhada",
      ) ?? [],
    [summary],
  );

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão geral da sua operação."
        />
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando indicadores…
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visão geral da sua operação."
        />
        <SemConexao
          title="Indicadores indisponíveis"
          description="Não foi possível carregar os dados do dashboard."
        />
      </div>
    );
  }

  const analiseSlug = stageByPapel("analise") ?? "em-analise";
  const emAnalise =
    summary.funil.find((item) => item.etapa === analiseSlug)?.total ?? 0;
  const mesLabel = new Date(summary.periodo.inicio).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Visão da sua carteira em ${mesLabel}.`}
      />

      <PagePanel
        inset="muted"
        guia="dashboard-kpis"
        title="Sua carteira"
        description={`Resumo operacional em ${mesLabel}.`}
        action={<PanelLink to="/leads">Ver leads</PanelLink>}
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <FinanceKpiCard
            label="Leads ativos"
            value={summary.carteira.leads}
            icon={UsersRound}
            tone="teal"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Clientes na carteira"
            value={summary.carteira.clientes}
            icon={UserRound}
            tone="blue"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Novos contatos no mês"
            value={summary.carteira.novosContatos}
            icon={TrendingUp}
            tone="orange"
            format="number"
            variant="dash"
          />
          <FinanceKpiCard
            label="Em análise"
            value={emAnalise}
            icon={ClipboardList}
            tone="violet"
            format="number"
            variant="dash"
          />
        </div>
      </PagePanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <PagePanel
          inset="muted"
          title="Documentação e vendas"
          description={`Resultado da sua carteira em ${mesLabel}.`}
          action={
            canOpenDocumentacao ? (
              <PanelLink to="/documentacao">Ver documentação</PanelLink>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <FinanceKpiCard
              label="Documentações registradas"
              value={summary.documentacao.registrados}
              icon={BriefcaseBusiness}
              tone="blue"
              format="number"
              variant="dash"
            />
            <FinanceKpiCard
              label="Em andamento"
              value={summary.documentacao.emAndamento}
              icon={FileCheck2}
              tone="orange"
              format="number"
              variant="dash"
            />
            <FinanceKpiCard
              label="Vendas registradas"
              value={summary.documentacao.vendidos}
              icon={FileCheck2}
              tone="emerald"
              format="number"
              variant="dash"
            />
            <FinanceKpiCard
              label="VGV vendido no mês"
              value={summary.documentacao.vgvVendidoMes}
              icon={Wallet}
              tone="teal"
              variant="dash"
            />
          </div>
        </PagePanel>

        <PagePanel
          inset="muted"
          guia="dashboard-comissao"
          title="Sua comissão do mês"
          description={`Quanto você recebe nas vendas de ${mesLabel}.`}
          action={<PanelLink to="/financeiro/comissao">Ver comissões</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-3">
            <FinanceKpiCard
              label="A receber"
              value={summary.comissao.aReceber}
              icon={Percent}
              tone="violet"
              variant="dash"
            />
            <FinanceKpiCard
              label="Pendentes"
              value={summary.comissao.pendente}
              icon={Clock3}
              tone="orange"
              variant="dash"
            />
            <FinanceKpiCard
              label="Liberadas"
              value={summary.comissao.liberada}
              icon={Banknote}
              tone="blue"
              variant="dash"
            />
            <FinanceKpiCard
              label="Pagas"
              value={summary.comissao.paga}
              icon={CheckCircle2}
              tone="emerald"
              variant="dash"
            />
          </div>
        </PagePanel>
      </div>

      <section
        data-guia="dashboard-funil"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]"
      >
        <PagePanel
          title="Funil atual"
          description="Seus leads ativos nas etapas do funil de vendas."
          action={
            user &&
            canAccessRoute(
              user.role,
              "/funil",
              user.tenant?.modules ?? null,
              user.tenant?.plano ?? null,
              user.permissions ?? null,
            ) ? (
              <PanelLink to="/funil">Ver funil</PanelLink>
            ) : (
              <PanelLink to="/leads">Ver leads</PanelLink>
            )
          }
        >
          <FunnelBarChart
            data={funnelData}
            emptyLabel="Nenhum lead ativo no funil."
          />
        </PagePanel>
        <PagePanel title="Status das análises">
          <div className="space-y-3">
            {analiseData.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums">{item.total}</span>
              </div>
            ))}
          </div>
        </PagePanel>
      </section>

      <PagePanel
        title="Minha agenda de hoje"
        description={`${summary.agenda.totalHoje} compromisso${summary.agenda.totalHoje === 1 ? "" : "s"} marcado${summary.agenda.totalHoje === 1 ? "" : "s"} para hoje.`}
        action={<PanelLink to="/agenda">Abrir agenda</PanelLink>}
      >
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {summary.agenda.pendentesHoje} pendente
            {summary.agenda.pendentesHoje === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
            {summary.agenda.concluidosHoje} concluído
            {summary.agenda.concluidosHoje === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AgendaCategoria
            title="Atividades pessoais"
            items={agendaPessoal}
            emptyMessage="Nenhuma atividade pessoal marcada para hoje."
          />
          <AgendaCategoria
            title="Com gerente ou superior"
            items={agendaCompartilhada}
            emptyMessage="Nenhuma atividade compartilhada marcada para hoje."
          />
        </div>
      </PagePanel>
    </div>
  );
}

function AgendaCategoria({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: DashboardCorretor["agenda"]["itens"];
  emptyMessage: string;
}) {
  const pageState = usePagedList(items);

  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="space-y-2">
            {pageState.pageItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5"
              >
                <time className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {new Date(item.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.contato ?? item.tipo}
                  </p>
                </div>
                <AgendaStatusBadge
                  status={item.status}
                  startsAt={item.startsAt}
                />
              </div>
            ))}
          </div>
          <ListPager
            page={pageState.page}
            totalPages={pageState.totalPages}
            total={pageState.total}
            onPageChange={pageState.setPage}
          />
        </>
      )}
    </div>
  );
}
