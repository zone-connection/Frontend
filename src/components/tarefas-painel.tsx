import {
  CalendarDays,
  CheckCircle2,
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seu dia em foco</h1>
          <p className="text-sm text-muted-foreground">
            Um passo de cada vez. Tudo sob controle.
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo icon={List} valor={hojeCount} titulo="Tarefas para hoje" detalhe="Seu foco para o dia" />
        <Resumo icon={CalendarDays} valor={proximas} titulo="Próximas tarefas" detalhe="O que vem pela frente" />
        <Resumo icon={Clock3} valor={atrasadas} titulo="Tarefas atrasadas" detalhe="Precisam da sua atenção" />
        <Resumo icon={CheckCircle2} valor={concluidas} titulo="Tarefas concluídas" detalhe="Cada conquista conta" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap gap-4 border-b text-sm">
            {FILTROS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "pb-2",
                  filtro === item.id
                    ? "border-b-2 border-primary font-medium text-foreground"
                    : "text-muted-foreground",
                )}
                onClick={() => onFiltro(item.id)}
              >
                {item.label} {counts[item.id]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border p-0.5">
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
                    "rounded-md px-3 py-1 text-sm",
                    visao === id && "bg-muted font-medium",
                  )}
                  onClick={() => onVisao(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {visao !== "lista" ? (
              <div className="flex items-center gap-2 text-sm">
                <Button size="sm" variant="outline" onClick={() => onAnchor(visao === "mes" ? shiftMonth(anchor, -1) : addDays(anchor, visao === "dia" ? -1 : -7))}>
                  Anterior
                </Button>
                <span className="font-medium">
                  {visao === "dia"
                    ? dayLabel(anchor)
                    : visao === "semana"
                      ? `${startOfWeek(anchor).slice(8)} – ${addDays(startOfWeek(anchor), 6).slice(8)}`
                      : monthLabel(anchor)}
                </span>
                <Button size="sm" variant="outline" onClick={() => onAnchor(visao === "mes" ? shiftMonth(anchor, 1) : addDays(anchor, visao === "dia" ? 1 : 7))}>
                  Próximo
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Exemplos para explorar</p>
            )}
          </div>

          {visao === "lista" ? (
            <div className="space-y-5">
              {grupos.map((grupo) => (
                <div key={grupo.titulo} className="space-y-2">
                  <p className={cn("text-sm font-medium", grupo.titulo === "Atrasadas" && "text-red-600")}>
                    {grupo.titulo} {grupo.items.length}
                  </p>
                  {grupo.items.map((tarefa) => (
                    <article
                      key={tarefa.id}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3 py-3",
                        (tarefa.atrasada || (tarefa.status === "aberta" && tarefa.data < hoje)) &&
                          "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30",
                      )}
                    >
                      <button
                        type="button"
                        aria-label="Concluir tarefa"
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 rounded-full border",
                          tarefa.status === "concluida" && "bg-emerald-500 border-emerald-500",
                        )}
                        onClick={() => onComplete(tarefa)}
                      />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
                        <p className={cn("font-medium", tarefa.status === "concluida" && "line-through opacity-60")}>
                          {tarefa.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quando(tarefa, hoje)}
                          {contexto(tarefa) ? ` · ${contexto(tarefa)}` : ""}
                          {tarefa.demonstracao ? " · Demonstração" : ""}
                        </p>
                      </button>
                      <span className="hidden text-xs sm:inline">
                        <span
                          className={cn(
                            "mr-1 inline-block h-2 w-2 rounded-full",
                            tarefa.prioridade === "alta" && "bg-red-500",
                            tarefa.prioridade === "media" && "bg-amber-500",
                            tarefa.prioridade === "baixa" && "bg-emerald-500",
                          )}
                        />
                        {PRIORIDADE_LABEL[tarefa.prioridade]}
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-[10px] font-medium">
                        {iniciais(tarefa.responsavel.name)}
                      </span>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <TarefasCalendario
              visao={visao}
              anchor={anchor}
              items={visiveis}
              onOpen={onOpen}
              onPickDay={(day) => {
                onAnchor(day);
                onVisao("dia");
              }}
            />
          )}
        </section>

        <aside className="space-y-3">
          <div className="rounded-2xl border bg-card p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>Seu calendário</span>
              <span className="text-xs font-normal text-muted-foreground">{monthLabel(hoje)}</span>
            </div>
            <TarefasCalendario
              visao="mes"
              anchor={hoje}
              items={abertas}
              onOpen={onOpen}
              onPickDay={(day) => {
                onAnchor(day);
                onVisao("dia");
              }}
            />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm font-medium">Agenda de hoje</p>
            <ul className="mt-3 space-y-3">
              {agendaHoje.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nada marcado para hoje.</li>
              ) : (
                agendaHoje.map((tarefa) => (
                  <li key={tarefa.id}>
                    <button type="button" className="text-left" onClick={() => onOpen(tarefa)}>
                      <p className="text-xs text-muted-foreground">{tarefa.horario ?? "—"}</p>
                      <p className="text-sm font-medium">{tarefa.titulo}</p>
                      <p className="text-xs text-muted-foreground">{contexto(tarefa)}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50">
            <p className="font-medium">Mais foco. Menos pendências.</p>
            <p className="mt-1 text-sm opacity-80">Pequenos passos hoje, grandes conquistas amanhã.</p>
            <p className="mt-3 text-xs">Progresso do dia</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900">
              <div className="h-full bg-emerald-600" style={{ width: `${progresso}%` }} />
            </div>
            <p className="mt-1 text-xs">{concluidas} concluídas neste painel</p>
          </div>
        </aside>
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
