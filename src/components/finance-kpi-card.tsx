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

/** Pastel do dashboard: cada indicador guarda a própria cor. */
const TONE: Record<FinanceKpiTone, { icon: string; bar: string; wash: string }> = {
  teal: {
    icon: "bg-teal-500",
    bar: "bg-teal-500",
    wash: "border-teal-100/80 bg-teal-50 dark:border-teal-900/40 dark:bg-teal-950/25",
  },
  emerald: {
    icon: "bg-emerald-500",
    bar: "bg-emerald-500",
    wash: "border-emerald-100/80 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/25",
  },
  blue: {
    icon: "bg-sky-500",
    bar: "bg-sky-500",
    wash: "border-sky-100/80 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/25",
  },
  orange: {
    icon: "bg-orange-500",
    bar: "bg-orange-500",
    wash: "border-orange-100/80 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/25",
  },
  violet: {
    icon: "bg-violet-500",
    bar: "bg-violet-500",
    wash: "border-violet-100/80 bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/25",
  },
  rose: {
    icon: "bg-rose-500",
    bar: "bg-rose-500",
    wash: "border-rose-100/80 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/25",
  },
  red: {
    icon: "bg-red-500",
    bar: "bg-red-500",
    wash: "border-red-100/80 bg-red-50 dark:border-red-900/40 dark:bg-red-950/25",
  },
  "blue-1": {
    icon: "bg-sky-400",
    bar: "bg-sky-400",
    wash: "border-sky-100/80 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/25",
  },
  "blue-2": {
    icon: "bg-cyan-500",
    bar: "bg-cyan-500",
    wash: "border-cyan-100/80 bg-cyan-50 dark:border-cyan-900/40 dark:bg-cyan-950/25",
  },
  "blue-3": {
    icon: "bg-teal-500",
    bar: "bg-teal-500",
    wash: "border-teal-100/80 bg-teal-50 dark:border-teal-900/40 dark:bg-teal-950/25",
  },
  "blue-4": {
    icon: "bg-blue-500",
    bar: "bg-blue-500",
    wash: "border-blue-100/80 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/25",
  },
  "blue-5": {
    icon: "bg-emerald-500",
    bar: "bg-emerald-500",
    wash: "border-emerald-100/80 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/25",
  },
  "blue-6": {
    icon: "bg-rose-500",
    bar: "bg-rose-500",
    wash: "border-rose-100/80 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/25",
  },
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
        "relative h-full min-w-0 flex flex-col overflow-hidden text-card-foreground",
        isDash
          ? cn(
              "rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.06)]",
              t.wash,
            )
          : "rounded-xl border border-border/60 bg-card shadow-sm",
        !isDash && wash && t.wash,
        interactive && "transition-shadow hover:shadow-md",
        active && "border-primary/50 ring-2 ring-primary/25 shadow-md",
        className,
      )}
      title={blurValue ? undefined : display}
    >
      {barOn ? (
        <div className={cn("w-full shrink-0", compact ? "h-1" : "h-1.5", t.bar)} />
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
              ? cn("size-11 rounded-full ring-4 ring-white/70", t.icon)
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
