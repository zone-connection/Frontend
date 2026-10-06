import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TarefasCalendario,
  addDays,
  dayLabel,
  hojeYmd,
  monthLabel,
  shiftMonth,
  startOfWeek,
  type TarefaVisao,
} from "@/components/tarefas-calendario";
import { PRIORIDADE_LABEL, type TarefaFiltro } from "@/lib/tarefas-api";
import type { TarefaVisivel } from "@/lib/tarefas-mock";
import { cn } from "@/lib/utils";

const FILTROS: { id: TarefaFiltro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "hoje", label: "Hoje" },
  { id: "proximas", label: "Próximas" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "concluidas", label: "Concluídas" },
];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function contexto(tarefa: TarefaVisivel) {
  if (tarefa.contexto.lead) return `Lead: ${tarefa.contexto.lead.nome}`;
  if (tarefa.contexto.imovel) return `Imóvel: ${tarefa.contexto.imovel.rotulo}`;
  if (tarefa.contexto.atendimento) {
    return tarefa.contexto.atendimento.titulo;
  }
  return null;
}

function quando(tarefa: TarefaVisivel, hoje: string) {
  const dia =
    tarefa.data === hoje
      ? "Hoje"
      : tarefa.data === addDays(hoje, -1)
        ? "Ontem"
        : tarefa.data === addDays(hoje, 1)
          ? "Amanhã"
          : tarefa.data.slice(8) + "/" + tarefa.data.slice(5, 7);
  return `${dia}${tarefa.horario ? ` · ${tarefa.horario}` : ""}`;
}

export function TarefasPainel({
  items,
  filtro,
  visao,
  anchor,
  onFiltro,
  onVisao,
  onAnchor,
  onOpen,
  onComplete,
  onCreate,
  modo = "geral",
}: {
  items: TarefaVisivel[];
  filtro: TarefaFiltro;
  visao: TarefaVisao;
  anchor: string;
  onFiltro: (filtro: TarefaFiltro) => void;
  onVisao: (visao: TarefaVisao) => void;
  onAnchor: (ymd: string) => void;
  onOpen: (tarefa: TarefaVisivel) => void;
  onComplete: (tarefa: TarefaVisivel) => void;
  onCreate: () => void;
  modo?: "geral" | "lista" | "calendario";
}) {
  const hoje = hojeYmd();
  const abertas = items.filter((item) => item.status === "aberta");
  const hojeCount = abertas.filter((item) => item.data === hoje).length;
  const proximas = abertas.filter((item) => item.data > hoje).length;
  const atrasadas = abertas.filter((item) => item.atrasada || item.data < hoje).length;
  const concluidas = items.filter((item) => item.status === "concluida").length;
  const counts: Record<TarefaFiltro, number> = {
    todas: items.length,
    hoje: hojeCount,
    proximas,
    atrasadas,
    concluidas,
  };

  const visiveis = items.filter((item) => {
    if (filtro === "concluidas") return item.status === "concluida";
    if (filtro === "hoje") return item.status === "aberta" && item.data === hoje;
    if (filtro === "proximas") return item.status === "aberta" && item.data > hoje;
    if (filtro === "atrasadas") {
      return item.status === "aberta" && (item.atrasada || item.data < hoje);
    }
    return true;
  });

  const grupos = [
    {
      titulo: "Atrasadas",
      items: visiveis.filter(
        (item) => item.status === "aberta" && (item.atrasada || item.data < hoje),
      ),
    },
    {
      titulo: "Hoje",
      items: visiveis.filter((item) => item.status === "aberta" && item.data === hoje),
    },
    {
      titulo: "Próximas",
      items: visiveis.filter((item) => item.status === "aberta" && item.data > hoje),
    },
    {
      titulo: "Concluídas",
      items: visiveis.filter((item) => item.status === "concluida"),
    },
  ].filter((grupo) => grupo.items.length > 0);

  const agendaHoje = abertas
    .filter((item) => item.data === hoje)
    .sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));
  const progresso =
    hojeCount + concluidas === 0
      ? 0
      : Math.round((concluidas / (hojeCount + concluidas)) * 100);

  const diasComTarefa = new Set(abertas.map((item) => item.data));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {modo === "calendario" ? "Calendário" : modo === "lista" ? "Minhas tarefas" : "Visão geral"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Um passo de cada vez. Tudo sob controle.
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      {modo === "calendario" ? null : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo icon={List} valor={hojeCount} titulo="Tarefas para hoje" detalhe="Seu foco para o dia" />
        <Resumo icon={CalendarDays} valor={proximas} titulo="Próximas tarefas" detalhe="O que vem pela frente" />
        <Resumo icon={Clock3} valor={atrasadas} titulo="Tarefas atrasadas" detalhe="Precisam da sua atenção" />
        <Resumo icon={CheckCircle2} valor={concluidas} titulo="Tarefas concluídas" detalhe="Cada conquista conta" />
      </div>
      )}

      <div className={cn("grid items-start gap-5", modo !== "lista" && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <section className="min-w-0 rounded-2xl border bg-card">
          <div className="flex gap-6 overflow-x-auto border-b px-5 pt-4 text-sm">
            {FILTROS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "shrink-0 pb-3",
                  filtro === item.id
                    ? "border-b-2 border-primary font-medium text-foreground"
                    : "text-muted-foreground",
                )}
                onClick={() => onFiltro(item.id)}
              >
                {item.label}{" "}
                <span className="text-muted-foreground">{counts[item.id]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            {modo === "lista" ? <p className="text-sm text-muted-foreground">Pendências da rotina</p> : (
            <div className="flex rounded-xl bg-muted/60 p-1">
              {(
                [
                  ["lista", "Lista"],
                  ["dia", "Dia"],
                  ["semana", "Semana"],
                  ["mes", "Mês"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm text-muted-foreground",
                    visao === id && "bg-background font-medium text-foreground shadow-sm",
                  )}
                  onClick={() => onVisao(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            )}
            {modo === "lista" || visao === "lista" ? (
              <p className="text-xs text-muted-foreground">Exemplos para explorar</p>
            ) : (
              <div className="flex items-center gap-1 text-sm">
                <Button size="icon" variant="ghost" onClick={() => onAnchor(visao === "mes" ? shiftMonth(anchor, -1) : addDays(anchor, visao === "dia" ? -1 : -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-36 text-center font-medium">
                  {visao === "dia" ? dayLabel(anchor) : monthLabel(anchor)}
                </span>
                <Button size="icon" variant="ghost" onClick={() => onAnchor(visao === "mes" ? shiftMonth(anchor, 1) : addDays(anchor, visao === "dia" ? 1 : 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-6 px-5 pb-5">
            {modo !== "calendario" && visao === "lista" ? (
              grupos.map((grupo) => (
                <div key={grupo.titulo} className="space-y-2">
                  <p className={cn("text-sm font-medium", grupo.titulo === "Atrasadas" && "text-red-600")}>
                    {grupo.titulo} {grupo.items.length}
                  </p>
                  {grupo.items.map((tarefa) => {
                    const atrasada =
                      tarefa.status === "aberta" && (tarefa.atrasada || tarefa.data < hoje);
                    return (
                      <article
                        key={tarefa.id}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5",
                          atrasada && "border-red-100 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20",
                        )}
                      >
                        <button
                          type="button"
                          aria-label="Concluir tarefa"
                          className={cn(
                            "h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/40",
                            tarefa.status === "concluida" && "border-emerald-500 bg-emerald-500",
                          )}
                          onClick={() => onComplete(tarefa)}
                        />
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
                          <p className={cn("truncate font-medium", tarefa.status === "concluida" && "line-through opacity-60")}>
                            {tarefa.titulo}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {quando(tarefa, hoje)}
                            {contexto(tarefa) ? `  ·  ${contexto(tarefa)}` : ""}
                          </p>
                        </button>
                        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              tarefa.prioridade === "alta" && "bg-red-500",
                              tarefa.prioridade === "media" && "bg-amber-400",
                              tarefa.prioridade === "baixa" && "bg-emerald-500",
                            )}
                          />
                          {PRIORIDADE_LABEL[tarefa.prioridade]}
                        </span>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-800">
                          {iniciais(tarefa.responsavel.name)}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ))
            ) : (
              <TarefasCalendario
                visao={visao === "lista" ? "mes" : visao}
                anchor={anchor}
                items={visiveis}
                onOpen={onOpen}
                onPickDay={(day) => {
                  onAnchor(day);
                  onVisao("dia");
                }}
              />
            )}
          </div>
        </section>

        {modo === "lista" ? null : <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Seu calendário</p>
              <p className="text-xs text-muted-foreground">{monthLabel(anchor)}</p>
            </div>
            <MiniMes
              anchor={anchor}
              hoje={hoje}
              marcados={diasComTarefa}
              onPick={(day) => {
                onAnchor(day);
                onVisao("dia");
              }}
              onShift={(delta) => onAnchor(shiftMonth(anchor, delta))}
            />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Agenda de hoje</p>
              <p className="text-xs text-muted-foreground">{agendaHoje.length} itens</p>
            </div>
            <ul className="mt-4 space-y-4">
              {agendaHoje.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nada marcado para hoje.</li>
              ) : (
                agendaHoje.map((tarefa) => (
                  <li key={tarefa.id} className="grid grid-cols-[3.2rem_minmax(0,1fr)] gap-2">
                    <p className="text-xs text-muted-foreground">{tarefa.horario ?? "—"}</p>
                    <button type="button" className="text-left" onClick={() => onOpen(tarefa)}>
                      <p className="text-sm font-medium leading-snug">{tarefa.titulo}</p>
                      <p className="text-xs text-muted-foreground">{contexto(tarefa)}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
            <p className="font-medium">Mais foco. Menos pendências.</p>
            <p className="mt-1 text-sm text-emerald-900/80">
              Pequenos passos hoje, grandes conquistas amanhã.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span>Progresso do dia</span>
              <span>{progresso}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-emerald-200">
              <div className="h-full bg-emerald-600" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        </aside>}
      </div>
    </div>
  );
}

function MiniMes({
  anchor,
  hoje,
  marcados,
  onPick,
  onShift,
}: {
  anchor: string;
  hoje: string;
  marcados: Set<string>;
  onPick: (ymd: string) => void;
  onShift: (delta: number) => void;
}) {
  const first = `${anchor.slice(0, 7)}-01`;
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-md p-1 hover:bg-muted" onClick={() => onShift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-md p-1 hover:bg-muted" onClick={() => onShift(1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((dia, index) => (
          <div key={`${dia}-${index}`} className="py-1">
            {dia}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
          const selected = day === anchor;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              className={cn(
                "relative mx-auto grid h-8 w-8 place-items-center rounded-full text-xs",
                !inMonth && "text-muted-foreground/40",
                selected && "bg-primary text-primary-foreground",
                !selected && day === hoje && "ring-1 ring-primary",
              )}
            >
              {Number(day.slice(8))}
              {marcados.has(day) && !selected ? (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Resumo({
  icon: Icon,
  valor,
  titulo,
  detalhe,
}: {
  icon: typeof List;
  valor: number;
  titulo: string;
  detalhe: string;
}) {
  return (
    <article className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{titulo}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{String(valor).padStart(2, "0")}</p>
      <p className="text-xs text-muted-foreground">{detalhe}</p>
    </article>
  );
}
