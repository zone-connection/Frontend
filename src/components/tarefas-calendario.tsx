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

function Chip({
  tarefa,
  onOpen,
}: {
  tarefa: Tarefa;
  onOpen: (tarefa: Tarefa) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(tarefa)}
      className={cn(
        "w-full truncate rounded-md px-1.5 py-1 text-left text-xs",
        tarefa.status === "concluida" && "line-through opacity-60",
        tarefa.atrasada && "bg-amber-500/20 text-amber-950 dark:text-amber-100",
        !tarefa.atrasada && tarefa.prioridade === "alta" && "bg-red-500/15",
        !tarefa.atrasada && tarefa.prioridade === "media" && "bg-sky-500/15",
        !tarefa.atrasada && tarefa.prioridade === "baixa" && "bg-muted",
      )}
      title={`${tarefa.horario ?? "Sem horário"} · ${PRIORIDADE_LABEL[tarefa.prioridade]}`}
    >
      {tarefa.horario ? `${tarefa.horario} ` : ""}
      {tarefa.titulo}
    </button>
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
    return (
      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-sm font-medium">{dayLabel(anchor)}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa neste dia.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((tarefa) => (
              <li key={tarefa.id}>
                <Chip tarefa={tarefa} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  if (visao === "semana") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {days.map((day, index) => (
          <section key={day} className="min-h-40 rounded-xl border p-2">
            <button
              type="button"
              className={cn(
                "mb-2 text-xs font-medium",
                day === hojeYmd() && "text-primary",
              )}
              onClick={() => onPickDay(day)}
            >
              {WEEKDAYS[index]} {day.slice(8)}
            </button>
            <div className="space-y-1">
              {(grouped.get(day) ?? []).map((tarefa) => (
                <Chip key={tarefa.id} tarefa={tarefa} onOpen={onOpen} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const first = `${anchor.slice(0, 7)}-01`;
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
          const list = grouped.get(day) ?? [];
          return (
            <div
              key={day}
              className={cn(
                "min-h-24 rounded-lg border p-1 text-left",
                !inMonth && "opacity-40",
                day === hojeYmd() && "border-primary",
              )}
            >
              <button
                type="button"
                className="text-xs"
                onClick={() => onPickDay(day)}
              >
                {Number(day.slice(8))}
              </button>
              <div className="mt-1 space-y-1">
                {list.slice(0, 3).map((tarefa) => (
                  <Chip key={tarefa.id} tarefa={tarefa} onOpen={onOpen} />
                ))}
                {list.length > 3 ? (
                  <span className="block text-[10px] text-muted-foreground">
                    +{list.length - 3}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
