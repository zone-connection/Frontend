import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AgendaBoard,
  getVisibleRange,
  toDateInput,
} from "@/components/agenda-board";
import { fetchAgendamentos, type Agendamento } from "@/lib/agenda-api";
import { PRIORIDADE_LABEL, type Tarefa } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

export type TarefaVisao = "lista" | "dia" | "semana" | "mes";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function hojeYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export function addDays(ymd: string, days: number) {
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfWeek(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(ymd, -mondayOffset);
}

export function shiftMonth(ymd: string, delta: number) {
  const date = new Date(`${ymd.slice(0, 7)}-01T12:00:00`);
  date.setMonth(date.getMonth() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthLabel(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function dayLabel(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function byDay(items: Tarefa[]) {
  const map = new Map<string, Tarefa[]>();
  for (const item of items) {
    const list = map.get(item.data) ?? [];
    list.push(item);
    map.set(item.data, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.horario ?? "99:99").localeCompare(b.horario ?? "99:99"));
  }
  return map;
}

const HORA_INICIO = 7;
const HORA_FIM = 21;

function horaDaTarefa(horario?: string | null) {
  if (!horario) return null;
  const hora = Number(horario.slice(0, 2));
  return Number.isFinite(hora) ? hora : null;
}

function tom(tarefa: Tarefa) {
  if (tarefa.status === "concluida") {
    return "border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50";
  }
  if (tarefa.atrasada || tarefa.prioridade === "alta") {
    return "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-50";
  }
  if (tarefa.prioridade === "media") {
    return "border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-50";
  }
  return "border-slate-300 bg-slate-50 text-slate-800 dark:bg-slate-900/50 dark:text-slate-100";
}

function Evento({
  tarefa,
  onOpen,
  compacto,
}: {
  tarefa: Tarefa;
  onOpen: (tarefa: Tarefa) => void;
  compacto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(tarefa)}
      title={`${tarefa.horario ?? "Sem horário"} · ${PRIORIDADE_LABEL[tarefa.prioridade]}`}
      className={cn(
        "w-full rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        tom(tarefa),
        tarefa.status === "concluida" && "line-through opacity-70",
      )}
    >
      <span className={cn("block font-semibold", compacto ? "truncate text-[11px]" : "text-sm")}>
        {tarefa.horario ? `${tarefa.horario}  ` : ""}
        {tarefa.titulo}
      </span>
      {compacto ? null : (
        <span className="mt-0.5 block text-[11px] opacity-70">
          {PRIORIDADE_LABEL[tarefa.prioridade]}
        </span>
      )}
    </button>
  );
}

function AgendaDoMes({
  anchor,
  onPickDay,
}: {
  anchor: string;
  onPickDay: (ymd: string) => void;
}) {
  const navigate = useNavigate();
  const mes = anchor.slice(0, 7);
  const anchorDate = new Date(`${mes}-01T12:00:00`);
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const range = getVisibleRange("mes", anchorDate);
    setLoading(true);
    void fetchAgendamentos({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    // A grade depende só do mês visível.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  return (
    <AgendaBoard
      view="mes"
      anchor={anchorDate}
      items={items}
      loading={loading}
      onSelectDay={(day) => onPickDay(toDateInput(day))}
      onCreateAt={() => void navigate({ to: "/agenda" })}
      onEdit={() => void navigate({ to: "/agenda" })}
    />
  );
}

export function TarefasCalendario({
  visao,
  anchor,
  items,
  onOpen,
  onPickDay,
}: {
  visao: Exclude<TarefaVisao, "lista">;
  anchor: string;
  items: Tarefa[];
  onOpen: (tarefa: Tarefa) => void;
  onPickDay: (ymd: string) => void;
}) {
  const grouped = byDay(items);

  if (visao === "dia") {
    const list = grouped.get(anchor) ?? [];
    const semHora = list.filter((item) => horaDaTarefa(item.horario) == null);
    return (
      <div className="overflow-hidden rounded-2xl border bg-card">
        {list.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Nenhuma tarefa neste dia.</p>
        ) : null}
        {Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, index) => HORA_INICIO + index).map(
          (hora) => {
            const doSlot = list.filter((item) => horaDaTarefa(item.horario) === hora);
            return (
              <div key={hora} className="grid grid-cols-[4.25rem_minmax(0,1fr)] border-t first:border-t-0">
                <div className="bg-muted/40 px-2 py-3 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                  {String(hora).padStart(2, "0")}:00
                </div>
                <div className="min-h-14 space-y-1.5 border-l px-2 py-1.5">
                  {doSlot.map((tarefa) => (
                    <Evento key={tarefa.id} tarefa={tarefa} onOpen={onOpen} />
                  ))}
                </div>
              </div>
            );
          },
        )}
        {semHora.length > 0 ? (
          <div className="space-y-1.5 border-t bg-muted/20 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sem horário
            </p>
            {semHora.map((tarefa) => (
              <Evento key={tarefa.id} tarefa={tarefa} onOpen={onOpen} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (visao === "semana") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    const hoje = hojeYmd();
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day, index) => {
          const lista = grouped.get(day) ?? [];
          const isHoje = day === hoje;
          return (
            <section
              key={day}
              className={cn(
                "flex min-h-52 flex-col rounded-2xl border bg-card p-2",
                isHoje && "border-primary bg-primary/5 shadow-sm",
              )}
            >
              <button
                type="button"
                className="mb-2 flex items-center justify-between rounded-xl px-1.5 py-1 text-left hover:bg-background/70"
                onClick={() => onPickDay(day)}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {WEEKDAYS[index]}
                </span>
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-sm font-semibold",
                    isHoje && "bg-primary text-primary-foreground",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
              </button>
              <div className="space-y-1.5">
                {lista.map((tarefa) => (
                  <Evento key={tarefa.id} tarefa={tarefa} onOpen={onOpen} compacto />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return <AgendaDoMes anchor={anchor} onPickDay={onPickDay} />;
}
