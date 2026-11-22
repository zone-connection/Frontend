import { useMemo } from "react";
import {
  addDays,
  sameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateInput,
  type AgendaViewMode,
} from "@/components/agenda-board";
import { brl, type FluxoItem } from "@/lib/financeiro-mock";
import { cn } from "@/lib/utils";

export type FluxoViewMode = AgendaViewMode;

const HOUR_START = 7;
const HOUR_END = 23;
const PX_PER_HOUR = 56;
const SLOT_MIN = 45;

function hoursList() {
  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h += 1) hours.push(h);
  return hours;
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function itemBlockClass(item: FluxoItem) {
  const previsto = item.natureza === "previsto";
  if (item.tipo === "entrada") {
    return previsto
      ? "border-sky-500/70 bg-sky-500/15 text-sky-800 dark:text-sky-200 border-dashed"
      : "border-emerald-700/60 bg-emerald-600 text-white";
  }
  return previsto
    ? "border-amber-500/80 bg-amber-400/25 text-amber-900 dark:text-amber-100 border-dashed"
    : "border-rose-700/60 bg-rose-600 text-white";
}

type BoardProps = {
  view: FluxoViewMode;
  anchor: Date;
  items: FluxoItem[];
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  onSelectItem: (item: FluxoItem) => void;
};

export function FluxoCaixaBoard({
  view,
  anchor,
  items,
  loading,
  onSelectDay,
  onSelectItem,
}: BoardProps) {
  if (view === "mes") {
    return (
      <MonthBoard
        anchor={anchor}
        items={items}
        loading={loading}
        onSelectDay={onSelectDay}
        onSelectItem={onSelectItem}
      />
    );
  }

  const days =
    view === "dia"
      ? [startOfDay(anchor)]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));

  return (
    <TimeGridBoard
      days={days}
      items={items}
      loading={loading}
      onSelectItem={onSelectItem}
    />
  );
}

function TimeGridBoard({
  days,
  items,
  loading,
  onSelectItem,
}: {
  days: Date[];
  items: FluxoItem[];
  loading?: boolean;
  onSelectItem: (item: FluxoItem) => void;
}) {
  const hours = hoursList();
  const gridHeight = (HOUR_END - HOUR_START + 1) * PX_PER_HOUR;
  const today = startOfDay(new Date());
  const now = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, FluxoItem[]>();
    for (const day of days) map.set(toDateInput(day), []);
    for (const item of items) {
      const list = map.get(item.data);
      if (list) list.push(item);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.natureza !== b.natureza)
          return a.natureza === "realizado" ? -1 : 1;
        return a.descricao.localeCompare(b.descricao, "pt-BR");
      });
    }
    return map;
  }, [days, items]);

  const showNowLine = days.some((d) => sameDay(d, today));
  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60) *
    PX_PER_HOUR;

  return (
    <div className="relative overflow-auto rounded-xl border bg-card">
      {loading ? (
        <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Cores</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-600/70" />
          Entrada realizada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-emerald-500 bg-emerald-500/20" />
          Entrada prevista
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-red-600/70" />
          Saída realizada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-red-500 bg-red-500/20" />
          Saída prevista
        </span>
      </div>

      <div
        className="grid min-w-160"
        style={{
          gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="sticky top-0 z-10 border-b bg-card" />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          return (
            <div
              key={toDateInput(day)}
              className={cn(
                "sticky top-0 z-10 border-b border-l bg-card px-2 py-2 text-center",
                isToday && "bg-primary/5",
              )}
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {day.toLocaleDateString("pt-BR", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}

        <div className="relative border-r" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
              style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
            >
              {formatHour(h)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = toDateInput(day);
          const dayItems = byDay.get(key) ?? [];
          const isToday = sameDay(day, today);

          return (
            <div
              key={key}
              className={cn("relative border-l", isToday && "bg-primary/3")}
              style={{ height: gridHeight }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{
                    top: (h - HOUR_START) * PX_PER_HOUR,
                    height: PX_PER_HOUR,
                  }}
                />
              ))}

              {isToday && showNowLine && nowTop >= 0 && nowTop <= gridHeight ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-5 border-t-2 border-red-500"
                  style={{ top: nowTop }}
                >
                  <span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-red-500" />
                </div>
              ) : null}

              {dayItems.map((item, index) => {
                const topMin = 30 + index * SLOT_MIN;
                const maxMin = (HOUR_END - HOUR_START + 1) * 60 - 20;
                const clamped = Math.min(topMin, maxMin);
                const top = (clamped / 60) * PX_PER_HOUR;
                const height = Math.max((SLOT_MIN / 60) * PX_PER_HOUR - 4, 28);
                const sign = item.tipo === "entrada" ? "+" : "−";

                return (
                  <button
                    key={`${item.origem}-${item.id}`}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className={cn(
                      "absolute left-1 right-1 z-6 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition hover:brightness-110",
                      itemBlockClass(item),
                    )}
                    style={{ top, height }}
                    title={`${item.descricao} · ${sign}${brl(item.valor)} · ${item.natureza}${
                      item.contrato ? " · Contrato" : ""
                    }`}
                  >
                    <div className="truncate text-[11px] font-semibold leading-tight">
                      {sign}
                      {brl(item.valor)}
                    </div>
                    <div className="truncate text-[10px] opacity-90">
                      {item.descricao}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthBoard({
  anchor,
  items,
  loading,
  onSelectDay,
  onSelectItem,
}: {
  anchor: Date;
  items: FluxoItem[];
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  onSelectItem: (item: FluxoItem) => void;
}) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const byDay = useMemo(() => {
    const map = new Map<string, FluxoItem[]>();
    for (const item of items) {
      const list = map.get(item.data) ?? [];
      list.push(item);
      map.set(item.data, list);
    }
    return map;
  }, [items]);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      {loading ? (
        <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Cores</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-600" />
          Entrada concretizada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-sky-500 bg-sky-500/30" />
          Entrada prevista
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-600" />
          Saída concretizada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-amber-500 bg-amber-400/40" />
          Saída prevista
        </span>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekdays.map((w) => (
          <div
            key={w}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
        {cells.map((day) => {
          const key = toDateInput(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = sameDay(day, today);
          const dayItems = byDay.get(key) ?? [];
          const shown = dayItems.slice(0, 3);
          const extra = dayItems.length - shown.length;

          return (
            <div
              key={key}
              className={cn(
                "border-t border-l p-1.5 min-h-27.5 flex flex-col gap-1",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-primary/4",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-muted",
                  isToday &&
                    "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {day.getDate()}
              </button>

              <div className="flex flex-col gap-0.5 min-h-0">
                {shown.map((item) => {
                  const sign = item.tipo === "entrada" ? "+" : "−";
                  return (
                    <button
                      key={`${item.origem}-${item.id}`}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight border",
                        itemBlockClass(item),
                      )}
                      title={`${item.descricao} · ${sign}${brl(item.valor)} · ${
                        item.natureza === "previsto" ? "Previsto" : "Concretizado"
                      }${item.contrato ? " · Contrato" : ""}`}
                    >
                      {sign}
                      {brl(item.valor)} {item.descricao}
                      {item.contrato ? " · Contrato" : ""}
                    </button>
                  );
                })}
                {extra > 0 ? (
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground text-left px-1"
                    onClick={() => onSelectDay(day)}
                  >
                    +{extra} mais
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
