import type { ReactNode } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { catalogColorToChartHex } from "@/lib/catalog-colors";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

const chartConfig = {
  total: { label: "Volume", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export type FunnelBarRow = {
  etapa: string;
  total: number;
  fill?: string;
};

type EtapaCount = {
  funilEtapaId: string;
  label: string;
  total: number;
  color?: string | null;
};

type FunilEtapas = {
  etapas: Array<{
    id: string;
    label: string;
    color?: string | null;
    sortOrder: number;
    active: boolean;
  }>;
};

/** Junta as etapas do funil ativo com o volume, inclusive zeradas. */
export function funnelBarsFromFunil(
  funil: FunilEtapas | null | undefined,
  porEtapa: EtapaCount[],
): FunnelBarRow[] {
  const counts = new Map(
    porEtapa.map((row) => [row.funilEtapaId, row.total]),
  );
  const etapas = (funil?.etapas ?? [])
    .filter((etapa) => etapa.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (etapas.length > 0) {
    return etapas.map((etapa) => ({
      etapa: etapa.label,
      total: counts.get(etapa.id) ?? 0,
      fill: catalogColorToChartHex(etapa.color),
    }));
  }
  return porEtapa.map((row) => ({
    etapa: row.label,
    total: row.total,
    fill: catalogColorToChartHex(row.color),
  }));
}

export function FunnelBarChart({
  data,
  emptyLabel = "Nenhum item no funil.",
}: {
  data: FunnelBarRow[];
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }
  const height = Math.max(260, data.length * 44);
  return (
    <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
      <ChartContainer
        config={chartConfig}
        className={cn("aspect-auto! w-full min-w-120")}
        style={{ height }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 40, top: 8, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} vertical={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            hide
            domain={[
              0,
              (dataMax: number) => Math.max(Math.ceil(dataMax * 1.18), 1),
            ]}
          />
          <YAxis
            dataKey="etapa"
            type="category"
            width={148}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="total" radius={[0, 10, 10, 0]} minPointSize={8} barSize={18}>
            {data.map((entry, index) => (
              <Cell
                key={`${entry.etapa}-${index}`}
                fill={entry.fill ?? "hsl(var(--primary))"}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              className="fill-foreground"
              offset={8}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function OverviewFunnelPanel({
  title,
  description,
  action,
  data,
  emptyLabel,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  data: FunnelBarRow[];
  emptyLabel: string;
}) {
  return (
    <section className={SOFT_SURFACE}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-1 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-3 sm:p-4">
        <FunnelBarChart data={data} emptyLabel={emptyLabel} />
      </div>
    </section>
  );
}
