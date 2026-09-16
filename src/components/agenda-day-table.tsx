import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPO_CARD,
  AGENDAMENTO_TIPO_SOFT,
  AGENDAMENTO_TIPO_WELL,
  AGENDAMENTO_VISUAL_LABEL,
  getAgendamentoCardTitle,
  getAgendamentoVisual,
  isAgendamentoAniversario,
  isAgendamentoBloqueio,
  type Agendamento,
  type AgendamentoStatus,
} from "@/lib/agenda-api";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  Ban,
  Cake,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { addDays, sameDay, startOfWeek, toDateInput } from "@/components/agenda-board";
import { AGENDAMENTO_TIPO_ICON } from "@/components/agenda-tipo-option";
import { AGENDA_LUX_BLOCK } from "@/lib/agenda-lux-colors";
import { toast } from "sonner";

/** Horários da tabela: 07:00 até 00:00. */
const DAY_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0,
] as const;

const STATUS_BADGE: Record<AgendamentoStatus, string> = {
  agendado: `${STATUS_CHIP_CLASS} bg-primary/12 text-primary`,
  concluido: `${STATUS_CHIP_CLASS} bg-emerald-500/15 text-emerald-800 dark:text-emerald-200`,
  cancelado: `${STATUS_CHIP_CLASS} bg-red-500/15 text-red-800 dark:text-red-200`,
};

function eventIcon(item: Agendamento): LucideIcon {
  if (isAgendamentoAniversario(item)) return Cake;
  return AGENDAMENTO_TIPO_ICON[item.tipo] ?? CalendarDays;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRange(item: Agendamento) {
  const start = new Date(item.startsAt);
  const startLabel = formatTime(start);
  if (!item.endsAt) return startLabel;
  return `${startLabel} – ${formatTime(new Date(item.endsAt))}`;
}

function slotBounds(day: Date, hour: number) {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(day);
  if (hour === 23) end.setHours(23, 59, 59, 999);
  else if (hour === 0) end.setHours(0, 59, 59, 999);
  else end.setHours(hour + 1, 0, 0, 0);
  return { start, end };
}

function findCoveringBloqueio(
  day: Date,
  hour: number,
  items: Agendamento[],
): Agendamento | null {
  const { start, end } = slotBounds(day, hour);
  for (const item of items) {
    if (!isAgendamentoBloqueio(item) || item.status === "cancelado") continue;
    if (!sameDay(new Date(item.startsAt), day)) continue;
    const bStart = new Date(item.startsAt);
    const bEnd = item.endsAt ? new Date(item.endsAt) : bStart;
    if (start < bEnd && end > bStart) return item;
  }
  return null;
}

type Slot =
  | { kind: "empty"; hour: number }
  | { kind: "event"; hour: number; item: Agendamento };

function buildDaySlots(day: Date, items: Agendamento[]): Slot[] {
  const dayItems = items
    .filter(
      (item) =>
        sameDay(new Date(item.startsAt), day) && item.status !== "cancelado",
    )
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const used = new Set<string>();
  const slots: Slot[] = [];

  for (const hour of DAY_HOURS) {
    const atHour = dayItems.filter((item) => {
      if (used.has(item.id)) return false;
      return new Date(item.startsAt).getHours() === hour;
    });

    if (atHour.length === 0) {
      slots.push({ kind: "empty", hour });
      continue;
    }

    for (const item of atHour) {
      used.add(item.id);
      slots.push({ kind: "event", hour, item });
    }
  }

  // Compromissos fora da grade (madrugada 01–06) ainda aparecem no fim.
  for (const item of dayItems) {
    if (used.has(item.id)) continue;
    slots.push({
      kind: "event",
      hour: new Date(item.startsAt).getHours(),
      item,
    });
  }

  return slots;
}

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

type Props = {
  day: Date;
  items: Agendamento[];
  loading?: boolean;
  showCorretor?: boolean;
  /** Papel do usuário logado — compromissos de admin só admin altera. */
  currentUserRole?: Role;
  currentUserId?: string;
  completingId?: string | null;
  cancelingId?: string | null;
  tone?: "default" | "lux";
  onSelectDay?: (day: Date) => void;
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (item: Agendamento) => void;
  onComplete: (item: Agendamento) => void;
  onCancel: (item: Agendamento) => void;
};

function canMutateItem(item: Agendamento, role?: Role) {
  if (isAgendamentoAniversario(item)) return false;
  if (isAgendamentoBloqueio(item)) {
    return role === "admin" || role === "gerente";
  }
  if (item.autor.role === "admin") return role === "admin";
  return true;
}

function canCompleteItem(
  item: Agendamento,
  role?: Role,
  currentUserId?: string,
) {
  if (isAgendamentoAniversario(item) || isAgendamentoBloqueio(item)) {
    return false;
  }
  if (item.status !== "agendado" || item.solicitacaoStatus === "pendente") {
    return false;
  }
  if (canMutateItem(item, role)) return true;
  // Destinatário da tarefa atribuída pode concluir.
  return Boolean(currentUserId && item.atribuidoParaId === currentUserId);
}

function alvoBadgeLabel(item: Agendamento): string | null {
  const isAdminEvent =
    item.alvoTipo === "todos" ||
    item.alvoTipo === "equipe" ||
    item.alvoTipo === "gerente" ||
    item.alvoTipo === "gerentes" ||
    item.autor.role === "admin";
  if (!isAdminEvent) return null;
  if (item.alvoTipo === "todos") return "Todas as equipes";
  if (item.alvoTipo === "equipe") {
    return item.alvoEquipe?.name
      ? `Equipe: ${item.alvoEquipe.name}`
      : "Equipe";
  }
  if (item.alvoTipo === "gerente") {
    return item.alvoGerente?.name
      ? `Gerente: ${item.alvoGerente.name}`
      : "Gerente";
  }
  if (item.alvoTipo === "gerentes") return "Todos os gerentes";
  if (item.autor.role === "admin") return "Equipe";
  return null;
}

export function AgendaDayTable({
  day,
  items,
  loading,
  showCorretor,
  currentUserRole,
  currentUserId,
  completingId,
  cancelingId,
  tone = "default",
  onSelectDay,
  onCreateAt,
  onEdit,
  onComplete,
  onCancel,
}: Props) {
  const slots = buildDaySlots(day, items);
  const dayItems = items.filter(
    (i) => sameDay(new Date(i.startsAt), day) && i.status !== "cancelado",
  );
  const activeCount = dayItems.length;
  const now = new Date();
  const isToday = sameDay(day, now);
  const currentHour = now.getHours();

  const nextItem = isToday
    ? dayItems
        .filter(
          (i) =>
            i.status === "agendado" && new Date(i.startsAt).getTime() >= now.getTime(),
        )
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        )[0]
    : undefined;
  const lux = tone === "lux";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border shadow-sm max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0",
        lux ? "border-[#c9a227]/18 bg-[#101217]" : "bg-card",
      )}
    >
      {onSelectDay && !lux ? (
        <WeekStrip day={day} items={items} onSelectDay={onSelectDay} />
      ) : null}

      {!lux ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-primary/10 to-transparent px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {isToday ? "Hoje" : day.toLocaleDateString("pt-BR", { weekday: "long" })}
          </p>
          <h3 className="mt-0.5 truncate text-lg font-semibold capitalize tracking-tight sm:text-xl">
            {day.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
            })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCount === 0
              ? "Dia livre — toque em um horário para agendar"
              : `${activeCount} compromisso${activeCount > 1 ? "s" : ""} neste dia`}
            {nextItem
              ? ` · próximo às ${formatTime(new Date(nextItem.startsAt))}`
              : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full shadow-md shadow-primary/20"
          onClick={() => onCreateAt(day)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agendar
        </Button>
      </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando horários…
        </div>
      ) : (
        <div className="relative py-1.5">
          {slots.map((slot, index) => {
            const isNow = isToday && slot.hour === currentHour;
            const isLast = index === slots.length - 1;

            if (slot.kind === "empty") {
              const bloqueio = findCoveringBloqueio(day, slot.hour, items);
              return (
                <div
                  key={`empty-${slot.hour}`}
                  className={cn(
                    "group grid grid-cols-[4.25rem_1fr] sm:grid-cols-[5rem_1fr]",
                    isNow && "bg-primary/6",
                  )}
                >
                  <TimeRail
                    hour={slot.hour}
                    isNow={isNow}
                    isLast={isLast}
                    compact
                  />
                  <div className="min-w-0 py-0.5 pr-3 sm:pr-4">
                    {bloqueio ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (canMutateItem(bloqueio, currentUserRole)) {
                            onEdit(bloqueio);
                          } else {
                            toast.message("Horário bloqueado", {
                              description: bloqueio.titulo,
                            });
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-400/50 bg-slate-500/8 px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-slate-500/15"
                      >
                        <Ban className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          Bloqueado — {bloqueio.autor.name}
                          {bloqueio.titulo ? ` · ${bloqueio.titulo}` : ""}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreateAt(day, slot.hour)}
                        className={cn(
                          "flex h-8 w-full items-center gap-2 rounded-xl px-1 text-left transition",
                          isNow
                            ? "bg-primary/8 hover:bg-primary/14"
                            : "hover:bg-primary/8",
                        )}
                      >
                        <span className="h-px flex-1 bg-border/70 transition group-hover:bg-transparent" />
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11px] font-medium",
                            isNow
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-primary/25 text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary sm:border-transparent sm:text-muted-foreground/0 sm:group-hover:border-primary/35 sm:group-hover:text-primary",
                          )}
                        >
                          <Plus className="h-3 w-3" />
                          <span className={cn(!isNow && "sm:hidden sm:group-hover:inline")}>
                            {isNow
                              ? `Agora · agendar ${formatHourLabel(slot.hour)}`
                              : `Agendar ${formatHourLabel(slot.hour)}`}
                          </span>
                        </span>
                        <span className="h-px flex-1 bg-border/70 transition group-hover:bg-transparent" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            const { item } = slot;
            const cancelled = item.status === "cancelado";
            const canMutate = canMutateItem(item, currentUserRole);
            const visual = getAgendamentoVisual(item);
            const Icon = eventIcon(item);
            const alvo = alvoBadgeLabel(item);
            const corretorName =
              item.atribuidoPara?.name ??
              item.lead?.corretor?.name ??
              item.autor?.name ??
              null;

            return (
              <div
                key={item.id}
                className={cn(
                  "grid grid-cols-[4.25rem_1fr] sm:grid-cols-[5rem_1fr]",
                  cancelled && "opacity-60",
                  isNow && "bg-primary/6",
                )}
              >
                <TimeRail
                  hour={slot.hour}
                  isNow={isNow}
                  isLast={isLast}
                />
                <div className="min-w-0 py-1 pr-3 sm:pr-4">
                  <article
                    className={cn(
                      "relative overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md",
                      lux
                        ? cn("border-transparent", AGENDA_LUX_BLOCK[visual])
                        : cn("border-l-[3px]", AGENDAMENTO_TIPO_CARD[visual]),
                      item.status === "concluido" && "opacity-90",
                    )}
                  >
                    <div className="flex items-center gap-2.5 px-2.5 py-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          AGENDAMENTO_TIPO_WELL[visual],
                        )}
                        title={AGENDAMENTO_VISUAL_LABEL[visual]}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {canMutate ? (
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              className="min-w-0 truncate text-left text-sm font-semibold leading-tight hover:underline"
                            >
                              {getAgendamentoCardTitle(item)}
                            </button>
                          ) : (
                            <p className="min-w-0 truncate text-sm font-semibold leading-tight">
                              {getAgendamentoCardTitle(item)}
                            </p>
                          )}
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                            <Clock className="h-3 w-3 text-primary" />
                            {formatTimeRange(item)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn("ml-auto h-5 shrink-0 px-1.5 text-[10px]", STATUS_BADGE[item.status])}
                            title={AGENDAMENTO_STATUS_LABEL[item.status]}
                          >
                            {AGENDAMENTO_STATUS_LABEL[item.status]}
                          </Badge>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-px font-medium",
                              AGENDAMENTO_TIPO_SOFT[visual],
                            )}
                          >
                            {AGENDAMENTO_VISUAL_LABEL[visual]}
                          </span>
                          {alvo ? (
                            <span>{alvo}</span>
                          ) : isAgendamentoBloqueio(item) ? (
                            <span>Bloqueado · {item.autor.name}</span>
                          ) : item.atribuidoParaId ? (
                            <span>
                              {item.atribuidoPara
                                ? `Para ${item.atribuidoPara.name}`
                                : `De ${item.autor.name}`}
                            </span>
                          ) : item.escopo === "pessoal" ? (
                            <span>Pessoal</span>
                          ) : (
                            <span>Com gerente</span>
                          )}
                          {item.solicitacaoStatus === "pendente" ? (
                            <span className="font-medium text-primary">
                              Aguardando
                            </span>
                          ) : null}
                          {item.lead ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                                {initials(item.lead.nome)}
                              </span>
                              <span className="text-foreground/80">
                                {item.lead.nome}
                              </span>
                              {item.lead.telefone ? (
                                <span>· {item.lead.telefone}</span>
                              ) : null}
                            </span>
                          ) : null}
                          {showCorretor && corretorName ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {corretorName}
                            </span>
                          ) : null}
                          {item.local ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.local}
                            </span>
                          ) : null}
                          {!item.lead &&
                          !item.local &&
                          !showCorretor &&
                          !item.atribuidoParaId ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.autor.name}
                            </span>
                          ) : null}
                        </div>

                        {isAgendamentoBloqueio(item) && item.titulo ? (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {item.titulo}
                          </p>
                        ) : null}
                        {item.observacoes ? (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {item.observacoes}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {canCompleteItem(
                          item,
                          currentUserRole,
                          currentUserId,
                        ) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-800 dark:text-emerald-300"
                            onClick={() => onComplete(item)}
                            disabled={
                              completingId === item.id ||
                              cancelingId === item.id
                            }
                            aria-label="Concluir"
                            title="Concluir"
                          >
                            {completingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : null}
                        {canMutate && item.status === "agendado" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300"
                            onClick={() => onCancel(item)}
                            disabled={
                              completingId === item.id ||
                              cancelingId === item.id
                            }
                            aria-label="Cancelar"
                            title="Cancelar"
                          >
                            {cancelingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : null}
                        {canMutate ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(item)}
                            aria-label="Editar"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekStrip({
  day,
  items,
  onSelectDay,
}: {
  day: Date;
  items: Agendamento[];
  onSelectDay: (day: Date) => void;
}) {
  const today = new Date();
  const weekStart = startOfWeek(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-1 border-b bg-gradient-to-b from-primary/8 to-transparent p-2 sm:p-2.5">
      {days.map((d) => {
        const selected = sameDay(d, day);
        const isToday = sameDay(d, today);
        const hasEvents = items.some(
          (item) =>
            sameDay(new Date(item.startsAt), d) && item.status !== "cancelado",
        );
        return (
          <button
            key={toDateInput(d)}
            type="button"
            onClick={() => onSelectDay(d)}
            className={cn(
              "flex flex-col items-center rounded-2xl px-1 py-2 transition",
              selected
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : isToday
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30 hover:bg-primary/15"
                  : hasEvents
                    ? "text-foreground hover:bg-muted/80"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              {d
                .toLocaleDateString("pt-BR", { weekday: "short" })
                .replace(".", "")}
            </span>
            <span
              className={cn(
                "mt-0.5 text-base leading-none sm:text-lg",
                selected || hasEvents ? "font-bold" : "font-semibold",
              )}
            >
              {d.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TimeRail({
  hour,
  isNow,
  isLast,
  compact,
}: {
  hour: number;
  isNow: boolean;
  isLast: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-end pr-3.5",
        compact ? "pt-2" : "pt-3",
      )}
    >
      {!isLast ? (
        <span className="absolute bottom-0 right-[7px] top-0 w-px bg-border/80" />
      ) : (
        <span className="absolute right-[7px] top-0 h-5 w-px bg-border/80" />
      )}
      <span
        className={cn(
          "text-xs font-medium tabular-nums text-muted-foreground",
          isNow && "font-semibold text-primary",
        )}
      >
        {formatHourLabel(hour)}
      </span>
      {isNow ? (
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
          Agora
        </span>
      ) : null}
    </div>
  );
}
