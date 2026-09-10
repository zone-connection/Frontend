import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  AGENDAMENTO_ORIGEM_LABEL,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPO_BLOCK,
  AGENDAMENTO_TIPO_CARD,
  AGENDAMENTO_TIPO_WELL,
  AGENDAMENTO_VISUAL_LABEL,
  getAgendamentoCardSubtitle,
  getAgendamentoCardTitle,
  getAgendamentoOrigem,
  getAgendamentoVisual,
  isAgendamentoAniversario,
  isAgendamentoBloqueio,
  type Agendamento,
} from "@/lib/agenda-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Cake, CalendarDays, Plus, type LucideIcon } from "lucide-react";
import { AGENDAMENTO_TIPO_ICON } from "@/components/agenda-tipo-option";

export type AgendaViewMode = "dia" | "semana" | "mes";

const HOUR_START = 7;
const HOUR_END = 23;
const PX_PER_HOUR_WEEK = 56;
const PX_PER_HOUR_DAY = 76;
const DEFAULT_DURATION_MIN = 60;

function eventIcon(item: Agendamento): LucideIcon {
  if (isAgendamentoAniversario(item)) return Cake;
  return AGENDAMENTO_TIPO_ICON[item.tipo] ?? CalendarDays;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Semana começando na segunda (pt-BR). */
export function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff),
  );
}

export function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  return endOfDay(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6),
  );
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getVisibleRange(view: AgendaViewMode, anchor: Date) {
  if (view === "dia") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === "semana") {
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }
  return {
    from: startOfWeek(startOfMonth(anchor)),
    to: endOfWeek(endOfMonth(anchor)),
  };
}

export function formatRangeLabel(view: AgendaViewMode, anchor: Date) {
  if (view === "dia") {
    return anchor.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "semana") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    const sameMonth = from.getMonth() === to.getMonth();
    if (sameMonth) {
      return `${from.getDate()} – ${to.getDate()} de ${to.toLocaleDateString(
        "pt-BR",
        {
          month: "long",
          year: "numeric",
        },
      )}`;
    }
    return `${from.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${to.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    )}`;
  }
  return anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function hoursList() {
  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h += 1) hours.push(h);
  return hours;
}

function eventBounds(item: Agendamento) {
  const start = new Date(item.startsAt);
  const end = item.endsAt
    ? new Date(item.endsAt)
    : new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  return { start, end };
}

function minutesFromGridStart(d: Date) {
  return d.getHours() * 60 + d.getMinutes() - HOUR_START * 60;
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatEventTime(item: Agendamento) {
  const { start, end } = eventBounds(item);
  const a = start.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const b = end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${a} – ${b}`;
}

type BoardProps = {
  view: AgendaViewMode;
  anchor: Date;
  items: Agendamento[];
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
};

export function AgendaBoard({
  view,
  anchor,
  items,
  loading,
  onSelectDay,
  onCreateAt,
  onEdit,
}: BoardProps) {
  if (view === "mes") {
    return (
      <MonthBoard
        anchor={anchor}
        items={items}
        loading={loading}
        onSelectDay={onSelectDay}
        onCreateAt={onCreateAt}
        onEdit={onEdit}
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
      onCreateAt={onCreateAt}
      onEdit={onEdit}
    />
  );
}

function TimeGridBoard({
  days,
  items,
  loading,
  onCreateAt,
  onEdit,
}: {
  days: Date[];
  items: Agendamento[];
  loading?: boolean;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
}) {
  const hours = hoursList();
  const isDayView = days.length === 1;
  const pxPerHour = isDayView ? PX_PER_HOUR_DAY : PX_PER_HOUR_WEEK;
  const gridHeight = (HOUR_END - HOUR_START + 1) * pxPerHour;
  const today = startOfDay(new Date());
  const now = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    for (const day of days) map.set(toDateInput(day), []);
    for (const item of items) {
      if (item.status === "cancelado") continue;
      const key = toDateInput(new Date(item.startsAt));
      const list = map.get(key);
      if (list) list.push(item);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return map;
  }, [days, items]);

  const showNowLine = days.some((d) => sameDay(d, today));
  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60) *
    pxPerHour;

  return (
    <div className="relative overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-3xl border bg-card shadow-sm">
      {loading ? (
        <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : null}

      <div
        className={cn("grid", days.length > 1 ? "min-w-220" : "min-w-0")}
        style={{
          gridTemplateColumns: `${isDayView ? 72 : 56}px repeat(${days.length}, minmax(9rem, 1fr))`,
        }}
      >
        <div className="sticky top-0 z-10 border-b bg-gradient-to-b from-primary/8 to-card" />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          return (
            <div
              key={toDateInput(day)}
              className={cn(
                "sticky top-0 z-10 border-b border-l bg-gradient-to-b to-card px-2 py-2.5 text-center",
                isToday ? "from-primary/18" : "from-primary/8",
              )}
            >
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                  isToday && "text-primary",
                )}
              >
                {day.toLocaleDateString("pt-BR", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  isToday
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "hover:bg-muted",
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
              className={cn(
                "absolute right-2 -translate-y-1/2 tabular-nums text-muted-foreground",
                isDayView ? "text-xs font-medium" : "text-[11px]",
              )}
              style={{ top: (h - HOUR_START) * pxPerHour }}
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
                <button
                  key={h}
                  type="button"
                  className={cn(
                    "group/slot absolute inset-x-0 border-t border-border/50 transition-colors hover:bg-primary/8",
                    h % 2 === 0 && "bg-muted/20",
                  )}
                  style={{
                    top: (h - HOUR_START) * pxPerHour,
                    height: pxPerHour,
                  }}
                  aria-label={`Agendar ${key} às ${formatHour(h)}`}
                  onClick={() => {
                    const bloqueio = dayItems.find((item) => {
                      if (
                        !isAgendamentoBloqueio(item) ||
                        item.status === "cancelado"
                      ) {
                        return false;
                      }
                      const bStart = new Date(item.startsAt);
                      const bEnd = item.endsAt ? new Date(item.endsAt) : bStart;
                      const slotStart = new Date(day);
                      slotStart.setHours(h, 0, 0, 0);
                      const slotEnd = new Date(day);
                      slotEnd.setHours(h + 1, 0, 0, 0);
                      return slotStart < bEnd && slotEnd > bStart;
                    });
                    if (bloqueio) {
                      toast.message("Horário bloqueado", {
                        description: bloqueio.titulo,
                      });
                      onEdit(bloqueio);
                      return;
                    }
                    onCreateAt(day, h);
                  }}
                >
                  {isDayView ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-primary opacity-0 transition group-hover/slot:opacity-100">
                      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary/10 px-2 py-0.5">
                        <Plus className="h-3.5 w-3.5" />
                        Agendar
                      </span>
                    </span>
                  ) : (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary opacity-0 transition group-hover/slot:opacity-70">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              ))}

              {isToday && showNowLine && nowTop >= 0 && nowTop <= gridHeight ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-5 border-t-2 border-red-500"
                  style={{ top: nowTop }}
                >
                  <span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-red-500" />
                </div>
              ) : null}

              {dayItems.map((item) => {
                const { start, end } = eventBounds(item);
                let topMin = minutesFromGridStart(start);
                let endMin = minutesFromGridStart(end);
                if (endMin <= topMin) endMin = topMin + DEFAULT_DURATION_MIN;
                // Clamp to visible grid
                topMin = Math.max(
                  0,
                  Math.min(topMin, (HOUR_END - HOUR_START + 1) * 60 - 15),
                );
                endMin = Math.max(
                  topMin + 20,
                  Math.min(endMin, (HOUR_END - HOUR_START + 1) * 60),
                );

                const top = (topMin / 60) * pxPerHour;
                const height = ((endMin - topMin) / 60) * pxPerHour;
                const origem = getAgendamentoOrigem(item);
                const visual = getAgendamentoVisual(item);
                const Icon = eventIcon(item);
                const cardHeight = Math.max(height, isDayView ? 44 : 22);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className={cn(
                      "absolute z-6 overflow-hidden text-left transition",
                      isDayView
                        ? cn(
                            "left-2 right-3 rounded-xl border border-l-[3px] px-3 py-2 shadow-sm hover:shadow-md",
                            AGENDAMENTO_TIPO_CARD[visual],
                          )
                        : cn(
                            "left-1 right-1 rounded-md border px-1.5 py-1 shadow-sm hover:brightness-110",
                            AGENDAMENTO_TIPO_BLOCK[visual],
                          ),
                      item.status === "concluido" && "opacity-80",
                      item.status === "cancelado" && "opacity-50 grayscale",
                    )}
                    style={{ top, height: cardHeight }}
                    title={`${AGENDAMENTO_VISUAL_LABEL[visual]} · ${AGENDAMENTO_ORIGEM_LABEL[origem]} · ${getAgendamentoCardTitle(item)}${
                      getAgendamentoCardSubtitle(item)
                        ? ` · ${getAgendamentoCardSubtitle(item)}`
                        : ""
                    }`}
                  >
                    {isDayView ? (
                      <div className="flex items-start gap-2">
                        {cardHeight > 48 ? (
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm",
                              AGENDAMENTO_TIPO_WELL[visual],
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold leading-tight">
                            {getAgendamentoCardTitle(item)}
                          </div>
                          {cardHeight > 40 ? (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {formatEventTime(item)}
                              {getAgendamentoCardSubtitle(item)
                                ? ` · ${getAgendamentoCardSubtitle(item)}`
                                : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="truncate text-[11px] font-semibold leading-tight">
                          {getAgendamentoCardTitle(item)}
                        </div>
                        {height > 36 ? (
                          <div className="truncate text-[10px] opacity-90">
                            {formatEventTime(item)}
                            {getAgendamentoCardSubtitle(item)
                              ? ` · ${getAgendamentoCardSubtitle(item)}`
                              : ""}
                          </div>
                        ) : null}
                      </>
                    )}
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
  onCreateAt,
  onEdit,
}: {
  anchor: Date;
  items: Agendamento[];
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
}) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const byDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    for (const item of items) {
      if (item.status === "cancelado") continue;
      const key = toDateInput(new Date(item.startsAt));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return map;
  }, [items]);

  return (
    <div className="relative overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-3xl border bg-card shadow-sm">
      {loading ? (
        <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : null}

      <div className="min-w-200">
        <div className="grid grid-cols-7 border-b bg-gradient-to-b from-primary/8 to-muted/20">
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
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-muted",
                      isToday &&
                        "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary",
                    )}
                  >
                    {day.getDate()}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground"
                    onClick={() => onCreateAt(day, 9)}
                  >
                    +
                  </Button>
                </div>

                <div className="flex flex-col gap-0.5 min-h-0">
                  {shown.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onEdit(item)}
                      className={cn(
                        "truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight border shadow-sm",
                        AGENDAMENTO_TIPO_BLOCK[getAgendamentoVisual(item)],
                        item.status === "cancelado" && "opacity-50 grayscale",
                      )}
                      title={`${AGENDAMENTO_VISUAL_LABEL[getAgendamentoVisual(item)]} · ${AGENDAMENTO_ORIGEM_LABEL[getAgendamentoOrigem(item)]} · ${getAgendamentoCardTitle(item)}${
                        getAgendamentoCardSubtitle(item)
                          ? ` · ${getAgendamentoCardSubtitle(item)}`
                          : ""
                      } · ${AGENDAMENTO_STATUS_LABEL[item.status]}`}
                    >
                      {new Date(item.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {getAgendamentoCardTitle(item)}
                    </button>
                  ))}
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
    </div>
  );
}
