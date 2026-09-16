import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { EvolucaoBadge, FinanceKpiCard } from "@/components/finance-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FlowTrack, FLOW_BAR_GRADIENTS } from "@/components/flow-bar";
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
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canViewModule } from "@/lib/permissions";
import {
  fetchDashboardRanking,
  fetchCorretorVendas,
  type DashboardRanking,
  type DashboardRankingCorretor,
  type DashboardRankingGerente,
  type PeriodoGranularidade,
} from "@/lib/dashboard-api";
import {
  Building2,
  Crown,
  Goal,
  Loader2,
  Medal,
  TrendingUp,
  Trophy,
  UsersRound,
  Wallet,
} from "lucide-react";
import { SemConexao } from "@/components/sem-conexao";
import { VendasResumoDialog } from "@/components/vendas-resumo-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchConstrutoraVendas, type ConstrutoraVenda } from "@/lib/construtoras-api";

export const Route = createFileRoute("/_app/corretores")({
  head: () => ({ meta: [{ title: "Ranking — Zone Connection" }] }),
  component: Page,
});

const META_TIPO_LABEL: Record<string, string> = {
  vendas: "Vendas",
  documentacoes: "Docs",
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

const GRANULARIDADE_OPTIONS: {
  value: PeriodoGranularidade;
  label: string;
}[] = [
  { value: "mes", label: "Mensal" },
  { value: "bimestre", label: "Bimestre" },
  { value: "trimestre", label: "Trimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "anual", label: "Anual" },
];

const PERIODO_NOUN: Record<PeriodoGranularidade, string> = {
  mes: "mês",
  bimestre: "bimestre",
  trimestre: "trimestre",
  semestre: "semestre",
  anual: "ano",
};

const MESES_CURTOS = [
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

function duracaoMeses(g: PeriodoGranularidade) {
  if (g === "bimestre") return 2;
  if (g === "trimestre") return 3;
  if (g === "semestre") return 6;
  if (g === "anual") return 12;
  return 1;
}

function snapMes(mes: number, g: PeriodoGranularidade) {
  const d = duracaoMeses(g);
  return Math.floor((mes - 1) / d) * d + 1;
}

function recortesDoPeriodo(g: PeriodoGranularidade) {
  const d = duracaoMeses(g);
  const items: { mes: number; label: string }[] = [];
  for (let start = 1; start <= 12; start += d) {
    if (g === "mes") {
      items.push({ mes: start, label: MESES_PT[start - 1] });
      continue;
    }
    const idx = Math.floor((start - 1) / d) + 1;
    const fim = start + d - 1;
    const faixa =
      d === 1
        ? MESES_CURTOS[start - 1]
        : `${MESES_CURTOS[start - 1]}–${MESES_CURTOS[fim - 1]}`;
    items.push({ mes: start, label: `${idx}º (${faixa})` });
  }
  return items;
}

function labelPeriodo(g: PeriodoGranularidade, mes: number, ano: number) {
  if (g === "anual") return String(ano);
  if (g === "mes") {
    return new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const recorte = recortesDoPeriodo(g).find((item) => item.mes === mes);
  return recorte ? `${recorte.label} de ${ano}` : `${ano}`;
}

function agoraBrasil() {
  const brasil = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return {
    ano: brasil.getUTCFullYear(),
    mes: brasil.getUTCMonth() + 1,
  };
}

function Page() {
  const user = getSession();
  const canView = canViewModule(user, "corretores");
  const isGerente = user?.role === "gerente";
  /** Ranking entre gerentes: só admin. */
  const showRankingGerentes = user?.role === "admin";
  const agora = useMemo(() => agoraBrasil(), []);
  const [granularidade, setGranularidade] =
    useState<PeriodoGranularidade>("mes");
  const [mes, setMes] = useState(agora.mes);
  const [ano, setAno] = useState(agora.ano);
  const [data, setData] = useState<DashboardRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendasAlvo, setVendasAlvo] = useState<{
    kind: "construtora" | "corretor";
    id: string;
    nome: string;
  } | null>(null);
  const [vendasItems, setVendasItems] = useState<ConstrutoraVenda[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

  const anosDisponiveis = useMemo(() => {
    const list: number[] = [];
    for (let y = agora.ano; y >= agora.ano - 5; y -= 1) list.push(y);
    return list;
  }, [agora.ano]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchDashboardRanking({ mes, ano, granularidade }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o ranking.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canView, mes, ano, granularidade]);

  useEffect(() => {
    void load();
  }, [load]);

  const gerentesPager = useTablePager(data?.gerentes ?? []);

  useEffect(() => {
    if (!vendasAlvo) {
      setVendasItems([]);
      return;
    }
    let cancelled = false;
    setLoadingVendas(true);
    const request =
      vendasAlvo.kind === "construtora"
        ? fetchConstrutoraVendas(vendasAlvo.id, { mes, ano, granularidade }).then(
            (result) => result.items,
          )
        : fetchCorretorVendas(vendasAlvo.id, { mes, ano, granularidade }).then(
            (result) => result.items,
          );
    void request
      .then((items) => {
        if (!cancelled) setVendasItems(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setVendasItems([]);
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as vendas.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingVendas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendasAlvo, mes, ano, granularidade]);

  const periodoLabel = useMemo(
    () => labelPeriodo(granularidade, snapMes(mes, granularidade), ano),
    [granularidade, mes, ano],
  );
  const recortes = useMemo(
    () => recortesDoPeriodo(granularidade),
    [granularidade],
  );
  const periodoNoun = PERIODO_NOUN[granularidade];
  const filtros = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Período</Label>
        <Select
          value={granularidade}
          onValueChange={(value) => {
            const next = value as PeriodoGranularidade;
            setGranularidade(next);
            setMes(snapMes(mes, next));
          }}
        >
          <SelectTrigger className="h-9 w-32 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARIDADE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {granularidade !== "anual" ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Recorte</Label>
          <Select
            value={String(snapMes(mes, granularidade))}
            onValueChange={(value) => setMes(Number(value))}
          >
            <SelectTrigger className="h-9 min-w-38 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recortes.map((item) => (
                <SelectItem key={item.mes} value={String(item.mes)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Ano</Label>
        <Select value={String(ano)} onValueChange={(value) => setAno(Number(value))}>
          <SelectTrigger className="h-9 w-22 bg-background">
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
    </div>
  );

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Ranking"
          description="Ranking e métricas mensais da imobiliária."
        />
        <SemConexao
          title="Acesso restrito"
          description="Peça ao administrador para liberar o módulo Ranking nas permissões do seu usuário."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ranking"
        description={
          isGerente
            ? `Ranking dos corretores da sua equipe · ${periodoLabel}.`
            : `Ranking completo e métricas de ${periodoLabel}.`
        }
        actions={filtros}
      />

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando ranking…
        </div>
      ) : !data ? (
        <SemConexao
          title="Sem dados"
          description="Não foi possível carregar o ranking. Tente novamente."
        />
      ) : (
        <>
          <section className="mt-4 grid gap-3 grid-cols-2 xl:grid-cols-4">
            <FinanceKpiCard
              label={`Entradas do ${periodoNoun}`}
              value={data.totais.entradas ?? 0}
              icon={UsersRound}
              tone="emerald"
              format="number"
            />
            <FinanceKpiCard
              label={`Vendas do ${periodoNoun}`}
              value={data.totais.vendas ?? 0}
              icon={TrendingUp}
              tone="blue"
              format="number"
            />
            <FinanceKpiCard
              label={`VGV do ${periodoNoun}`}
              value={data.totais.vgv ?? 0}
              icon={Wallet}
              tone="violet"
              format="money"
            />
            <FinanceKpiCard
              label="Taxa de conversão"
              value={data.totais.taxaConversao ?? 0}
              icon={Goal}
              tone="teal"
              format="percent"
            />
          </section>

          <p className="mt-3 text-xs text-muted-foreground">
            {data.totais.corretores} corretor
            {data.totais.corretores === 1 ? "" : "es"}
            {showRankingGerentes && (
              <>
                {" "}
                · {data.totais.gerentes} gerente
                {data.totais.gerentes === 1 ? "" : "s"}
              </>
            )}{" "}
            · {data.totais.visitas} visita
            {data.totais.visitas === 1 ? "" : "s"} · {data.totais.perdidos}{" "}
            perdido
            {data.totais.perdidos === 1 ? "" : "s"} no mês
          </p>

          <section className={isGerente ? "mt-5 mb-6" : "mt-5"}>
            <div className="grid gap-4 xl:grid-cols-2">
              <PodioVendas
                title="Pódio de vendas · corretores"
                items={data.corretores.map((row) => ({
                  id: row.corretorId,
                  nome: row.nome,
                  vendas: row.vendas.valor,
                  vgv: row.vgv.valor,
                }))}
                onSelect={(item) =>
                  setVendasAlvo({
                    kind: "corretor",
                    id: item.id,
                    nome: item.nome,
                  })
                }
              />
              <PodioVendas
                title="Pódio de vendas · construtoras"
                items={data.construtoras.map((item) => ({
                  id: item.construtoraId,
                  nome: item.nome,
                  vendas: item.vendas,
                  vgv: item.vgv,
                }))}
                onSelect={(item) =>
                  setVendasAlvo({
                    kind: "construtora",
                    id: item.id,
                    nome: item.nome,
                  })
                }
              />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <RankingList
                corretores={data.corretores}
                onSelect={(row) =>
                  setVendasAlvo({
                    kind: "corretor",
                    id: row.corretorId,
                    nome: row.nome,
                  })
                }
              />
              <ConstrutorasRanking
                items={data.construtoras}
                selectedId={
                  vendasAlvo?.kind === "construtora" ? vendasAlvo.id : undefined
                }
                onSelect={(item) =>
                  setVendasAlvo({
                    kind: "construtora",
                    id: item.construtoraId,
                    nome: item.nome,
                  })
                }
              />
            </div>
          </section>

          {showRankingGerentes && (
            <section className="mt-5 mb-6 space-y-4">
              <PodioVendas
                title="Pódio de vendas · gerentes"
                items={data.gerentes.map((row) => ({
                  id: `${row.gerenteId}:${row.equipeId}`,
                  nome: row.nome,
                  vendas: row.vendas.valor,
                  vgv: row.vgv.valor,
                }))}
              />
              <Card className="overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/[0.09] via-primary/[0.03] to-transparent">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-primary" />
                    Ranking Gerentes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Agregado pela equipe liderada · ordenado por VGV do período.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {data.gerentes.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-6 py-4">
                      Nenhuma equipe com gerente cadastrada.
                    </p>
                  ) : (
                    <>
                    <Table className="min-w-200 [&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Gerente</TableHead>
                          <TableHead className="text-right">
                            Corretores
                          </TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">Entradas</TableHead>
                          <TableHead className="text-right">Visitas</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">VGV</TableHead>
                          <TableHead className="text-right">Conv.</TableHead>
                          <TableHead className="text-right">Perdidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gerentesPager.pageItems.map((r) => (
                          <GerenteRow key={r.gerenteId} row={r} />
                        ))}
                      </TableBody>
                    </Table>
                    <TablePager
                      page={gerentesPager.page}
                      totalPages={gerentesPager.totalPages}
                      total={gerentesPager.total}
                      onPageChange={gerentesPager.setPage}
                    />
                    </>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
      <VendasResumoDialog
        open={Boolean(vendasAlvo)}
        onOpenChange={(open) => {
          if (!open) setVendasAlvo(null);
        }}
        title={
          vendasAlvo
            ? `Vendas de ${vendasAlvo.nome}`
            : "Vendas"
        }
        items={vendasItems}
        loading={loadingVendas}
        mode={vendasAlvo?.kind === "corretor" ? "corretor" : "construtora"}
      />
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PodioVendas({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Array<{ id: string; nome: string; vendas: number; vgv: number }>;
  onSelect?: (item: {
    id: string;
    nome: string;
    vendas: number;
    vgv: number;
  }) => void;
}) {
  const slots = [
    {
      row: items[1],
      place: 2 as const,
      step: "h-24 sm:h-28",
      avatar:
        "border-slate-200 bg-linear-to-br from-slate-100 to-slate-300 text-slate-800 ring-slate-300/40 dark:from-slate-400 dark:to-slate-600",
      stepClass: "text-slate-800 rounded-tl-2xl",
      flow: FLOW_BAR_GRADIENTS.slate,
    },
    {
      row: items[0],
      place: 1 as const,
      step: "h-36 sm:h-44",
      avatar:
        "border-amber-200 bg-linear-to-br from-amber-300 to-amber-500 text-amber-950 ring-amber-300/50 shadow-lg shadow-amber-500/20",
      stepClass: "text-amber-950 rounded-t-2xl shadow-md z-[1]",
      flow: FLOW_BAR_GRADIENTS.amber,
    },
    {
      row: items[2],
      place: 3 as const,
      step: "h-20 sm:h-24",
      avatar:
        "border-orange-200 bg-linear-to-br from-orange-300 to-orange-500 text-orange-950 ring-orange-300/40",
      stepClass: "text-orange-950 rounded-tr-2xl",
      flow: FLOW_BAR_GRADIENTS.orange,
    },
  ].filter((s) => Boolean(s.row));

  if (slots.length === 0) {
    return (
      <Card className="overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-primary/5 text-foreground">
        <CardContent className="relative flex min-h-72 flex-col items-center justify-center p-5 sm:p-7">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <Trophy className="h-4 w-4" /> {title}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Nenhuma venda no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-primary/5 text-foreground">
      <CardContent className="relative p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_70%)] opacity-10" />
        <div className="relative flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <Trophy className="h-4 w-4" /> {title}
        </div>

        <div className="relative mx-auto mt-7 max-w-lg">
          <div className="flex items-end justify-center gap-0">
            {slots.map(({ row, place, step, avatar, stepClass, flow }) => {
              if (!row) return null;
              const inner = (
                <>
                  <div className="mb-3 flex w-full flex-col items-center px-1 text-center sm:px-2">
                    <div
                      className={cn(
                        "podio-float relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold ring-4 sm:h-14 sm:w-14",
                        place === 1 && "podio-float-delay-1",
                        place === 2 && "podio-float-delay-2",
                        place === 3 && "podio-float-delay-3",
                        avatar,
                        place === 1 && "h-14 w-14 sm:h-16 sm:w-16 text-base",
                      )}
                    >
                      {initials(row.nome)}
                      <span
                        className={cn(
                          "absolute -top-2 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black shadow-sm",
                          place === 1 && "bg-amber-500 text-amber-950",
                          place === 2 && "bg-slate-400 text-slate-950",
                          place === 3 && "bg-orange-500 text-orange-950",
                        )}
                      >
                        {place === 1 ? (
                          <Crown className="h-3 w-3" />
                        ) : (
                          `${place}º`
                        )}
                      </span>
                    </div>
                    <p className="mt-2.5 w-full truncate text-xs font-semibold sm:text-sm">
                      {row.nome}
                    </p>
                    <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                      {row.vendas} venda
                      {row.vendas === 1 ? "" : "s"}
                      <br className="sm:hidden" />
                      <span className="hidden sm:inline"> · </span>
                      {money(row.vgv)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "funil-bar-flow relative flex w-full flex-col items-center justify-start gap-1 overflow-hidden border border-b-0 border-black/5 pt-3",
                      step,
                      stepClass,
                    )}
                    style={{ backgroundImage: flow }}
                  >
                    <span className="relative z-10 text-base font-black tracking-tight sm:text-lg">
                      #{place}
                    </span>
                    {place === 1 ? (
                      <Trophy className="relative z-10 h-4 w-4 opacity-80" />
                    ) : (
                      <Medal className="relative z-10 h-3.5 w-3.5 opacity-70" />
                    )}
                  </div>
                </>
              );
              const className =
                "flex min-w-0 flex-1 flex-col items-center transition-transform hover:-translate-y-0.5";
              if (onSelect) {
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onSelect(row)}
                    className={className}
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <div key={row.id} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
          <div className="h-2.5 rounded-b-2xl bg-primary/20 shadow-inner" />
        </div>
      </CardContent>
    </Card>
  );
}

function podiumListRowClass(place: number) {
  return cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
    place === 1 &&
      "bg-amber-200/75 hover:bg-amber-200 dark:bg-amber-500/25 dark:hover:bg-amber-500/35",
    place === 2 &&
      "bg-slate-200/85 hover:bg-slate-200 dark:bg-slate-400/25 dark:hover:bg-slate-400/35",
    place === 3 &&
      "bg-orange-200/75 hover:bg-orange-200 dark:bg-orange-500/25 dark:hover:bg-orange-500/35",
    place > 3 && "hover:bg-muted/60",
  );
}

function RankingList({
  corretores,
  onSelect,
}: {
  corretores: DashboardRankingCorretor[];
  onSelect: (row: DashboardRankingCorretor) => void;
}) {
  const maxVgv = Math.max(...corretores.map((row) => row.vgv.valor ?? 0), 1);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Medal className="h-4 w-4 text-amber-500" /> Ranking geral · corretores por venda
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Clique no corretor para ver as vendas.
        </p>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {corretores.slice(0, 8).map((row) => {
          const place = row.posicao;
          const topThree = place <= 3;
          const pct = Math.max(6, ((row.vgv.valor ?? 0) / maxVgv) * 100);
          return (
            <button
              key={row.corretorId}
              type="button"
              onClick={() => onSelect(row)}
              className={podiumListRowClass(place)}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                  place === 1 && "bg-amber-400/20 text-amber-600",
                  place === 2 && "bg-slate-400/20 text-slate-500",
                  place === 3 && "bg-orange-400/20 text-orange-600",
                  !topThree && "bg-muted text-muted-foreground",
                )}
              >
                {place}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className={cn(
                    "text-[11px] font-semibold",
                    topThree ? "bg-primary/10 text-primary" : "bg-muted",
                  )}
                >
                  {initials(row.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      topThree ? "font-bold" : "font-medium",
                    )}
                  >
                    {row.nome}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {money(row.vgv.valor)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <FlowTrack
                    percent={pct}
                    tone={
                      place === 1
                        ? "amber"
                        : place === 2
                          ? "slate"
                          : place === 3
                            ? "orange"
                            : "primary"
                    }
                    className="h-2.5 flex-1"
                  />
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {row.vendas.valor} {row.vendas.valor === 1 ? "venda" : "vendas"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ConstrutorasRanking({
  items,
  selectedId,
  onSelect,
}: {
  items: Array<{
    construtoraId: string;
    nome: string;
    vendas: number;
    vgv: number;
  }>;
  selectedId?: string;
  onSelect: (item: {
    construtoraId: string;
    nome: string;
    vendas: number;
    vgv: number;
  }) => void;
}) {
  const maxVgv = Math.max(...items.map((item) => item.vgv), 1);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary" /> Top construtoras · VGV
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Clique na construtora para ver os corretores e o VGV de cada venda.
        </p>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {items.length ? (
          items.map((item, index) => {
            const place = index + 1;
            const topThree = place <= 3;
            const selected = item.construtoraId === selectedId;
            const pct = Math.max(6, (item.vgv / maxVgv) * 100);
            return (
              <button
                key={item.construtoraId}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  podiumListRowClass(place),
                  selected && !topThree && "bg-primary/5",
                  selected && "ring-1 ring-inset ring-primary/30",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                    place === 1 && "bg-amber-400/20 text-amber-600",
                    place === 2 && "bg-slate-400/20 text-slate-500",
                    place === 3 && "bg-orange-400/20 text-orange-600",
                    !topThree && "bg-muted text-muted-foreground",
                  )}
                >
                  {place}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        topThree ? "font-bold" : "font-medium",
                      )}
                    >
                      {item.nome}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {money(item.vgv)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <FlowTrack
                      percent={pct}
                      tone={
                        place === 1
                          ? "amber"
                          : place === 2
                            ? "slate"
                            : place === 3
                              ? "orange"
                              : "primary"
                      }
                      className="h-2.5 flex-1"
                    />
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {item.vendas} {item.vendas === 1 ? "venda" : "vendas"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <p className="px-4 py-5 text-center text-sm text-muted-foreground">
            Nenhuma venda no período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CorretorRow({ row }: { row: DashboardRankingCorretor }) {
  const vendas = row.vendas.valor ?? 0;
  const vgv = row.vgv.valor ?? 0;
  const entradas = row.entradas.valor ?? 0;
  const conversao = row.taxaConversao.valor ?? 0;
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">
        {row.posicao}
      </td>
      <td className="py-2.5 pr-2">
        <div className="font-medium">{row.nome}</div>
        <div className="text-xs text-muted-foreground">
          {row.equipe ?? "Sem equipe"}
          {row.gerente ? ` · ${row.gerente}` : ""}
        </div>
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.leads ?? 0}</td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{entradas}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct ?? 0}
          previous={row.entradas.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.visitas ?? 0}</td>
      <td className="py-2.5 pr-2 text-right tabular-nums">
        {row.documentacoes ?? 0}
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{vendas}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct ?? 0}
          previous={row.vendas.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">{money(vgv)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct ?? 0}
          previous={row.vgv.valorMesAnterior ?? 0}
        />
      </td>
      <td className="py-2.5 pr-2 text-right">
        <div className="tabular-nums font-medium">
          {conversao.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct ?? 0} />
      </td>
      <td className="py-2.5 pr-2 text-right tabular-nums">{row.perdidos ?? 0}</td>
      <td className="py-2.5 text-right">
        {row.meta ? (
          <div className="min-w-22 ml-auto">
            <div className="flex items-center justify-end gap-1 text-xs">
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {META_TIPO_LABEL[row.meta.tipo] ?? row.meta.tipo}
              </Badge>
              <span className="tabular-nums font-medium">
                {row.meta.percentual}%
              </span>
            </div>
            <Progress value={row.meta.percentual} className="h-1.5 mt-1" />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function GerenteRow({ row }: { row: DashboardRankingGerente }) {
  const vendas = row.vendas.valor ?? 0;
  const vgv = row.vgv.valor ?? 0;
  const entradas = row.entradas.valor ?? 0;
  const conversao = row.taxaConversao.valor ?? 0;
  return (
    <TableRow className="align-top hover:bg-muted/40">
      <TableCell className="tabular-nums text-muted-foreground">
        {row.posicao}
      </TableCell>
      <TableCell>
        <div className="font-medium">{row.nome}</div>
        <div className="text-xs text-muted-foreground">{row.equipe}</div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.corretores}</TableCell>
      <TableCell className="text-right tabular-nums">{row.leads ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">{entradas}</div>
        <EvolucaoBadge
          value={row.entradas.evolucaoPct ?? 0}
          previous={row.entradas.valorMesAnterior ?? 0}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.visitas ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">{vendas}</div>
        <EvolucaoBadge
          value={row.vendas.evolucaoPct ?? 0}
          previous={row.vendas.valorMesAnterior ?? 0}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">{money(vgv)}</div>
        <EvolucaoBadge
          value={row.vgv.evolucaoPct ?? 0}
          previous={row.vgv.valorMesAnterior ?? 0}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="tabular-nums font-medium">
          {conversao.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %
        </div>
        <EvolucaoBadge value={row.taxaConversao.evolucaoPct ?? 0} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.perdidos ?? 0}</TableCell>
    </TableRow>
  );
}
