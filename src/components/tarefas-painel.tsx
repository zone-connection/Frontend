import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Plus,
  Users,
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
import { AgendamentoTipoDot } from "@/components/agenda-tipo-option";
import { AGENDAMENTO_TIPO_LABEL } from "@/lib/agenda-api";
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

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

const TONS = {
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-card dark:border-sky-900/50 dark:from-sky-950/40",
    icon: "bg-sky-500 text-white",
    valor: "text-sky-700 dark:text-sky-300",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-card dark:border-violet-900/50 dark:from-violet-950/40",
    icon: "bg-violet-500 text-white",
    valor: "text-violet-700 dark:text-violet-300",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-card dark:border-rose-900/50 dark:from-rose-950/40",
    icon: "bg-rose-500 text-white",
    valor: "text-rose-700 dark:text-rose-300",
  },
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-card dark:border-emerald-900/50 dark:from-emerald-950/40",
    icon: "bg-emerald-500 text-white",
    valor: "text-emerald-700 dark:text-emerald-300",
  },
} as const;

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
  podeVerEquipe = false,
  verEquipe = false,
  usuarios = [],
  usuarioId = "",
  onVerEquipe,
  onUsuario,
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
  podeVerEquipe?: boolean;
  verEquipe?: boolean;
  usuarios?: { id: string; name: string }[];
  usuarioId?: string;
  onVerEquipe?: (ativo: boolean) => void;
  onUsuario?: (id: string) => void;
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
          <p className="text-sm font-medium text-primary">{saudacao()}</p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">
            {modo === "calendario" ? "Calendário" : modo === "lista" ? "Minhas tarefas" : "Visão geral"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {atrasadas > 0
              ? `${atrasadas} pendência${atrasadas === 1 ? "" : "s"} pedindo atenção. O resto do dia está no seu ritmo.`
              : "Um passo de cada vez. Tudo sob controle."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {podeVerEquipe ? (
            <Button
              type="button"
              variant={verEquipe ? "default" : "outline"}
              onClick={() => onVerEquipe?.(!verEquipe)}
            >
              <Users className="h-4 w-4" />
              {verEquipe ? "Minhas tarefas" : "Tarefas dos usuários"}
            </Button>
          ) : null}
          <Button className="shadow-md shadow-primary/20" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      {verEquipe ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3">
          <label className="text-sm font-medium" htmlFor="filtro-usuario-tarefa">
            Usuário
          </label>
          <select
            id="filtro-usuario-tarefa"
            className="h-10 min-w-56 rounded-md border bg-background px-3 text-sm"
            value={usuarioId}
            onChange={(event) => onUsuario?.(event.target.value)}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {modo === "calendario" ? null : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo tone="sky" icon={List} valor={hojeCount} titulo="Tarefas para hoje" detalhe="Seu foco para o dia" />
        <Resumo tone="violet" icon={CalendarDays} valor={proximas} titulo="Próximas tarefas" detalhe="O que vem pela frente" />
        <Resumo tone="rose" icon={Clock3} valor={atrasadas} titulo="Tarefas atrasadas" detalhe="Precisam da sua atenção" pulse={atrasadas > 0} />
        <Resumo tone="emerald" icon={CheckCircle2} valor={concluidas} titulo="Tarefas concluídas" detalhe="Cada conquista conta" />
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
                          "group flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                          atrasada && "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30",
                          tarefa.status === "concluida" && "opacity-80",
                        )}
                      >
                        <button
                          type="button"
                          aria-label="Concluir tarefa"
                          className={cn(
                            "h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/40 transition hover:scale-110 hover:border-emerald-500",
                            tarefa.status === "concluida" && "border-emerald-500 bg-emerald-500",
                          )}
                          onClick={() => onComplete(tarefa)}
                        />
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
                          <p className={cn("flex items-center gap-2 truncate font-medium", tarefa.status === "concluida" && "line-through opacity-60")}>
                            <AgendamentoTipoDot tipo={tarefa.tipo ?? "tarefa"} />
                            <span className="truncate">{tarefa.titulo}</span>
                            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                              {AGENDAMENTO_TIPO_LABEL[tarefa.tipo ?? "tarefa"]}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {quando(tarefa, hoje)}
                            {contexto(tarefa) ? `  ·  ${contexto(tarefa)}` : ""}
                          </p>
                        </button>
                        <span
                          className={cn(
                            "hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
                            tarefa.prioridade === "alta" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
                            tarefa.prioridade === "media" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
                            tarefa.prioridade === "baixa" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                          )}
                        >
                          {PRIORIDADE_LABEL[tarefa.prioridade]}
                        </span>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-[11px] font-semibold text-white shadow-sm">
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
            <ul className="mt-4 space-y-3">
              {agendaHoje.length === 0 ? (
                <li className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
                  Dia livre. Um bom momento para adiantar o que vem depois.
                </li>
              ) : (
                agendaHoje.map((tarefa) => (
                  <li key={tarefa.id}>
                    <button
                      type="button"
                      className="grid w-full grid-cols-[3.2rem_minmax(0,1fr)] gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-muted/70"
                      onClick={() => onOpen(tarefa)}
                    >
                      <p className="pt-0.5 text-xs font-medium text-primary">{tarefa.horario ?? "—"}</p>
                      <span className="min-w-0 border-l-2 border-primary/40 pl-2">
                        <span className="block text-sm font-medium leading-snug">{tarefa.titulo}</span>
                        <span className="block truncate text-xs text-muted-foreground">{contexto(tarefa)}</span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-500/20">
            <p className="font-medium">Mais foco. Menos pendências.</p>
            <p className="mt-1 text-sm text-emerald-50/90">
              Pequenos passos hoje, grandes conquistas amanhã.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span>Progresso do dia</span>
              <span className="font-semibold">{progresso}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
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
  tone,
  pulse,
}: {
  icon: typeof List;
  valor: number;
  titulo: string;
  detalhe: string;
  tone: keyof typeof TONS;
  pulse?: boolean;
}) {
  const cores = TONS[tone];
  return (
    <article
      className={cn(
        "rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        cores.card,
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{titulo}</span>
        <span className={cn("relative grid h-8 w-8 place-items-center rounded-xl", cores.icon)}>
          {pulse ? (
            <span className="absolute inset-0 animate-ping rounded-xl bg-rose-400/50" />
          ) : null}
          <Icon className="relative h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tabular-nums", cores.valor)}>
        {String(valor).padStart(2, "0")}
      </p>
      <p className="text-xs text-muted-foreground">{detalhe}</p>
    </article>
  );
}
