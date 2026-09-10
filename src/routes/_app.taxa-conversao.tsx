import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FlowBar } from "@/components/flow-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SemConexao } from "@/components/sem-conexao";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canViewModule } from "@/lib/permissions";
import {
  fetchDashboardAdmin,
  fetchDashboardRanking,
  type DashboardAdmin,
  type DashboardRanking,
  type DashboardRankingCorretor,
} from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";
import {
  FILTER_BAR_SHELL,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import {
  FileText,
  Goal,
  Loader2,
  Percent,
  Search,
  TrendingUp,
  UserRound,
  UsersRound,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/taxa-conversao")({
  head: () => ({ meta: [{ title: "Taxa de conversão — Zone Connection" }] }),
  component: Page,
});

type SortKey = "taxa" | "vendas" | "docs" | "vgv" | "nome";

const chartConfig = {
  documentacoes: { label: "Documentações", color: "hsl(199 89% 48%)" },
  vendas: { label: "Vendas", color: "hsl(160 84% 39%)" },
  taxa: { label: "Taxa %", color: "hsl(262 83% 58%)" },
} satisfies ChartConfig;

function formatMesLabel(inicioIso: string) {
  return new Date(inicioIso).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Recife",
  });
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
      {children}
    </div>
  );
}

function Page() {
  const user = getSession();
  const canView = canViewModule(user, "taxaConversao");
  const isPlatformAdmin = user?.role === "super_admin";
  /** Ranking entre gerentes/equipes: só admin da imobiliária. */
  const showRankingGerentes = user?.role === "admin";
  const isGerente = user?.role === "gerente";

  const [admin, setAdmin] = useState<DashboardAdmin | null>(null);
  const [ranking, setRanking] = useState<DashboardRanking | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [equipe, setEquipe] = useState("__all__");
  const [sortBy, setSortBy] = useState<SortKey>("taxa");

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isPlatformAdmin) {
        setAdmin(await fetchDashboardAdmin());
        setRanking(null);
      } else {
        const [a, r] = await Promise.all([
          fetchDashboardAdmin(),
          fetchDashboardRanking(),
        ]);
        setAdmin(a);
        setRanking(r);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a taxa de conversão.",
      );
      setAdmin(null);
      setRanking(null);
    } finally {
      setLoading(false);
    }
  }, [canView, isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const equipes = useMemo(() => {
    if (!ranking) return [];
    const set = new Set(
      ranking.corretores.map((c) => c.equipe).filter(Boolean) as string[],
    );
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [ranking]);

  const corretoresFiltrados = useMemo(() => {
    if (!ranking) return [];
    const q = search.trim().toLowerCase();
    let rows = ranking.corretores.filter((c) => {
      if (equipe !== "__all__" && c.equipe !== equipe) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        (c.equipe?.toLowerCase().includes(q) ?? false) ||
        (c.gerente?.toLowerCase().includes(q) ?? false)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case "vendas":
          return b.vendas.valor - a.vendas.valor;
        case "docs":
          return b.documentacoes - a.documentacoes;
        case "vgv":
          return b.vgv.valor - a.vgv.valor;
        case "nome":
          return a.nome.localeCompare(b.nome, "pt-BR");
        case "taxa":
        default:
          return (
            b.taxaConversao.valor - a.taxaConversao.valor ||
            b.vendas.valor - a.vendas.valor
          );
      }
    });

    return rows;
  }, [ranking, search, equipe, sortBy]);

  const chartData = useMemo(() => {
    return [...corretoresFiltrados]
      .sort((a, b) => b.taxaConversao.valor - a.taxaConversao.valor)
      .slice(0, 8)
      .map((c) => ({
        nome:
          c.nome.split(" ")[0] +
          (c.nome.split(" ").length > 1
            ? ` ${c.nome.split(" ").at(-1)?.[0]}.`
            : ""),
        documentacoes: c.documentacoes,
        vendas: c.vendas.valor,
        taxa: c.taxaConversao.valor,
      }));
  }, [corretoresFiltrados]);

  const hasActiveFilters = Boolean(
    search || (!isGerente && equipe !== "__all__"),
  );

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Taxa de conversão"
          description={
            isPlatformAdmin
              ? "Vendas e taxa de conversão da empresa."
              : "Entradas, vendas e conversão por corretor."
          }
        />
        <SemConexao
          title="Acesso restrito"
          description="Peça ao administrador para liberar o módulo Taxa de conversão nas permissões do seu usuário."
        />
      </div>
    );
  }

  if (loading && !admin && !ranking) {
    return (
      <div>
        <PageHeader title="Taxa de conversão" />
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando indicadores…
        </div>
      </div>
    );
  }

  if (!admin || (!isPlatformAdmin && !ranking)) {
    return (
      <div>
        <PageHeader title="Taxa de conversão" />
        <SemConexao
          title="Indicadores indisponíveis"
          description="Não foi possível carregar os dados de conversão."
        />
      </div>
    );
  }

  const mes = formatMesLabel(admin.periodo.mesAtual.inicio);
  const conv = admin.conversao;

  return (
    <div>
      <PageHeader
        title="Taxa de conversão"
        description={
          isPlatformAdmin
            ? `Vendas e conversão · ${mes} · comparação com o mês anterior.`
            : `Documentações do mês × vendas · ${mes} · comparação com o mês anterior.`
        }
      />

      <section
        className={
          isPlatformAdmin
            ? "mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4"
            : "mb-4 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6"
        }
      >
        {isPlatformAdmin ? null : (
          <FinanceKpiCard
            label="Documentações"
            value={conv.documentacoes.valor}
            evolucaoPct={conv.documentacoes.evolucaoPct}
            valorMesAnterior={conv.documentacoes.valorMesAnterior}
            icon={FileText}
            tone="blue-1"
            format="number"
          />
        )}
        <FinanceKpiCard
          label="Vendas"
          value={conv.vendas.valor}
          evolucaoPct={conv.vendas.evolucaoPct}
          valorMesAnterior={conv.vendas.valorMesAnterior}
          icon={TrendingUp}
          tone="blue-2"
          format="number"
        />
        <FinanceKpiCard
          label="Taxa de conversão"
          value={conv.taxa.valor}
          evolucaoPct={conv.taxa.evolucaoPct}
          valorMesAnterior={conv.taxa.valorMesAnterior}
          icon={Percent}
          tone="blue-3"
          format="percent"
        />
        <FinanceKpiCard
          label="VGV convertido"
          value={conv.vgv.valor}
          evolucaoPct={conv.vgv.evolucaoPct}
          valorMesAnterior={conv.vgv.valorMesAnterior}
          icon={Wallet}
          tone="blue-4"
        />
        <FinanceKpiCard
          label="Leads perdidos"
          value={admin.perdidos.mes.valor}
          evolucaoPct={admin.perdidos.mes.evolucaoPct}
          valorMesAnterior={admin.perdidos.mes.valorMesAnterior}
          icon={UserX}
          tone="blue-5"
          format="number"
          invertEvolucao
        />
        {isPlatformAdmin || !ranking ? null : (
          <FinanceKpiCard
            label="Taxa geral (ranking)"
            value={ranking.totais.taxaConversao}
            icon={Goal}
            tone="blue-6"
            format="percent"
            suffix={`· ${ranking.totais.visitas} visitas`}
          />
        )}
      </section>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Funil do mês</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isPlatformAdmin ? (
              <>
                {conv.vendas.valor} venda
                {conv.vendas.valor === 1 ? "" : "s"} no mês (
                <span className="table-person-name tabular-nums">
                  {conv.taxa.valor.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </span>{" "}
                de conversão) · {admin.perdidos.mes.valor} perdido
                {admin.perdidos.mes.valor === 1 ? "" : "s"}.
              </>
            ) : (
              <>
                Das{" "}
                <span className="table-person-name tabular-nums">
                  {conv.documentacoes.valor}
                </span>{" "}
                documentações do mês,{" "}
                <span className="table-person-name tabular-nums">
                  {conv.vendas.valor}
                </span>{" "}
                viraram venda (
                <span className="table-person-name tabular-nums">
                  {conv.taxa.valor.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </span>
                ).
              </>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPlatformAdmin ? null : (
            <FlowBar
              label="Documentações"
              value={conv.documentacoes.valor}
              max={Math.max(conv.documentacoes.valor, 1)}
              tone="sky"
            />
          )}
          <FlowBar
            label="Vendas"
            value={conv.vendas.valor}
            max={Math.max(
              isPlatformAdmin
                ? conv.vendas.valor
                : conv.documentacoes.valor,
              admin.perdidos.mes.valor,
              1,
            )}
            tone="emerald"
          />
          <FlowBar
            label="Perdidos no mês"
            value={admin.perdidos.mes.valor}
            max={Math.max(
              isPlatformAdmin
                ? conv.vendas.valor
                : conv.documentacoes.valor,
              admin.perdidos.mes.valor,
              1,
            )}
            tone="rose"
          />
        </CardContent>
      </Card>

      {isPlatformAdmin ? null : (
      <>
      <div className={FILTER_BAR_SHELL}>
        <div className="relative min-w-50 max-w-sm flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isGerente
                ? "Buscar corretor…"
                : "Buscar corretor, equipe, gerente…"
            }
            className={cn("pl-9", FILTER_CONTROL)}
          />
        </div>
        {!isGerente && (
          <Select value={equipe} onValueChange={setEquipe}>
            <SelectTrigger className={cn("w-full sm:w-45", FILTER_CONTROL)}>
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as equipes</SelectItem>
              {equipes.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className={cn("w-full sm:w-45", FILTER_CONTROL)}>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="taxa">Maior conversão</SelectItem>
            <SelectItem value="vendas">Mais vendas</SelectItem>
            <SelectItem value="docs">Mais documentações</SelectItem>
            <SelectItem value="vgv">Maior VGV</SelectItem>
            <SelectItem value="nome">Nome A–Z</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={FILTER_CLEAR_BTN}
            onClick={() => {
              setSearch("");
              setEquipe("__all__");
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Documentações × vendas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top 8 corretores por taxa (filtro aplicado).
            </p>
          </CardHeader>
          <CardContent className="min-w-0">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados para o filtro.
              </p>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto! h-70 w-full min-w-120"
                >
                  <BarChart
                    data={chartData}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nome"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      height={40}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      dataKey="documentacoes"
                      fill="var(--color-documentacoes)"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="vendas"
                      fill="var(--color-vendas)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taxa por corretor (%)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Conversão = vendas ÷ documentações do mês.
            </p>
          </CardHeader>
          <CardContent className="min-w-0">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados para o filtro.
              </p>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto! h-70 w-full min-w-120"
                >
                  <BarChart
                    data={chartData}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nome"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      height={40}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            `${Number(value).toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}%`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="taxa"
                      fill="var(--color-taxa)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            Conversão por corretor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {corretoresFiltrados.length} de {ranking?.corretores.length ?? 0}{" "}
            corretor(es)
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto overflow-y-hidden">
          {corretoresFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum corretor para os filtros.
            </p>
          ) : (
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium w-10">#</th>
                  <th className="pb-2 pr-2 font-medium">Corretor</th>
                  <th className="pb-2 pr-2 font-medium text-right">Docs</th>
                  <th className="pb-2 pr-2 font-medium text-right">Vendas</th>
                  <th className="pb-2 pr-2 font-medium text-right">Taxa</th>
                  <th className="pb-2 pr-2 font-medium text-right">VGV</th>
                  <th className="pb-2 pr-2 font-medium text-right">Visitas</th>
                  <th className="pb-2 font-medium text-right">Perdidos</th>
                </tr>
              </thead>
              <tbody>
                {corretoresFiltrados.map((row, idx) => (
                  <CorretorConversaoRow
                    key={row.corretorId}
                    row={row}
                    posicao={idx + 1}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {showRankingGerentes && ranking && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-primary" />
              Conversão por gerente / equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto overflow-y-hidden">
            {ranking.gerentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhuma equipe com gerente cadastrada.
              </p>
            ) : (
              <table className="w-full min-w-180 text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium w-10">#</th>
                    <th className="pb-2 pr-2 font-medium">Gerente</th>
                    <th className="pb-2 pr-2 font-medium text-right">
                      Corretores
                    </th>
                    <th className="pb-2 pr-2 font-medium text-right">
                      Docs
                    </th>
                    <th className="pb-2 pr-2 font-medium text-right">Vendas</th>
                    <th className="pb-2 pr-2 font-medium text-right">Taxa</th>
                    <th className="pb-2 font-medium text-right">VGV</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ranking.gerentes]
                    .sort(
                      (a, b) =>
                        b.taxaConversao.valor - a.taxaConversao.valor ||
                        b.vendas.valor - a.vendas.valor,
                    )
                    .map((g, idx) => (
                      <tr
                        key={g.gerenteId}
                        className="border-b border-border/40"
                      >
                        <td className="py-2.5 pr-2 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="font-medium">{g.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {g.equipe}
                          </div>
                        </td>
                        <td className="py-2.5 pr-2 text-right tabular-nums">
                          {g.corretores}
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <div className="tabular-nums font-medium">
                            {g.documentacoes ?? 0}
                          </div>
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <div className="tabular-nums font-medium">
                            {g.vendas.valor}
                          </div>
                          <EvolucaoBadge
                            value={g.vendas.evolucaoPct}
                            previous={g.vendas.valorMesAnterior}
                          />
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <div className="tabular-nums font-semibold">
                            {g.taxaConversao.valor.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}
                            %
                          </div>
                          <EvolucaoBadge value={g.taxaConversao.evolucaoPct} />
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-medium">
                          {money(g.vgv.valor)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CorretorConversaoRow({
  row,
  posicao,
}: {
  row: DashboardRankingCorretor;
  posicao: number;
}) {
  const taxa = row.taxaConversao.valor;
  return (
    <tr className="border-b border-border/40">
      <td className="py-2.5 pr-2 text-muted-foreground">{posicao}</td>
      <td className="py-2.5 pr-2">
        <div className="font-medium">{row.nome}</div>
        <div className="text-xs text-muted-foreground">
          {row.equipe ?? "Sem equipe"}
          {row.gerente ? ` · ${row.gerente}` : ""}
        </div>
        <div className="mt-1.5 max-w-40">
          <Progress value={Math.min(taxa, 100)} className="h-1.5" />
        </div>
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{row.documentacoes}</div>
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{row.vendas.valor}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct}
          previous={row.vendas.valorMesAnterior}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <Badge
          variant="outline"
          className={cn(
            "tabular-nums font-semibold",
            taxa >= 20
              ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : taxa >= 10
                ? "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300"
                : "border-transparent bg-muted text-muted-foreground",
          )}
        >
          {taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
        </Badge>
        <div className="mt-0.5">
          <EvolucaoBadge value={row.taxaConversao.evolucaoPct} />
        </div>
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums font-medium">
        {money(row.vgv.valor)}
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.visitas}</td>
      <td className="py-2.5 text-right tabular-nums">{row.perdidos}</td>
    </tr>
  );
}
