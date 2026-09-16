import type { ReactNode } from "react";
import { CheckCircle2, FileText, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const BAR_COLORS = ["#0ea5e9", "#14b8a6", "#8b5cf6", "#f59e0b"];
const EQUIPE_COLORS = ["#22c55e", "#8b5cf6", "#0ea5e9", "#f59e0b", "#f43f5e"];

export function DashRankBars({
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
          <div
            key={item.id}
            className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-2 text-xs"
          >
            <p className="truncate text-foreground">
              <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
              {item.nome}
            </p>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                }}
              />
            </div>
            <span className="tabular-nums text-muted-foreground">
              {item.valor.toLocaleString("pt-BR")}
              {pct >= 10 ? `  ${pct}%` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DashShareDonut({
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
            className="stroke-muted"
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
          <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
          <span className="text-lg font-semibold tabular-nums">{total}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {items.map((item, index) => {
          const pct = total ? Math.round((item.valor / total) * 1000) / 10 : 0;
          return (
            <li
              key={item.nome}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: EQUIPE_COLORS[index % EQUIPE_COLORS.length],
                  }}
                />
                {item.nome}
              </span>
              <span className="tabular-nums text-foreground">
                {item.valor} · ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DashPipelineDonut({
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
    { label: "Em análise", value: emAnalise, color: "#eab308" },
  ];
  const r = 36;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className="stroke-muted"
            strokeWidth="11"
          />
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
          <span className="text-2xl font-semibold tabular-nums">{emAnalise}</span>
          <span className="text-[10px] text-muted-foreground">pendentes</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3">
        {rows.map((row) => {
          const pct = total ? Math.round((row.value / total) * 1000) / 10 : 0;
          return (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  {row.label}
                </span>
                <span className="tabular-nums text-foreground">
                  {row.value} · {pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(row.value ? 6 : 0, pct)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DashDocResumo({
  aprovadas,
  vendas,
  vgv,
  extra,
}: {
  aprovadas: number;
  vendas: number;
  vgv: number;
  extra?: ReactNode;
}) {
  const rows = [
    {
      label: "Aprovações",
      value: aprovadas.toLocaleString("pt-BR"),
      icon: FileText,
      tone: "bg-sky-500/12 text-sky-600",
    },
    {
      label: "Viraram venda",
      value: vendas.toLocaleString("pt-BR"),
      icon: CheckCircle2,
      tone: "bg-emerald-500/12 text-emerald-600",
    },
    {
      label: "VGV do mês",
      value: money(vgv),
      icon: Wallet,
      tone: "bg-teal-500/12 text-teal-600",
    },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                row.tone,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{row.label}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{row.value}</span>
          </div>
        );
      })}
      {extra}
    </div>
  );
}
