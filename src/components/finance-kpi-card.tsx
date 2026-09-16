import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceKpiTone =
  | "teal"
  | "emerald"
  | "orange"
  | "red"
  | "blue"
  | "violet"
  | "rose"
  /** Escala progressiva de azul (claro → escuro). */
  | "blue-1"
  | "blue-2"
  | "blue-3"
  | "blue-4"
  | "blue-5"
  | "blue-6";

const TONE: Record<FinanceKpiTone, { bar: string; icon: string }> = {
  teal: { bar: "bg-teal-600", icon: "bg-teal-600" },
  emerald: { bar: "bg-cyan-600", icon: "bg-cyan-600" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-500" },
  red: { bar: "bg-red-600", icon: "bg-red-600" },
  blue: { bar: "bg-blue-600", icon: "bg-blue-600" },
  violet: { bar: "bg-violet-600", icon: "bg-violet-600" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-500" },
  "blue-1": { bar: "bg-[var(--kpi-seq-1,#5BC4E8)]", icon: "bg-[var(--kpi-seq-1,#5BC4E8)]" },
  "blue-2": { bar: "bg-[var(--kpi-seq-2,#079ED4)]", icon: "bg-[var(--kpi-seq-2,#079ED4)]" },
  "blue-3": { bar: "bg-[var(--kpi-seq-3,#0689BD)]", icon: "bg-[var(--kpi-seq-3,#0689BD)]" },
  "blue-4": { bar: "bg-[var(--kpi-seq-4,#057AA8)]", icon: "bg-[var(--kpi-seq-4,#057AA8)]" },
  "blue-5": { bar: "bg-[var(--kpi-seq-5,#04648A)]", icon: "bg-[var(--kpi-seq-5,#04648A)]" },
  "blue-6": { bar: "bg-[var(--kpi-seq-6,#034E6E)]", icon: "bg-[var(--kpi-seq-6,#034E6E)]" },
};

/** Ícone circular do dashboard (referência de cards soltos). */
const DASH_ICON: Record<FinanceKpiTone, string> = {
  teal: "bg-teal-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  "blue-1": "bg-[var(--kpi-seq-1,#5BC4E8)]",
  "blue-2": "bg-[var(--kpi-seq-2,#079ED4)]",
  "blue-3": "bg-[var(--kpi-seq-3,#0689BD)]",
  "blue-4": "bg-[var(--kpi-seq-4,#057AA8)]",
  "blue-5": "bg-[var(--kpi-seq-5,#04648A)]",
  "blue-6": "bg-[var(--kpi-seq-6,#034E6E)]",
};

const DASH_WASH: Record<FinanceKpiTone, string> = {
  teal: "bg-teal-50 border-teal-100/80 dark:bg-teal-950/25 dark:border-teal-900/40",
  emerald: "bg-emerald-50 border-emerald-100/80 dark:bg-emerald-950/25 dark:border-emerald-900/40",
  orange: "bg-orange-50 border-orange-100/80 dark:bg-orange-950/25 dark:border-orange-900/40",
  red: "bg-rose-50 border-rose-100/80 dark:bg-rose-950/25 dark:border-rose-900/40",
  blue: "bg-sky-50 border-sky-100/80 dark:bg-sky-950/25 dark:border-sky-900/40",
  violet: "bg-violet-50 border-violet-100/80 dark:bg-violet-950/25 dark:border-violet-900/40",
  rose: "bg-rose-50 border-rose-100/80 dark:bg-rose-950/25 dark:border-rose-900/40",
  "blue-1": "bg-sky-50 border-sky-100/80",
  "blue-2": "bg-sky-50 border-sky-100/80",
  "blue-3": "bg-sky-50 border-sky-100/80",
  "blue-4": "bg-sky-50 border-sky-100/80",
  "blue-5": "bg-sky-50 border-sky-100/80",
  "blue-6": "bg-sky-50 border-sky-100/80",
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EvolucaoBadge({
  value,
  previous,
  className,
  invert = false,
}: {
  value: number | null | undefined;
  /** Valor absoluto do mês anterior (para contexto). */
  previous?: number;
  className?: string;
  /** Se true, alta é ruim (ex.: leads perdidos). */
  invert?: boolean;
}) {
  if (value == null) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full flex-wrap items-center gap-0.5 text-[11px] text-muted-foreground leading-snug",
          className,
        )}
      >
        vs mês ant. 0
        {previous != null
          ? ` · ant. ${previous.toLocaleString("pt-BR")}`
          : ""}
      </span>
    );
  }
  const up = value > 0;
  const down = value < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const Icon = up || value === 0 ? TrendingUp : TrendingDown;
  const prevLabel =
    previous != null ? ` · ant. ${previous.toLocaleString("pt-BR")}` : "";
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-0.5 text-[11px] font-semibold tabular-nums leading-snug",
        good && "text-emerald-600 dark:text-emerald-400",
        bad && "text-rose-600 dark:text-rose-400",
        value === 0 && "text-muted-foreground",
        className,
      )}
      title="Variação em relação ao mês calendário anterior (não é perda dos leads atuais)"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="min-w-0 wrap-break-word">
        vs mês ant. {value > 0 ? "+" : ""}
        {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
        {prevLabel}
      </span>
    </span>
  );
}

export function FinanceKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  href,
  onClick,
  active = false,
  className,
  format = "money",
  evolucaoPct,
  valorMesAnterior,
  invertEvolucao = false,
  suffix,
  compact = false,
  showBar = true,
  variant = "dash",
  wash = false,
  valueLabel,
  search,
  detail,
  blurValue = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: FinanceKpiTone;
  href?: string;
  search?: Record<string, string | undefined>;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  format?: "money" | "number" | "percent";
  evolucaoPct?: number | null;
  valorMesAnterior?: number;
  invertEvolucao?: boolean;
  suffix?: string;
  compact?: boolean;
  showBar?: boolean;
  /** Card branco do dashboard: ícone redondo, sem faixa superior. */
  variant?: "default" | "dash";
  /** Fundo leve na cor do tom (pipeline de documentação). */
  wash?: boolean;
  /** Substitui o valor formatado (ex.: "1h 20min"). */
  valueLabel?: string;
  detail?: string;
  /** Borra o valor para privacidade (olhar por cima). */
  blurValue?: boolean;
}) {
  const t = TONE[tone];
  const isDash = variant === "dash";
  const barOn = isDash ? false : showBar;
  const display =
    valueLabel ??
    (format === "number"
      ? value.toLocaleString("pt-BR")
      : format === "percent"
        ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        : money(value));

  const len = display.length;
  const valueSize = isDash
    ? len > 18
      ? "text-sm leading-tight sm:text-base"
      : len > 14
        ? "text-base leading-tight sm:text-lg"
        : "text-xl leading-tight sm:text-2xl"
    : compact
      ? len > 14
        ? "text-sm leading-snug"
        : "text-base leading-tight"
      : len > 18
        ? "text-sm leading-snug"
        : len > 14
          ? "text-base leading-snug"
          : "text-xl leading-tight";

  const interactive = Boolean(href || onClick);

  const card = (
    <div
      className={cn(
        "h-full min-w-0 flex flex-col overflow-hidden text-card-foreground",
        isDash
          ? cn(
              "rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.06)]",
              DASH_WASH[tone],
            )
          : "rounded-xl border border-border/60 bg-card shadow-sm",
        !isDash && wash && DASH_WASH[tone],
        interactive && "transition-shadow hover:shadow-md",
        active && "border-primary/50 ring-2 ring-primary/25 shadow-md",
        className,
      )}
      title={blurValue ? undefined : display}
    >
      {barOn ? (
        <div
          className={cn("w-full shrink-0", compact ? "h-1" : "h-1.5", t.bar)}
        />
      ) : null}
      <div
        className={cn(
          "flex min-w-0",
          isDash
            ? "flex-1 items-center gap-3 p-4"
            : compact
              ? "flex-1 items-center gap-2 p-2.5 min-h-0"
              : "flex-1 items-center gap-2.5 sm:gap-3 p-3 sm:p-4 min-h-21 sm:min-h-23",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center shrink-0 text-white shadow-sm",
            isDash
              ? cn("size-11 rounded-full ring-4 ring-white/70", DASH_ICON[tone])
              : cn(
                  "rounded-md",
                  compact ? "w-8 h-8" : "w-8 h-8 sm:w-12 sm:h-12 sm:rounded-lg",
                  t.icon,
                ),
          )}
        >
          <Icon
            className={cn(
              isDash
                ? "h-5 w-5"
                : compact
                  ? "w-4 h-4"
                  : "w-4 h-4 sm:w-5 sm:h-5",
            )}
          />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center">
          <div
            className={cn(
              "text-muted-foreground leading-snug truncate",
              isDash ? "text-xs font-medium" : "text-[11px] sm:text-xs",
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              "font-bold tracking-tight tabular-nums mt-0.5 text-foreground whitespace-nowrap",
              valueSize,
              blurValue && "select-none blur-[8px]",
            )}
          >
            {display}
            {suffix ? (
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                {suffix}
              </span>
            ) : null}
          </div>
          {evolucaoPct !== undefined ? (
            <EvolucaoBadge
              value={evolucaoPct}
              previous={valorMesAnterior}
              invert={invertEvolucao}
              className={cn("mt-1", blurValue && "select-none blur-[8px]")}
            />
          ) : isDash || compact ? null : (
            <span className="mt-1 block h-4.5" aria-hidden />
          )}
          {detail ? (
            <p
              className={cn(
                "mt-1 text-[11px] leading-snug text-muted-foreground",
                blurValue && "select-none blur-[8px]",
              )}
            >
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        {...(search ? { search: search as never } : {})}
        className="block h-full min-w-0"
      >
        {card}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full min-w-0 w-full text-left cursor-pointer"
        aria-pressed={active}
      >
        {card}
      </button>
    );
  }

  return card;
}
