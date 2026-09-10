import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  DetailField,
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fetchTitulos, fetchVisaoGeral } from "@/lib/financeiro-api";
import { canFinanceiroAction } from "@/lib/permissions";
import { HideFinanceValuesButton } from "@/components/hide-finance-values-button";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";
import {
  brl,
  formatDate,
  statusBadgeClass,
  statusLabel,
  type CentroDespesaResumo,
  type DespesaPipelineItem,
  type MesResumo,
  type TituloFinanceiro,
} from "@/lib/financeiro-mock";
import { SOFT_BTN, SOFT_BTN_ACTIVE } from "@/lib/soft-btn";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Eye,
  Loader2,
  Percent,
  PieChart as PieChartIcon,
  Pin,
  Plus,
  Rows3,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_BAR_SHELL,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
} from "@/lib/filter-bar";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/visao-geral")({
  head: () => ({ meta: [{ title: "Visao geral - Zone Connection" }] }),
  component: Page,
});

const barConfig = {
  receitas: { label: "Receitas", color: "hsl(160 84% 39%)" },
  despesas: { label: "Despesas", color: "hsl(0 72% 51%)" },
  variaveis: { label: "Variáveis", color: "hsl(45 93% 47%)" },
  comissoesAReceber: { label: "Comissões a receber", color: "hsl(262 83% 58%)" },
} satisfies ChartConfig;

const naturezaConfig = {
  fixa: { label: "Fixa", color: "hsl(199 89% 40%)" },
  variavel: { label: "Variável", color: "hsl(38 92% 50%)" },
  outros: { label: "Sem classificação", color: "hsl(215 16% 47%)" },
  comissao: { label: "Comissões a receber", color: "hsl(262 83% 58%)" },
} satisfies ChartConfig;

const EMPTY_KPIS = {
  saldoAtual: 0,
  receitasMes: 0,
  despesasMes: 0,
  despesasFixaMes: 0,
  despesasVariavelMes: 0,
  despesasOutrosMes: 0,
  comissoesAReceberMes: 0,
  aReceber: 0,
  aPagar: 0,
  resultadoMes: 0,
  evolucaoReceitas: null as number | null,
  evolucaoDespesas: null as number | null,
  evolucaoResultado: null as number | null,
};

const MONEY_BLUR = "select-none blur-[8px]";

const COMPOSICAO = [
  { key: "fixa", name: "Fixa", color: "hsl(199 89% 40%)" },
  { key: "variavel", name: "Variável", color: "hsl(38 92% 50%)" },
  { key: "outros", name: "Sem classificação", color: "hsl(215 16% 47%)" },
  { key: "comissao", name: "Comissões a receber", color: "hsl(262 83% 58%)" },
] as const;

const MESES_FILTRO = [
  { value: 1, label: "Janeiro", curto: "Jan" },
  { value: 2, label: "Fevereiro", curto: "Fev" },
  { value: 3, label: "Março", curto: "Mar" },
  { value: 4, label: "Abril", curto: "Abr" },
  { value: 5, label: "Maio", curto: "Mai" },
  { value: 6, label: "Junho", curto: "Jun" },
  { value: 7, label: "Julho", curto: "Jul" },
  { value: 8, label: "Agosto", curto: "Ago" },
  { value: 9, label: "Setembro", curto: "Set" },
  { value: 10, label: "Outubro", curto: "Out" },
  { value: 11, label: "Novembro", curto: "Nov" },
  { value: 12, label: "Dezembro", curto: "Dez" },
] as const;

function anosFiltro() {
  const atual = new Date().getFullYear();
  return [atual + 1, atual, atual - 1, atual - 2, atual - 3];
}

function ymFromVencimento(value: string | null | undefined) {
  return String(value ?? "").match(/(\d{4}-\d{2})/)?.[1] ?? "";
}

function tituloNoPeriodo(
  titulo: TituloFinanceiro,
  ano: number,
  mes: number | "todos",
) {
  const venc = ymFromVencimento(titulo.vencimento);
  if (mes === "todos") return venc.startsWith(`${ano}-`);
  return venc === `${ano}-${String(mes).padStart(2, "0")}`;
}

function itemNoPeriodo(
  dataIso: string | null | undefined,
  ano: number,
  mes: number | "todos",
) {
  const venc = ymFromVencimento(dataIso);
  if (mes === "todos") return venc.startsWith(`${ano}-`);
  return venc === `${ano}-${String(mes).padStart(2, "0")}`;
}

function somaTitulosAbertos(
  titulos: TituloFinanceiro[],
  ano: number,
  mes: number | "todos",
) {
  return titulos
    .filter(
      (t) =>
        (t.status === "aberto" || t.status === "atrasado") &&
        tituloNoPeriodo(t, ano, mes),
    )
    .reduce((s, t) => s + t.valor, 0);
}

function tituloToPipeline(titulo: TituloFinanceiro): DespesaPipelineItem {
  return {
    id: titulo.id,
    descricao: titulo.descricao,
    valor: titulo.valor,
    data: (titulo.vencimento ?? "").slice(0, 10),
    centro: titulo.centro || titulo.categoria || "",
    parceiro: titulo.parceiro,
    status: titulo.status,
    comissaoId: titulo.comissaoId,
  };
}

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
      {children}
    </div>
  );
}

function Page() {
  const navigate = useNavigate();
  const canCreateFin = canFinanceiroAction(getSession(), "create");
  const [hideValues] = useHideFinanceiroValues();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(EMPTY_KPIS);
  const [mesesResumo, setMesesResumo] = useState<MesResumo[]>([]);
  const [centros, setCentros] = useState<CentroDespesaResumo[]>([]);
  const [pipeline, setPipeline] = useState<{
    fixas: DespesaPipelineItem[];
    variaveis: DespesaPipelineItem[];
    outros: DespesaPipelineItem[];
    comissoes: DespesaPipelineItem[];
  }>({ fixas: [], variaveis: [], outros: [], comissoes: [] });
  const [comissoesMes, setComissoesMes] = useState(0);
  const [composicaoVista, setComposicaoVista] = useState<"barras" | "pizza">(
    "barras",
  );
  const [detalhe, setDetalhe] = useState<{
    item: DespesaPipelineItem;
    tone: "fixa" | "variavel" | "outros" | "comissao";
  } | null>(null);
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState<number | "todos">(
    () => new Date().getMonth() + 1,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [data, titulosComissao, titulosReceber, titulosPagar] =
          await Promise.all([
          fetchVisaoGeral({
            ano,
            mes: mes === "todos" ? undefined : mes,
          }),
          fetchTitulos("receber", undefined, "comissao").catch(
            () => [] as TituloFinanceiro[],
          ),
          fetchTitulos("receber", undefined, "sem_comissao").catch(
            () => [] as TituloFinanceiro[],
          ),
          fetchTitulos("pagar").catch(() => [] as TituloFinanceiro[]),
        ]);
        if (cancelled) return;
        const abertas = titulosComissao.filter(
          (t) =>
            (t.status === "aberto" || t.status === "atrasado") &&
            tituloNoPeriodo(t, ano, mes),
        );
        const curto = mes === "todos" ? null : MESES_FILTRO[mes - 1]?.curto;
        const rowDoMes = curto
          ? (data.mesesResumo ?? []).find((row) => row.mes === curto)
          : null;
        const receitas =
          mes === "todos"
            ? (data.kpis.receitasMes ?? 0)
            : (rowDoMes?.receitas ?? 0);
        const despesas =
          mes === "todos"
            ? (data.kpis.despesasMes ?? 0)
            : (rowDoMes?.despesas ?? 0);
        const fixas =
          mes === "todos"
            ? (data.kpis.despesasFixaMes ?? 0)
            : (rowDoMes?.fixas ?? 0);
        const variaveis =
          mes === "todos"
            ? (data.kpis.despesasVariavelMes ?? 0)
            : (rowDoMes?.variaveis ?? 0);
        const outros =
          mes === "todos"
            ? (data.kpis.despesasOutrosMes ?? 0)
            : Math.max(0, despesas - fixas - variaveis);
        const totalComissao = Math.max(
          data.kpis.comissoesAReceberMes ?? 0,
          rowDoMes?.comissoesAReceber ?? 0,
          somaTitulosAbertos(titulosComissao, ano, mes),
        );
        const aReceber = Math.max(
          data.kpis.aReceber ?? 0,
          rowDoMes?.aReceber ?? 0,
          somaTitulosAbertos(titulosReceber, ano, mes),
        );
        const aPagar = Math.max(
          data.kpis.aPagar ?? 0,
          rowDoMes?.aPagar ?? 0,
          somaTitulosAbertos(titulosPagar, ano, mes),
        );
        const pipelineApi = data.despesasPipeline?.comissoes ?? [];
        const comissoesItens =
          pipelineApi.length > 0
            ? pipelineApi.slice(0, 40)
            : abertas
                .sort((a, b) => b.valor - a.valor)
                .slice(0, 40)
                .map(tituloToPipeline);
        const noMes = (item: DespesaPipelineItem) =>
          itemNoPeriodo(item.data, ano, mes);

        const comissaoPorMes = new Map<string, number>();
        for (const t of titulosComissao) {
          if (t.status !== "aberto" && t.status !== "atrasado") continue;
          const key = ymFromVencimento(t.vencimento);
          if (!key.startsWith(`${ano}-`)) continue;
          comissaoPorMes.set(key, (comissaoPorMes.get(key) ?? 0) + t.valor);
        }

        setKpis({
          ...data.kpis,
          receitasMes: receitas,
          despesasMes: despesas,
          despesasFixaMes: fixas,
          despesasVariavelMes: variaveis,
          despesasOutrosMes: outros,
          comissoesAReceberMes: totalComissao,
          aReceber,
          aPagar,
          resultadoMes: receitas - despesas,
        });
        setComissoesMes(totalComissao);
        setMesesResumo(
          MESES_FILTRO.map((item) => {
            const key = `${ano}-${String(item.value).padStart(2, "0")}`;
            const row = (data.mesesResumo ?? []).find(
              (entry) => entry.mes === item.curto,
            );
            return {
              mes: item.curto,
              receitas: row?.receitas ?? 0,
              despesas: row?.despesas ?? 0,
              variaveis: row?.variaveis ?? 0,
              fixas: row?.fixas ?? 0,
              aReceber: row?.aReceber ?? 0,
              aPagar: row?.aPagar ?? 0,
              comissoesAReceber: Math.max(
                row?.comissoesAReceber ?? 0,
                comissaoPorMes.get(key) ?? 0,
                curto === item.curto ? totalComissao : 0,
              ),
            };
          }),
        );
        setCentros(data.centros);
        setPipeline({
          fixas: (data.despesasPipeline?.fixas ?? []).filter(noMes),
          variaveis: (data.despesasPipeline?.variaveis ?? []).filter(noMes),
          outros: (data.despesasPipeline?.outros ?? []).filter(noMes),
          comissoes: comissoesItens,
        });
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar a visão geral.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ano, mes]);

  const k = kpis;
  const chartData = useMemo(() => {
    const rows = Array.isArray(mesesResumo) ? mesesResumo : [];
    if (mes === "todos") {
      return MESES_FILTRO.map((item) => {
        const found = rows.find((row) => row.mes === item.curto);
        return {
          mes: item.curto,
          receitas: found?.receitas ?? 0,
          despesas: found?.despesas ?? 0,
          variaveis: found?.variaveis ?? 0,
          comissoesAReceber: found?.comissoesAReceber ?? 0,
        };
      });
    }
    const curto = MESES_FILTRO[mes - 1]?.curto ?? "Mes";
    const found = rows.find((row) => row.mes === curto);
    return [
      {
        mes: curto,
        receitas: found?.receitas ?? 0,
        despesas: found?.despesas ?? 0,
        variaveis: found?.variaveis ?? 0,
        comissoesAReceber: comissoesMes || found?.comissoesAReceber || 0,
      },
    ];
  }, [comissoesMes, mes, mesesResumo]);
  const periodoAnoMes =
    mes === "todos"
      ? String(ano)
      : `${MESES_FILTRO[mes - 1]?.label ?? ""} de ${ano}`;
  const noAno = mes === "todos";
  const periodoPadrao =
    ano === new Date().getFullYear() && mes === new Date().getMonth() + 1;

  const composicao = useMemo(() => {
    const values = {
      fixa: Math.round(k.despesasFixaMes ?? 0),
      variavel: Math.round(k.despesasVariavelMes ?? 0),
      outros: Math.round(k.despesasOutrosMes ?? 0),
      comissao: Math.round(comissoesMes),
    };
    const rows = COMPOSICAO.map((item) => ({
      ...item,
      value: values[item.key],
    }));
    const total = rows.reduce((s, row) => s + row.value, 0);
    return { rows, total };
  }, [
    comissoesMes,
    k.despesasFixaMes,
    k.despesasOutrosMes,
    k.despesasVariavelMes,
  ]);

  const centrosRank = useMemo(
    () =>
      [...centros]
        .map((c) => ({ name: c.centro, value: Math.round(c.realizado) }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4),
    [centros],
  );

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description={`Resumo de ${periodoAnoMes} — resultado, pendências e comissões a receber`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HideFinanceValuesButton />
            {canCreateFin ? (
              <Button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/financeiro/movimentacao",
                    search: { novo: true },
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo lançamento
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={FILTER_BAR_SHELL}>
        <Select
          value={String(ano)}
          onValueChange={(value) => setAno(Number(value))}
        >
          <SelectTrigger className={cn("w-full sm:w-35", FILTER_CONTROL)}>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {anosFiltro().map((item) => (
              <SelectItem key={item} value={String(item)}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={mes === "todos" ? "todos" : String(mes)}
          onValueChange={(value) =>
            setMes(value === "todos" ? "todos" : Number(value))
          }
        >
          <SelectTrigger className={cn("w-full sm:w-45", FILTER_CONTROL)}>
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {MESES_FILTRO.map((item) => (
              <SelectItem key={item.value} value={String(item.value)}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!periodoPadrao ? (
          <Button
            type="button"
            variant="ghost"
            className={FILTER_CLEAR_BTN}
            onClick={() => {
              const hoje = new Date();
              setAno(hoje.getFullYear());
              setMes(hoje.getMonth() + 1);
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Mês atual
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando indicadores...
        </div>
      ) : null}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FinanceKpiCard
          label="Resultado"
          value={Math.round(k.resultadoMes)}
          icon={TrendingUp}
          tone="blue-4"
          evolucaoPct={k.evolucaoResultado}
          detail={`Receitas ${brl(Math.round(k.receitasMes))} · Despesas ${brl(Math.round(k.despesasMes))}`}
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Comissões a receber"
          value={Math.round(comissoesMes)}
          icon={Percent}
          tone="violet"
          href="/financeiro/comissao"
          detail={
            pipeline.comissoes.length === 1
              ? `1 título em aberto ${noAno ? "neste ano" : "neste mês"}`
              : `${pipeline.comissoes.length} títulos em aberto ${noAno ? "neste ano" : "neste mês"}`
          }
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label={noAno ? "A receber no ano" : "A receber neste mês"}
          value={k.aReceber}
          icon={Banknote}
          tone="teal"
          href="/financeiro/contas-a-receber"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label={noAno ? "A pagar no ano" : "A pagar neste mês"}
          value={k.aPagar}
          icon={ArrowDownRight}
          tone="orange"
          href="/financeiro/contas-a-pagar"
          blurValue={hideValues}
        />
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-5">
        <Card className="min-w-0 overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {chartData.length === 0 ? (
              <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
                Sem dados no período.
              </p>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={barConfig}
                  className="aspect-auto! h-70 w-full min-w-120"
                >
                  <BarChart
                    data={chartData}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v) =>
                        hideValues
                          ? "•••"
                          : `${(Number(v) / 1000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as {
                          mes?: string;
                          receitas?: number;
                          despesas?: number;
                          variaveis?: number;
                          comissoesAReceber?: number;
                        };
                        const series = [
                          {
                            key: "receitas",
                            label: "Receitas",
                            color: "hsl(160 84% 39%)",
                            value: row.receitas ?? 0,
                          },
                          {
                            key: "despesas",
                            label: "Despesas",
                            color: "hsl(0 72% 51%)",
                            value: row.despesas ?? 0,
                          },
                          {
                            key: "variaveis",
                            label: "Variáveis",
                            color: "hsl(45 93% 47%)",
                            value: row.variaveis ?? 0,
                          },
                          {
                            key: "comissoesAReceber",
                            label: "Comissões a receber",
                            color: "hsl(262 83% 58%)",
                            value: row.comissoesAReceber ?? 0,
                          },
                        ];
                        return (
                          <div className="grid min-w-44 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                            <div className="font-medium">{row.mes}</div>
                            {series.map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                    style={{ background: item.color }}
                                  />
                                  {item.label}
                                </span>
                                <span className="font-mono font-medium tabular-nums">
                                  {hideValues
                                    ? "••••"
                                    : brl(Number(item.value))}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="receitas"
                      fill="var(--color-receitas)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="despesas"
                      fill="var(--color-despesas)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="variaveis"
                      fill="var(--color-variaveis)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="comissoesAReceber"
                      fill="var(--color-comissoesAReceber)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <CardTitle className="text-base">Composição do mês</CardTitle>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-2",
                  composicaoVista === "barras" ? SOFT_BTN_ACTIVE : SOFT_BTN,
                )}
                aria-pressed={composicaoVista === "barras"}
                title="Ver barras"
                onClick={() => setComposicaoVista("barras")}
              >
                <Rows3 className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Barras</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-2",
                  composicaoVista === "pizza" ? SOFT_BTN_ACTIVE : SOFT_BTN,
                )}
                aria-pressed={composicaoVista === "pizza"}
                title="Ver gráfico de pizza"
                onClick={() => setComposicaoVista("pizza")}
              >
                <PieChartIcon className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Pizza</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {composicaoVista === "pizza" ? (
              <ResponsiveChartShell>
                <ChartContainer
                  config={naturezaConfig}
                  className="aspect-auto! mx-auto h-70 w-full min-w-80"
                >
                  <PieChart>
                    <Pie
                      data={composicao.rows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={84}
                      paddingAngle={2}
                    >
                      {composicao.rows.map((row) => (
                        <Cell key={row.key} fill={row.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            hideValues ? "••••" : brl(Number(value))
                          }
                        />
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ChartContainer>
              </ResponsiveChartShell>
            ) : (
              <div className="space-y-4">
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  {composicao.total > 0
                    ? composicao.rows.map((row) => (
                        <div
                          key={row.key}
                          className="h-full"
                          style={{
                            width: `${(row.value / composicao.total) * 100}%`,
                            background: row.color,
                          }}
                        />
                      ))
                    : null}
                </div>
                <ul className="space-y-3">
                  {composicao.rows.map((row) => {
                    const pct =
                      composicao.total > 0
                        ? Math.round((row.value / composicao.total) * 100)
                        : 0;
                    return (
                      <li key={row.key}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: row.color }}
                            />
                            <span className="truncate">{row.name}</span>
                          </span>
                          <span
                            className={cn(
                              "shrink-0 tabular-nums font-medium",
                              hideValues && MONEY_BLUR,
                            )}
                          >
                            {brl(row.value)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: row.color,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {pct}% do total
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {centrosRank.length > 0 ? (
                  <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                    {centrosRank.map((item) => (
                      <li
                        key={item.name}
                        className="flex justify-between gap-2"
                      >
                        <span className="truncate">{item.name}</span>
                        <span
                          className={cn(
                            "shrink-0 tabular-nums text-foreground",
                            hideValues && MONEY_BLUR,
                          )}
                        >
                          {brl(item.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <DespesaPipelineColumn
          title="Fixas"
          emptyText="Nenhuma despesa fixa neste mês."
          items={pipeline.fixas}
          tone="fixa"
          total={k.despesasFixaMes ?? 0}
          hideValues={hideValues}
          onItemClick={(item) => setDetalhe({ item, tone: "fixa" })}
        />
        <DespesaPipelineColumn
          title="Variáveis"
          emptyText="Nenhuma despesa variável neste mês."
          items={pipeline.variaveis}
          tone="variavel"
          total={k.despesasVariavelMes ?? 0}
          hideValues={hideValues}
          onItemClick={(item) => setDetalhe({ item, tone: "variavel" })}
        />
        <DespesaPipelineColumn
          title="Comissões a receber"
          emptyText="Nenhuma comissão a receber neste mês."
          items={pipeline.comissoes}
          tone="comissao"
          total={comissoesMes}
          hideValues={hideValues}
          onItemClick={(item) => setDetalhe({ item, tone: "comissao" })}
        />
        <DespesaPipelineColumn
          title="Sem classificação"
          emptyText="Todas as despesas deste mês estão classificadas."
          items={pipeline.outros}
          tone="outros"
          total={k.despesasOutrosMes ?? 0}
          hideValues={hideValues}
          onItemClick={(item) => setDetalhe({ item, tone: "outros" })}
        />
      </div>

      <FormDialogShell
        open={!!detalhe}
        onOpenChange={(open) => {
          if (!open) setDetalhe(null);
        }}
        icon={<Eye className="h-5 w-5" />}
        title={
          detalhe?.tone === "comissao" ? "Detalhes da comissão" : "Detalhes da despesa"
        }
        description={
          detalhe?.tone === "comissao"
            ? "Lançamento a receber originado de comissão."
            : "Lançamento de despesa no período selecionado."
        }
        footer={
          <FormDialogActions>
            {detalhe?.tone === "comissao" && detalhe.item.comissaoId ? (
              <Button asChild size="sm">
                <Link
                  to="/financeiro/comissao"
                  search={{ id: detalhe.item.comissaoId }}
                >
                  Abrir em Comissão
                </Link>
              </Button>
            ) : detalhe && detalhe.tone !== "comissao" ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/financeiro/despesas">Abrir em Despesas</Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetalhe(null)}
            >
              Fechar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {detalhe ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="font-medium">{detalhe.item.descricao}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusBadgeClass(detalhe.item.status)}
                  >
                    {statusLabel(detalhe.item.status)}
                  </Badge>
                </div>
                <p
                  className={cn(
                    "mt-3 text-2xl font-semibold tabular-nums",
                    hideValues && MONEY_BLUR,
                  )}
                >
                  {brl(detalhe.item.valor)}
                </p>
              </div>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailField
                  label="Data"
                  value={formatDate(detalhe.item.data)}
                />
                <DetailField
                  label={detalhe.tone === "comissao" ? "Origem" : "Categoria"}
                  value={detalhe.item.centro || "—"}
                />
                <DetailField
                  label="Parceiro"
                  value={detalhe.item.parceiro || "—"}
                />
                <DetailField
                  label="Tipo"
                  value={
                    detalhe.tone === "comissao"
                      ? "Comissão a receber"
                      : detalhe.tone === "fixa"
                        ? "Despesa fixa"
                        : detalhe.tone === "variavel"
                          ? "Despesa variável"
                          : "Sem classificação"
                  }
                />
              </div>
            </div>
          ) : null}
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}

function DespesaPipelineColumn({
  title,
  emptyText,
  items,
  tone,
  total,
  hideValues = false,
  onItemClick,
}: {
  title: string;
  emptyText: string;
  items: DespesaPipelineItem[];
  tone: "fixa" | "variavel" | "outros" | "comissao";
  total: number;
  hideValues?: boolean;
  onItemClick?: (item: DespesaPipelineItem) => void;
}) {
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageItems = items.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [items]);
  const visual =
    tone === "fixa"
      ? {
          Icon: Pin,
          shell:
            "border-primary/20 bg-linear-to-b from-primary/8 via-card to-card shadow-primary/5",
          head: "from-primary/18",
          stripe: "bg-linear-to-b from-[#0e6f8a] to-primary",
          iconWrap: "bg-primary/15 text-primary",
          totalChip: "bg-primary/12 text-primary",
          countChip: "border-primary/20 bg-primary/10 text-primary",
        }
      : tone === "comissao"
        ? {
            Icon: Percent,
            shell:
              "border-violet-400/30 bg-linear-to-b from-violet-400/12 via-card to-card shadow-violet-400/5",
            head: "from-violet-400/22",
            stripe: "bg-linear-to-b from-violet-600 to-violet-300",
            iconWrap: "bg-violet-400/20 text-violet-700 dark:text-violet-300",
            totalChip: "bg-violet-400/15 text-violet-800 dark:text-violet-200",
            countChip:
              "border-violet-400/30 bg-violet-400/15 text-violet-800 dark:text-violet-200",
          }
        : tone === "variavel"
          ? {
              Icon: Zap,
              shell:
                "border-amber-400/30 bg-linear-to-b from-amber-400/12 via-card to-card shadow-amber-400/5",
              head: "from-amber-400/22",
              stripe: "bg-linear-to-b from-amber-500 to-amber-300",
              iconWrap: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
              totalChip: "bg-amber-400/15 text-amber-800 dark:text-amber-200",
              countChip:
                "border-amber-400/30 bg-amber-400/15 text-amber-800 dark:text-amber-200",
            }
          : {
              Icon: CircleDashed,
              shell:
                "border-slate-400/25 bg-linear-to-b from-slate-400/10 via-card to-card",
              head: "from-slate-400/18",
              stripe: "bg-linear-to-b from-slate-500 to-slate-300",
              iconWrap: "bg-slate-400/15 text-slate-600 dark:text-slate-300",
              totalChip: "bg-slate-400/15 text-slate-700 dark:text-slate-200",
              countChip:
                "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
            };
  const Icon = visual.Icon;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border shadow-sm",
        visual.shell,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-border/50 bg-linear-to-r via-background/80 to-transparent px-3 py-2.5",
          visual.head,
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            visual.iconWrap,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <span
            className={cn(
              "mt-0.5 inline-flex rounded-full border px-1.5 py-px text-[10px] font-medium",
              visual.countChip,
            )}
          >
            {items.length} lançamento{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <p
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums",
            visual.totalChip,
            hideValues && MONEY_BLUR,
          )}
        >
          {brl(Math.round(total))}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        {items.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-1.5 px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {pageItems.map((item) => {
              const meta = [item.centro, item.parceiro].filter(
                (value, index, all) =>
                  Boolean(value) && all.indexOf(value) === index,
              );
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick?.(item)}
                    className="relative grid w-full grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 px-3 py-2 pl-3.5 text-left transition-colors hover:bg-muted/50"
                  >
                  <span
                    className={cn(
                      "absolute inset-y-1.5 left-0 w-0.5 rounded-full",
                      visual.stripe,
                    )}
                  />
                  <p
                    className="min-w-0 truncate text-xs font-medium leading-snug"
                    title={item.descricao}
                  >
                    {item.descricao}
                  </p>
                  <p
                    className={cn(
                      "shrink-0 text-xs font-semibold tabular-nums",
                      hideValues && MONEY_BLUR,
                    )}
                  >
                    {brl(item.valor)}
                  </p>
                  <div className="col-span-2 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="shrink-0 tabular-nums">
                      {formatDate(item.data)}
                    </span>
                    {meta[0] ? (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="min-w-0 truncate">{meta[0]}</span>
                      </>
                    ) : null}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-auto h-4 w-auto shrink-0 px-1.5 text-[9px]",
                        statusBadgeClass(item.status),
                      )}
                    >
                      {statusLabel(item.status)}
                    </Badge>
                  </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {items.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/50 px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {pageSafe + 1} / {pageCount}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5"
            disabled={pageSafe >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
