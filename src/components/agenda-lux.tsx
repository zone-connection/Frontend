import type { ReactNode } from "react";
import {
  Ban,
  Cake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Handshake,
  Home,
  Phone,
  Plus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  addDays,
  sameDay,
  startOfMonth,
  startOfWeek,
  toDateInput,
} from "@/components/agenda-board";
import { Button } from "@/components/ui/button";
import { AGENDA_LUX_CHIP } from "@/lib/agenda-lux-colors";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import {
  AGENDAMENTO_VISUAL_LABEL,
  getAgendamentoCardTitle,
  isAgendamentoAniversario,
  type AgendaKpis,
  type Agendamento,
  type AgendamentoVisual,
} from "@/lib/agenda-api";
import { cn } from "@/lib/utils";

const LUX_CHIP_ICON: Record<AgendamentoVisual, LucideIcon> = {
  visita: Home,
  ligacao: Phone,
  reuniao: Handshake,
  tarefa: FileText,
  outro: CalendarDays,
  bloqueio: Ban,
  aniversario: Cake,
};

export function AgendaLuxShell({ children }: { children: ReactNode }) {
  return <div className="text-foreground">{children}</div>;
}

export function AgendaLuxPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(SOFT_SURFACE, className)}>{children}</div>;
}

export function AgendaLuxHeader({
  help,
  actions,
}: {
  help?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          Agenda
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Agenda
          </h1>
          {help}
        </div>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Organize seu tempo, atenda mais e realize mais sonhos!
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:items-end">
        {actions}
      </div>
    </div>
  );
}

function percentVs(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

const EMPTY_KPI = { hoje: 0, ontem: 0 };

export function AgendaLuxKpis({ kpis }: { kpis: AgendaKpis | null }) {
  const data = kpis ?? {
    compromissos: EMPTY_KPI,
    atendimentos: EMPTY_KPI,
    reunioes: EMPTY_KPI,
    propostas: EMPTY_KPI,
    visitas: EMPTY_KPI,
  };
  const cards = [
    {
      label: "Compromissos hoje",
      icon: CalendarDays,
      current: data.compromissos.hoje,
      previous: data.compromissos.ontem,
    },
    {
      label: "Atendimentos",
      icon: UserRound,
      current: data.atendimentos.hoje,
      previous: data.atendimentos.ontem,
    },
    {
      label: "Reuniões",
      icon: Handshake,
      current: data.reunioes.hoje,
      previous: data.reunioes.ontem,
    },
    {
      label: "Propostas",
      icon: FileText,
      current: data.propostas.hoje,
      previous: data.propostas.ontem,
    },
    {
      label: "Visitas a imóveis",
      icon: Home,
      current: data.visitas.hoje,
      previous: data.visitas.ontem,
    },
  ];

  const tones = [
    "blue",
    "violet",
    "orange",
    "emerald",
    "teal",
  ] as const;
  const wash: Record<(typeof tones)[number], string> = {
    blue: "border-sky-100/80 bg-sky-50",
    violet: "border-violet-100/80 bg-violet-50",
    orange: "border-orange-100/80 bg-orange-50",
    emerald: "border-emerald-100/80 bg-emerald-50",
    teal: "border-teal-100/80 bg-teal-50",
  };
  const iconBg: Record<(typeof tones)[number], string> = {
    blue: "bg-sky-500",
    violet: "bg-violet-500",
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
  };

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
      {cards.map((card, index) => {
        const delta = percentVs(card.current, card.previous);
        const Icon = card.icon;
        const tone = tones[index] ?? "blue";
        return (
          <div
            key={card.label}
            className={cn(
              "rounded-2xl border px-2.5 py-2",
              wash[tone],
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-white ring-2 ring-white/70",
                  iconBg[tone],
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="text-lg font-bold tabular-nums leading-tight">{card.current}</p>
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    delta >= 0
                      ? "text-emerald-600"
                      : "text-rose-600",
                  )}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta}% vs. ontem
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AgendaLuxTypeChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const visuals = [
    "visita",
    "ligacao",
    "reuniao",
    "tarefa",
    "outro",
    "bloqueio",
    "aniversario",
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visuals.map((visual) => {
        const Icon = LUX_CHIP_ICON[visual];
        const active = value === visual || value === "__all__";
        return (
          <button
            key={visual}
            type="button"
            onClick={() =>
              onChange(value === visual ? "__all__" : visual)
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
              AGENDA_LUX_CHIP[visual],
              value !== "__all__" && !active && "opacity-35",
            )}
          >
            <Icon className="h-3 w-3" />
            {AGENDAMENTO_VISUAL_LABEL[visual]}
          </button>
        );
      })}
    </div>
  );
}

export function AgendaLuxMiniCalendar({
  month,
  selected,
  items,
  onSelect,
  onShiftMonth,
}: {
  month: Date;
  selected: Date;
  items: Agendamento[];
  onSelect: (day: Date) => void;
  onShiftMonth: (dir: -1 | 1) => void;
}) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();
  const weekdays = ["S", "T", "Q", "Q", "S", "S", "D"];
  const busy = new Set(
    items
      .filter((item) => item.status !== "cancelado")
      .map((item) => toDateInput(new Date(item.startsAt))),
  );

  return (
    <AgendaLuxPanel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold capitalize">
          {monthStart.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onShiftMonth(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onShiftMonth(1)}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {weekdays.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day) => {
          const inMonth = day.getMonth() === monthStart.getMonth();
          const selectedDay = sameDay(day, selected);
          const isToday = sameDay(day, today);
          const key = toDateInput(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs",
                !inMonth && "text-muted-foreground/40",
                inMonth && "text-foreground hover:bg-muted",
                selectedDay && "bg-primary font-bold text-primary-foreground",
                isToday && !selectedDay && "ring-1 ring-primary/50",
              )}
            >
              {day.getDate()}
              {busy.has(key) && !selectedDay ? (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </AgendaLuxPanel>
  );
}

export function AgendaLuxUpcoming({
  items,
  onOpen,
}: {
  items: Agendamento[];
  onOpen: (item: Agendamento) => void;
}) {
  const now = Date.now();
  const upcoming = items
    .filter(
      (item) =>
        item.status !== "cancelado" && new Date(item.startsAt).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 6);

  return (
    <AgendaLuxPanel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Próximos compromissos
        </p>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nada agendado à frente.</p>
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map((item) => {
            const start = new Date(item.startsAt);
            const visual = isAgendamentoAniversario(item)
              ? "aniversario"
              : item.tipo;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      AGENDA_LUX_CHIP[visual].split(" ")[0],
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">
                      {getAgendamentoCardTitle(item)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {start.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {item.lead?.nome ?? AGENDAMENTO_VISUAL_LABEL[visual]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AgendaLuxPanel>
  );
}

export function AgendaLuxQuickActions({
  onCreate,
  onBlock,
}: {
  onCreate: () => void;
  onBlock: () => void;
}) {
  return (
    <AgendaLuxPanel className="p-4">
      <p className="mb-3 text-sm font-semibold">Ações rápidas</p>
      <div className="space-y-2">
        <Button className="w-full" onClick={onCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Novo compromisso
        </Button>
        <Button variant="outline" className="w-full" onClick={onBlock}>
          <Ban className="mr-1 h-4 w-4" />
          Bloquear horário
        </Button>
      </div>
    </AgendaLuxPanel>
  );
}
