import type { LucideIcon } from "lucide-react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const LUX = {
  gold: "#c9a227",
  goldSoft: "rgba(201,162,39,0.28)",
  text: "#f6edd4",
  muted: "#b7a882",
  panel: "border border-[#c9a227]/30 bg-[#120f0c]/90 shadow-[inset_0_1px_0_rgba(255,232,170,0.06)]",
} as const;

export function DashLuxFrame({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-3 -my-3 min-h-[calc(100dvh-5.5rem)] overflow-x-hidden bg-[#070605] px-3 py-4 text-[#f6edd4] sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 md:py-5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.22),transparent_55%)]"
        aria-hidden
      />
      <div className="relative space-y-4">{children}</div>
    </div>
  );
}

export function DashLuxPanel({
  title,
  description,
  action,
  children,
  className,
  guia,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  guia?: string;
}) {
  return (
    <section
      data-guia={guia}
      className={cn("rounded-2xl p-4 sm:p-5", LUX.panel, className)}
    >
      {title ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-[#f6edd4]">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-[#b7a882]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DashLuxLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-medium text-[#e4c56a] hover:text-[#f6edd4]"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

function sparkPoints(prev: number, curr: number) {
  const mid = (prev + curr) / 2 + (curr - prev) * 0.12;
  const vals = [prev, (prev * 2 + mid) / 3, mid, (mid + curr) / 2, curr];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  return vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * 72;
      const y = 26 - ((v - min) / span) * 22;
      return `${x},${y}`;
    })
    .join(" ");
}

function Sparkline({
  prev,
  curr,
  color,
}: {
  prev: number;
  curr: number;
  color: string;
}) {
  const points = sparkPoints(prev, curr);
  return (
    <svg viewBox="0 0 72 28" className="h-8 w-16 shrink-0 opacity-90" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function LuxDelta({
  value,
  previous,
  invert = false,
  formatPrev,
}: {
  value?: number | null;
  previous?: number;
  invert?: boolean;
  formatPrev?: (n: number) => string;
}) {
  if (value == null) return null;
  const up = value > 0;
  const down = value < 0;
  const good = invert ? down : up;
  const Icon = up || value === 0 ? TrendingUp : TrendingDown;
  const prev =
    previous != null
      ? ` · ant. ${formatPrev ? formatPrev(previous) : previous.toLocaleString("pt-BR")}`
      : "";
  return (
    <span
      className={cn(
        "mt-1 inline-flex max-w-full flex-wrap items-center gap-0.5 text-[10px] font-medium leading-snug",
        good && "text-emerald-400",
        invert ? up && "text-rose-400" : down && "text-rose-400",
        value === 0 && "text-[#8f8264]",
      )}
    >
      <Icon className="size-3 shrink-0" />
      vs mês ant. {value > 0 ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%{prev}
    </span>
  );
}

const ICON_BG: Record<string, string> = {
  emerald: "#22c55e",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  teal: "#14b8a6",
  orange: "#f97316",
  rose: "#f43f5e",
  red: "#ef4444",
};

export function DashLuxKpi({
  label,
  value,
  icon: Icon,
  tone,
  evolucaoPct,
  valorMesAnterior,
  invertEvolucao,
  format = "number",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof ICON_BG;
  evolucaoPct?: number | null;
  valorMesAnterior?: number;
  invertEvolucao?: boolean;
  format?: "number" | "money" | "percent";
}) {
  const display =
    format === "money"
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : format === "percent"
        ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        : value.toLocaleString("pt-BR");
  const color = ICON_BG[tone];
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[#c9a227]/20 bg-[#16130f] px-3.5 py-3.5">
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_0_16px_rgba(0,0,0,0.35)]"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-[#c4b896]">{label}</p>
          <p className="truncate text-xl font-semibold tabular-nums text-white sm:text-2xl">
            {display}
          </p>
          {evolucaoPct !== undefined ? (
            <LuxDelta
              value={evolucaoPct}
              previous={valorMesAnterior}
              invert={invertEvolucao}
              formatPrev={
                format === "money"
                  ? (n) =>
                      n.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      })
                  : format === "percent"
                    ? (n) => `${n.toLocaleString("pt-BR")}%`
                    : undefined
              }
            />
          ) : null}
        </div>
        {evolucaoPct !== undefined ? (
          <Sparkline
            prev={valorMesAnterior ?? value}
            curr={value}
            color={color}
          />
        ) : null}
      </div>
    </div>
  );
}

const BAR_COLORS = ["#e8c547", "#f59e0b", "#d4a017", "#a16207"];

export function DashLuxRank({
  items,
}: {
  items: Array<{ id: string; nome: string; valor: number }>;
}) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  const total = items.reduce((s, i) => s + i.valor, 0) || 1;
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const pct = Math.round((item.valor / total) * 1000) / 10;
        const width = Math.max(8, (item.valor / max) * 100);
        return (
          <div key={item.id} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2 text-xs">
            <p className="truncate text-[#f6edd4]">
              <span className="mr-1.5 text-[#8f8264]">{index + 1}.</span>
              {item.nome}
            </p>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#2a2418]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                }}
              />
            </div>
            <span className="tabular-nums text-[#c4b896]">
              {item.valor.toLocaleString("pt-BR")}
              {pct >= 10 ? `  ${pct}%` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const EQUIPE_COLORS = ["#22c55e", "#8b5cf6", "#38bdf8", "#f59e0b", "#f43f5e"];

export function DashLuxDonut({
  items,
  centerLabel,
}: {
  items: Array<{ nome: string; valor: number }>;
  centerLabel: string;
}) {
  const total = items.reduce((s, i) => s + i.valor, 0);
  const r = 34;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#2a2418"
            strokeWidth="12"
          />
          {total > 0
            ? items.map((item, index) => {
                const len = (item.valor / total) * circ;
                const node = (
                  <circle
                    key={item.nome}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    strokeWidth="12"
                    stroke={EQUIPE_COLORS[index % EQUIPE_COLORS.length]}
                    strokeDasharray={`${len} ${circ - len}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += len;
                return node;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-[#8f8264]">{centerLabel}</span>
          <span className="text-lg font-semibold tabular-nums text-white">
            {total}
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {items.map((item, index) => {
          const pct = total ? Math.round((item.valor / total) * 1000) / 10 : 0;
          return (
            <li key={item.nome} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 truncate text-[#c4b896]">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: EQUIPE_COLORS[index % EQUIPE_COLORS.length] }}
                />
                {item.nome}
              </span>
              <span className="tabular-nums text-[#f6edd4]">
                {item.valor} · ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DashLuxPipeline({
  aprovadas,
  reprovadas,
  emAnalise,
}: {
  aprovadas: number;
  reprovadas: number;
  emAnalise: number;
}) {
  const total = aprovadas + reprovadas + emAnalise;
  const rows = [
    { label: "Aprovadas", value: aprovadas, color: "#22c55e" },
    { label: "Reprovadas", value: reprovadas, color: "#f43f5e" },
    { label: "Em análise", value: emAnalise, color: "#e8c547" },
  ];
  const r = 36;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#2a2418" strokeWidth="11" />
          {total > 0
            ? rows.map((row) => {
                const len = (row.value / total) * circ;
                const node = (
                  <circle
                    key={row.label}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    strokeWidth="11"
                    stroke={row.color}
                    strokeDasharray={`${Math.max(len, row.value ? 4 : 0)} ${circ}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += len;
                return node;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-white">
            {emAnalise}
          </span>
          <span className="text-[10px] text-[#8f8264]">pendentes</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3">
        {rows.map((row) => {
          const pct = total ? Math.round((row.value / total) * 1000) / 10 : 0;
          return (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="flex items-center gap-2 text-[#c4b896]">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  {row.label}
                </span>
                <span className="tabular-nums text-[#f6edd4]">
                  {row.value} · {pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#2a2418]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(row.value ? 6 : 0, pct)}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const luxSelectTrigger =
  "h-9 border-[#c9a227]/35 bg-[#16130f] text-[#f6edd4] hover:bg-[#1c1812]";
export const luxLabel = "text-[11px] text-[#b7a882]";
