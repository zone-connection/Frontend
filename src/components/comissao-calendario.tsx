import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  sameDay,
  startOfMonth,
  startOfWeek,
  toDateInput,
} from "@/components/agenda-board";
import { relationName } from "@/components/comissao-lancamento-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import type { Comissao } from "@/lib/financeiro-api";
import {
  brl,
  brlCompact,
  parseFinanceiroDay,
  statusBadgeClass,
  statusLabel,
} from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dayKey(iso: string | undefined) {
  return parseFinanceiroDay(iso) ? String(iso).slice(0, 10) : null;
}

function toneFor(item: Comissao, todayKey: string) {
  const key = dayKey(item.dataPrevistaRecebimento);
  if (item.status !== "paga" && key && key < todayKey) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  if (item.status === "liberada") {
    return "border-amber-200/80 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  if (item.status === "paga") {
    return "border-emerald-200/80 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  }
  return "border-sky-200/80 bg-sky-500/10 text-sky-800 dark:text-sky-200";
}

export function ComissaoCalendario({
  items,
  amountOf,
  hideValues,
  onOpen,
}: {
  items: Comissao[];
  amountOf: (item: Comissao) => number;
  hideValues: boolean;
  onOpen: (item: Comissao) => void;
}) {
  const today = new Date();
  const todayKey = toDateInput(today);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(() => today);

  const byDay = useMemo(() => {
    const map = new Map<string, Comissao[]>();
    for (const item of items) {
      const key = dayKey(item.dataPrevistaRecebimento);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const monthStart = startOfMonth(month);
  const cells = useMemo(() => {
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthStart]);

  const selectedKey = toDateInput(selected);
  const selectedItems = byDay.get(selectedKey) ?? [];

  const monthItems = useMemo(() => {
    const prefix = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
    return items.filter((item) =>
      dayKey(item.dataPrevistaRecebimento)?.startsWith(prefix),
    );
  }, [items, monthStart]);

  const aReceberMes = monthItems
    .filter((item) => item.status !== "paga")
    .reduce((sum, item) => sum + amountOf(item), 0);
  const atrasadas = monthItems.filter((item) => {
    const key = dayKey(item.dataPrevistaRecebimento);
    return item.status !== "paga" && key && key < todayKey;
  }).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className={cn(SOFT_SURFACE, "p-4 sm:p-5")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold capitalize">
              {monthStart.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              Previsto neste mês:{" "}
              <span
                className={cn(
                  "font-medium tabular-nums text-foreground",
                  hideValues && "blur-sm select-none",
                )}
              >
                {brl(aReceberMes)}
              </span>
              {atrasadas > 0 ? ` · ${atrasadas} em atraso` : null}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Mês anterior"
              onClick={() =>
                setMonth(
                  new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                const now = new Date();
                setMonth(startOfMonth(now));
                setSelected(now);
              }}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Próximo mês"
              onClick={() =>
                setMonth(
                  new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border/60">
          {cells.map((day) => {
            const inMonth = day.getMonth() === monthStart.getMonth();
            const key = toDateInput(day);
            const dayItems = byDay.get(key) ?? [];
            const total = dayItems.reduce((sum, item) => sum + amountOf(item), 0);
            const isToday = sameDay(day, today);
            const isSelected = sameDay(day, selected);
            const hasAtraso = dayItems.some((item) => {
              const k = dayKey(item.dataPrevistaRecebimento);
              return item.status !== "paga" && k && k < todayKey;
            });
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "flex min-h-[5.5rem] flex-col items-start gap-1 bg-card p-1.5 text-left sm:min-h-[6.5rem] sm:p-2",
                  !inMonth && "bg-muted/30 text-muted-foreground/50",
                  isSelected && "ring-2 ring-inset ring-primary",
                  isToday && !isSelected && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                    hasAtraso && !isToday && "font-semibold text-destructive",
                  )}
                >
                  {day.getDate()}
                </span>
                {dayItems.length > 0 ? (
                  <span
                    className={cn(
                      "w-full truncate text-[10px] font-medium tabular-nums sm:text-[11px]",
                      hideValues && "blur-[5px] select-none",
                    )}
                  >
                    {brlCompact(total)}
                  </span>
                ) : null}
                <span className="hidden w-full space-y-0.5 sm:block">
                  {dayItems.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "block truncate rounded border px-1 py-0.5 text-[10px] leading-tight",
                        toneFor(item, todayKey),
                      )}
                    >
                      {relationName(item.cliente) || "Comissão"}
                    </span>
                  ))}
                  {dayItems.length > 2 ? (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayItems.length - 2}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Cada dia mostra o previsto de recebimento. Vermelho = vencido e ainda
          não pago.
        </p>
      </div>

      <aside className={cn(SOFT_SURFACE, "p-4")}>
        <p className="text-sm font-semibold">
          {selected.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          {selectedItems.length === 0
            ? "Nenhuma comissão neste dia."
            : `${selectedItems.length} previsão(ões)`}
        </p>
        <ul className="space-y-2">
          {selectedItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="w-full rounded-xl border p-3 text-left hover:bg-muted/40"
              >
                <p className="truncate text-sm font-medium">
                  {relationName(item.cliente)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {relationName(item.empreendimento)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={statusBadgeClass(item.status)}
                  >
                    {item.status !== "paga" &&
                    (dayKey(item.dataPrevistaRecebimento) ?? "") < todayKey
                      ? "Atrasada"
                      : statusLabel(item.status)}
                  </Badge>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      hideValues && "blur-sm select-none",
                    )}
                  >
                    {brl(amountOf(item))}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function filterComissoesCalendario(
  items: Comissao[],
  opts: {
    search: string;
    recebimento: "todos" | "nao_recebidas" | "recebidas";
    equipe: string;
  },
) {
  const query = opts.search.trim().toLowerCase();
  return items.filter((item) => {
    if (opts.recebimento === "recebidas" && item.status !== "paga") return false;
    if (opts.recebimento === "nao_recebidas" && item.status === "paga")
      return false;
    if (opts.equipe !== "todos" && relationName(item.equipe) !== opts.equipe)
      return false;
    if (!query) return true;
    return [item.corretor, item.cliente, item.empreendimento, item.equipe]
      .map((value) => relationName(value, "").toLowerCase())
      .some((value) => value.includes(query));
  });
}

export type ComissaoVista = "calendario" | "tabela";
