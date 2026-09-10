import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addDays,
  endOfMonth,
  formatRangeLabel,
  getVisibleRange,
  startOfDay,
  startOfMonth,
  toDateInput,
  type AgendaViewMode,
} from "@/components/agenda-board";
import { FluxoCaixaBoard } from "@/components/fluxo-caixa-board";
import { PageHeader } from "@/components/app-shell";
import { HideFinanceValuesButton } from "@/components/hide-finance-values-button";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canFinanceiroAction } from "@/lib/permissions";
import {
  baixarTitulo,
  fetchFluxoCaixa,
  fetchFluxoCaixaItens,
  updateMovimento,
} from "@/lib/financeiro-api";
import {
  brl,
  formatDate,
  FLUXO_ORIGEM_LABEL,
  type FluxoBucket,
  type FluxoGranularidade,
  type FluxoItem,
} from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";
import { FILTER_BAR_SURFACE } from "@/lib/filter-bar";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Loader2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/financeiro/fluxo-caixa")({
  head: () => ({ meta: [{ title: "Fluxo de caixa — Zone Connection" }] }),
  component: Page,
});

const fluxoConfig = {
  entradasRealizadas: {
    label: "Entradas realizadas",
    color: "hsl(160 84% 39%)",
  },
  entradasPrevistas: {
    label: "Entradas previstas",
    color: "hsl(160 60% 55%)",
  },
  saidasRealizadas: { label: "Saídas realizadas", color: "hsl(0 72% 51%)" },
  saidasPrevistas: { label: "Saídas previstas", color: "hsl(0 55% 65%)" },
  saldoProjetado: { label: "Saldo projetado", color: "hsl(199 89% 48%)" },
  saldoRealizado: { label: "Saldo realizado", color: "hsl(215 70% 50%)" },
} satisfies ChartConfig;

type LayoutMode = "tabela" | "calendario";

const VIEW_OPTIONS: { id: AgendaViewMode; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

function viewToGranularidade(view: AgendaViewMode): FluxoGranularidade {
  if (view === "dia") return "dia";
  if (view === "semana") return "semana";
  return "mes";
}

function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ResponsiveChartShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
      {children}
    </div>
  );
}

function Page() {
  const canEditFin = canFinanceiroAction(getSession(), "edit");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("calendario");
  const [view, setView] = useState<AgendaViewMode>("mes");
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    startOfDay(new Date()),
  );
  const [buckets, setBuckets] = useState<FluxoBucket[]>([]);
  const [items, setItems] = useState<FluxoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLabel, setDetailLabel] = useState("");
  const [detailItems, setDetailItems] = useState<FluxoItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDate, setConfirmDate] = useState(() => toDateInput(new Date()));
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  /** Grade do calendário (inclui dias de meses vizinhos). */
  const boardRange = useMemo(
    () => getVisibleRange(view, selectedDay),
    [view, selectedDay],
  );

  /** Período dos KPIs/gráficos/tabela: no modo mês, só o mês selecionado. */
  const dataRange = useMemo(() => {
    if (view === "mes") {
      return {
        from: startOfMonth(selectedDay),
        to: endOfMonth(selectedDay),
      };
    }
    return boardRange;
  }, [view, selectedDay, boardRange]);

  const dataFromIso = toDateInput(dataRange.from);
  const dataToIso = toDateInput(dataRange.to);
  const itemsFromIso = toDateInput(
    layoutMode === "calendario" ? boardRange.from : dataRange.from,
  );
  const itemsToIso = toDateInput(
    layoutMode === "calendario" ? boardRange.to : dataRange.to,
  );
  const granularidade = viewToGranularidade(view);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, i] = await Promise.all([
        fetchFluxoCaixa({
          from: dataFromIso,
          to: dataToIso,
          granularidade,
        }),
        fetchFluxoCaixaItens({ from: itemsFromIso, to: itemsToIso }),
      ]);
      setBuckets(b);
      setItems(i);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o fluxo de caixa.",
      );
    } finally {
      setLoading(false);
    }
  }, [dataFromIso, dataToIso, itemsFromIso, itemsToIso, granularidade]);

  useEffect(() => {
    void load();
  }, [load]);

  const totais = useMemo(() => {
    const entradasRealizadas = buckets.reduce(
      (s, d) => s + d.entradasRealizadas,
      0,
    );
    const saidasRealizadas = buckets.reduce(
      (s, d) => s + d.saidasRealizadas,
      0,
    );
    const entradasPrevistas = buckets.reduce(
      (s, d) => s + d.entradasPrevistas,
      0,
    );
    const saidasPrevistas = buckets.reduce((s, d) => s + d.saidasPrevistas, 0);
    return {
      entradasRealizadas,
      saidasRealizadas,
      entradasPrevistas,
      saidasPrevistas,
      saldoProjetado: buckets.at(-1)?.saldoProjetado ?? 0,
    };
  }, [buckets]);
  const [hideValues] = useHideFinanceiroValues();

  const chartData = useMemo(
    () => buckets.map((d) => ({ ...d, eixo: d.label })),
    [buckets],
  );

  const rangeTitle =
    layoutMode === "tabela" && view === "dia"
      ? selectedDay.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : formatRangeLabel(view, selectedDay);

  function goToday() {
    setSelectedDay(startOfDay(new Date()));
  }

  function navigate(direction: -1 | 1) {
    if (view === "dia") {
      setSelectedDay((d) => addDays(d, direction));
      return;
    }
    if (view === "semana") {
      setSelectedDay((d) => addDays(d, direction * 7));
      return;
    }
    setSelectedDay((d) =>
      startOfDay(new Date(d.getFullYear(), d.getMonth() + direction, 1)),
    );
  }

  function goToMonth(year: number, monthIndex: number) {
    setSelectedDay(startOfDay(new Date(year, monthIndex, 1)));
    setView("mes");
  }

  async function openDayDetail(day: Date) {
    const iso = toDateInput(day);
    setDetailLabel(
      day.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    );
    setConfirmDate(iso);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setDetailItems(await fetchFluxoCaixaItens({ from: iso, to: iso }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os itens.",
      );
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openBucketDetail(b: FluxoBucket) {
    setDetailLabel(b.label);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setDetailItems(await fetchFluxoCaixaItens({ from: b.inicio, to: b.fim }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os itens.",
      );
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  }

  function onSelectItem(item: FluxoItem) {
    setDetailLabel(item.descricao);
    setDetailItems([item]);
    setConfirmDate(item.data || toDateInput(new Date()));
    setDetailOpen(true);
    setDetailLoading(false);
  }

  async function confirmarPrevisao(item: FluxoItem) {
    if (item.natureza !== "previsto" || item.origem === "comissao") return;
    const key = `${item.origem}-${item.id}`;
    setConfirmingKey(key);
    try {
      if (item.origem === "titulo") {
        await baixarTitulo(item.id, {
          dataPagamento: confirmDate,
          formaPagamento: "Confirmação no fluxo",
        });
        toast.success(
          item.tipo === "entrada"
            ? "Recebimento confirmado."
            : "Pagamento confirmado.",
        );
      } else {
        await updateMovimento(item.id, {
          status: "pago",
          data: confirmDate,
        });
        toast.success("Movimento marcado como realizado.");
      }
      const remaining = detailItems.filter(
        (p) => !(p.origem === item.origem && p.id === item.id),
      );
      setDetailItems(remaining);
      await load();
      if (remaining.length === 0) setDetailOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível confirmar a previsão.",
      );
    } finally {
      setConfirmingKey(null);
    }
  }

  const tableDayItems = useMemo(() => {
    const key = toDateInput(selectedDay);
    return items.filter((i) => i.data === key);
  }, [items, selectedDay]);
  const dayPager = useTablePager(tableDayItems, toDateInput(selectedDay));
  const bucketPager = useTablePager(buckets, view);

  return (
    <div>
      <PageHeader
        title="Fluxo de caixa"
        description="Entradas e saídas realizadas e previstas. Comissão pendente entra pela data prevista, no valor bruto."
        actions={<HideFinanceValuesButton />}
      />

      <div
        className={cn(
          "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
          FILTER_BAR_SURFACE,
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(-1)}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(1)}
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-base font-semibold capitalize min-w-0">
            {rangeTitle}
          </h2>
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor="fluxo-mes"
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              Filtrar mês:
            </Label>
            <Input
              id="fluxo-mes"
              type="month"
              className="h-8 w-44 rounded-md px-2.5 pe-1 [&::-webkit-calendar-picker-indicator]:ms-0 [&::-webkit-calendar-picker-indicator]:me-0"
              value={monthInputValue(selectedDay)}
              onChange={(event) => {
                const raw = event.target.value;
                if (!raw) return;
                const [year, month] = raw.split("-").map(Number);
                if (!year || !month || month < 1 || month > 12) return;
                goToMonth(year, month - 1);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={layoutMode === "calendario" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setLayoutMode((m) => (m === "tabela" ? "calendario" : "tabela"))
            }
          >
            {layoutMode === "tabela" ? (
              <>
                <CalendarRange className="w-4 h-4 mr-1.5" />
                Ver calendário
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4 mr-1.5" />
                Ver tabela
              </>
            )}
          </Button>

          <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setView(opt.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === opt.id
                    ? "bg-primary/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Entradas realizadas"
          value={totais.entradasRealizadas}
          icon={ArrowUpRight}
          tone="blue-1"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Saídas realizadas"
          value={totais.saidasRealizadas}
          icon={ArrowDownRight}
          tone="blue-2"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="A receber neste mês"
          value={totais.entradasPrevistas}
          icon={ArrowUpRight}
          tone="blue-3"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="A pagar neste mês"
          value={totais.saidasPrevistas}
          icon={ArrowDownRight}
          tone="blue-4"
          blurValue={hideValues}
        />
      </section>

      <div className="grid gap-4 min-w-0 lg:grid-cols-2 mb-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Realizado × previsto</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading ? (
              <div className="flex h-70 items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
                Sem dados no período.
              </p>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={fluxoConfig}
                  className="aspect-auto! h-70 w-full min-w-120"
                >
                  <BarChart
                    data={chartData}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="eixo"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 11 }}
                      minTickGap={16}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => brl(Number(value))}
                        />
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="entradasRealizadas"
                      stackId="e"
                      fill="var(--color-entradasRealizadas)"
                    />
                    <Bar
                      dataKey="entradasPrevistas"
                      stackId="e"
                      fill="var(--color-entradasPrevistas)"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="saidasRealizadas"
                      stackId="s"
                      fill="var(--color-saidasRealizadas)"
                    />
                    <Bar
                      dataKey="saidasPrevistas"
                      stackId="s"
                      fill="var(--color-saidasPrevistas)"
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
            <CardTitle className="text-base">Saldo acumulado</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading || chartData.length === 0 ? (
              <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Sem dados no período."
                )}
              </p>
            ) : (
              <ResponsiveChartShell>
                <ChartContainer
                  config={fluxoConfig}
                  className="aspect-auto! h-70 w-full min-w-120"
                >
                  <AreaChart
                    data={chartData}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="eixo"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 11 }}
                      minTickGap={16}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => brl(Number(value))}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="saldoRealizado"
                      stroke="var(--color-saldoRealizado)"
                      fill="var(--color-saldoRealizado)"
                      fillOpacity={0.15}
                    />
                    <Area
                      type="monotone"
                      dataKey="saldoProjetado"
                      stroke="var(--color-saldoProjetado)"
                      fill="var(--color-saldoProjetado)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </ResponsiveChartShell>
            )}
          </CardContent>
        </Card>
      </div>

      {layoutMode === "calendario" ? (
        <FluxoCaixaBoard
          view={view}
          anchor={selectedDay}
          items={items}
          loading={loading}
          onSelectDay={(day) => {
            setSelectedDay(startOfDay(day));
            setView("dia");
            void openDayDetail(day);
          }}
          onSelectItem={onSelectItem}
        />
      ) : view === "dia" ? (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : tableDayItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Nenhum lançamento neste dia.
                  </TableCell>
                </TableRow>
              ) : (
                dayPager.pageItems.map((it) => (
                  <TableRow
                    key={`${it.origem}-${it.id}`}
                    className="cursor-pointer"
                    onClick={() => onSelectItem(it)}
                  >
                    <TableCell className="font-medium">
                      {it.descricao}
                    </TableCell>
                    <TableCell>{it.parceiro || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          it.natureza === "previsto" && "opacity-70",
                        )}
                      >
                        {it.natureza}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {FLUXO_ORIGEM_LABEL[it.origem] ?? it.origem}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-semibold",
                        it.tipo === "entrada"
                          ? "text-emerald-600"
                          : "text-destructive",
                      )}
                    >
                      {it.tipo === "entrada" ? "+" : "−"}
                      {brl(it.valor)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePager
            page={dayPager.page}
            totalPages={dayPager.totalPages}
            total={dayPager.total}
            onPageChange={dayPager.setPage}
          />
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Ent. real.</TableHead>
                <TableHead className="text-right">Ent. prev.</TableHead>
                <TableHead className="text-right">Saí. real.</TableHead>
                <TableHead className="text-right">Saí. prev.</TableHead>
                <TableHead className="text-right">Saldo proj.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    Sem dados no período.
                  </TableCell>
                </TableRow>
              ) : (
                bucketPager.pageItems.map((d) => (
                  <TableRow
                    key={d.chave}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => void openBucketDetail(d)}
                  >
                    <TableCell className="font-medium">{d.label}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {d.entradasRealizadas ? brl(d.entradasRealizadas) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600/70">
                      {d.entradasPrevistas ? brl(d.entradasPrevistas) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {d.saidasRealizadas ? brl(d.saidasRealizadas) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive/70">
                      {d.saidasPrevistas ? brl(d.saidasPrevistas) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {brl(d.saldoProjetado)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePager
            page={bucketPager.page}
            totalPages={bucketPager.totalPages}
            total={bucketPager.total}
            onPageChange={bucketPager.setPage}
          />
        </div>
      )}

      <FormDialogShell
        open={detailOpen}
        onOpenChange={setDetailOpen}
        icon={<Wallet className="w-5 h-5" />}
        title={detailLabel || "Detalhe"}
        description="Lançamentos e títulos do período"
        footer={
          <FormDialogActions>
            {detailItems.some(
              (i) => i.natureza === "previsto" && i.origem !== "comissao",
            ) ? (
              <div className="flex items-center gap-2 mr-auto">
                <Label
                  htmlFor="confirm-date"
                  className="text-xs text-muted-foreground whitespace-nowrap"
                >
                  Data da confirmação
                </Label>
                <Input
                  id="confirm-date"
                  type="date"
                  className="h-9 w-37.5"
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                />
              </div>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailOpen(false)}
            >
              Fechar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          {detailLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detailItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum item neste período.
            </p>
          ) : (
            <div className="space-y-2">
              {detailItems.map((it) => {
                const key = `${it.origem}-${it.id}`;
                const busy = confirmingKey === key;
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{it.descricao}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-1.5 mt-0.5">
                        <span>{formatDate(it.data)}</span>
                        {it.parceiro ? <span>· {it.parceiro}</span> : null}
                        <Badge variant="outline" className="text-[10px] h-4">
                          {FLUXO_ORIGEM_LABEL[it.origem] ?? it.origem}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] h-4",
                            it.natureza === "previsto" && "opacity-70",
                          )}
                        >
                          {it.natureza}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                      <div
                        className={cn(
                          "tabular-nums font-semibold",
                          it.tipo === "entrada"
                            ? "text-emerald-600"
                            : "text-destructive",
                        )}
                      >
                        {it.tipo === "entrada" ? "+" : "−"}
                        {brl(it.valor)}
                      </div>
                      {it.origem === "comissao" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/financeiro/comissao"
                            search={{ id: it.id }}
                          >
                            Abrir comissão
                          </Link>
                        </Button>
                      ) : it.natureza === "previsto" && canEditFin ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || !!confirmingKey}
                          onClick={() => void confirmarPrevisao(it)}
                        >
                          {busy ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          Confirmar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}
