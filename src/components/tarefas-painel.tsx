import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  ListTodo,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiltroSelectNativo } from "@/components/filtros-painel";
import {
  addDays,
  hojeYmd,
  monthLabel,
  shiftMonth,
  startOfWeek,
  type TarefaVisao,
} from "@/components/tarefas-calendario";
import { TarefasAgendaPainel } from "@/components/tarefas-agenda-painel";
import { ListaPorHorario } from "@/components/tarefas-lista-horario";
import { dashCardTone, type FinanceKpiTone } from "@/components/finance-kpi-card";
import { BRAND_GRADIENT_BTN } from "@/lib/brand-gradient";
import { type Tarefa, type TarefaFiltro } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

const PERIODOS: { id: TarefaVisao; label: string }[] = [
  { id: "lista", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function contexto(tarefa: Tarefa) {
  if (tarefa.contexto.lead) return `Lead: ${tarefa.contexto.lead.nome}`;
  if (tarefa.contexto.imovel) return `Imóvel: ${tarefa.contexto.imovel.rotulo}`;
  if (tarefa.contexto.atendimento) {
    return tarefa.contexto.atendimento.titulo;
  }
  return null;
}

function quando(tarefa: Tarefa, hoje: string) {
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

const TONS = {
  sky: {
    card: "border-[#9DCEF5] bg-gradient-to-br from-[#D3ECFE] to-[#F4F9FE] dark:border-[#2E90FA]/40 dark:from-[#13283a] dark:to-[#141a22]",
    icon: "bg-[#2E90FA] text-white shadow-[0_6px_14px_rgba(46,144,250,0.35)]",
    valor: "text-[#175CD3] dark:text-[#7DD3FC]",
  },
  violet: {
    card: "border-[#D0BEF5] bg-gradient-to-br from-[#E6DBFF] to-[#F8F5FF] dark:border-[#875BF7]/40 dark:from-[#261838] dark:to-[#141a22]",
    icon: "bg-[#875BF7] text-white shadow-[0_6px_14px_rgba(135,91,247,0.35)]",
    valor: "text-[#6927DA] dark:text-[#C4B5FD]",
  },
  rose: {
    card: "border-[#F5B8C4] bg-gradient-to-br from-[#FFD6DE] to-[#FFF6F7] dark:border-[#F04464]/40 dark:from-[#3a1822] dark:to-[#141a22]",
    icon: "bg-[#F04464] text-white shadow-[0_6px_14px_rgba(240,68,100,0.35)]",
    valor: "text-[#C01048] dark:text-[#FDA4AF]",
  },
  emerald: {
    card: "border-[#8ED9B0] bg-gradient-to-br from-[#CFF6E0] to-[#F3FBF6] dark:border-[#12B76A]/40 dark:from-[#123528] dark:to-[#141a22]",
    icon: "bg-[#12B76A] text-white shadow-[0_6px_14px_rgba(18,183,106,0.35)]",
    valor: "text-[#067647] dark:text-[#6EE7B7]",
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
  onEdit,
  onDelete,
  onComplete,
  onCreate,
  onCreateSlot,
  modo = "geral",
  podeVerEquipe = false,
  verEquipe = false,
  usuarios = [],
  usuarioId = "",
  onVerEquipe,
  onUsuario,
}: {
  items: Tarefa[];
  filtro: TarefaFiltro;
  visao: TarefaVisao;
  anchor: string;
  onFiltro: (filtro: TarefaFiltro) => void;
  onVisao: (visao: TarefaVisao) => void;
  onAnchor: (ymd: string) => void;
  onOpen: (tarefa: Tarefa) => void;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onComplete: (tarefa: Tarefa) => void;
  onCreate: () => void;
  onCreateSlot?: (ymd: string, hour?: number) => void;
  modo?: "geral" | "lista" | "calendario";
  podeVerEquipe?: boolean;
  verEquipe?: boolean;
  usuarios?: { id: string; name: string }[];
  usuarioId?: string;
  onVerEquipe?: (ativo: boolean) => void;
  onUsuario?: (id: string) => void;
}) {
  const hoje = hojeYmd();
  const [recorte, setRecorte] = useState<"dia" | "pendentes" | "andamento" | "concluidas" | "atrasadas">("dia");
  const [ordem, setOrdem] = useState<"proximas" | "distantes" | "prioridade">("proximas");
  const [busca, setBusca] = useState("");
  const [prioridade, setPrioridade] = useState("todas");
  const [responsavelId, setResponsavelId] = useState("");
  const dia = anchor || hoje;
  const abertas = items.filter((item) => item.status === "aberta");
  const hojeCount = abertas.filter((item) => item.data === hoje).length;
  const proximas = abertas.filter((item) => item.data > hoje).length;
  const atrasadas = abertas.filter((item) => item.atrasada || item.data < hoje).length;
  const andamento = abertas.filter((item) => item.data === dia && !(item.atrasada || item.data < hoje)).length;
  const concluidasHoje = items.filter((item) => item.status === "concluida" && item.data === hoje).length;
  const listaDia = items.filter((item) => {
    if (recorte === "pendentes") return item.status === "aberta" && item.data > hoje;
    if (recorte === "andamento") return item.status === "aberta" && item.data === dia;
    if (recorte === "concluidas") return item.status === "concluida" && item.data === hoje;
    if (recorte === "atrasadas") return item.status === "aberta" && (item.atrasada || item.data < hoje);
    return item.data === dia && item.status !== "cancelada";
  }).filter((item) => {
    const texto = `${item.titulo} ${item.descricao} ${item.contexto.lead?.nome ?? ""} ${item.contexto.imovel?.rotulo ?? ""}`.toLocaleLowerCase("pt-BR");
    if (busca.trim() && !texto.includes(busca.trim().toLocaleLowerCase("pt-BR"))) return false;
    if (prioridade !== "todas" && item.prioridade !== prioridade) return false;
    if (responsavelId && item.responsavel.id !== responsavelId) return false;
    return true;
  });
  const responsaveis = [...new Map(items.map((item) => [item.responsavel.id, item.responsavel])).values()];
  const concluidas = items.filter((item) => item.status === "concluida").length;
  const canceladas = items.filter((item) => item.status === "cancelada").length;
  const counts: Record<TarefaFiltro, number> = {
    todas: items.filter((item) => item.status !== "cancelada").length,
    hoje: hojeCount,
    proximas,
    atrasadas,
    concluidas,
    canceladas,
  };

  const visiveis = items.filter((item) => {
    if (filtro === "canceladas") return item.status === "cancelada";
    if (item.status === "cancelada") return false;
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
    {
      titulo: "Canceladas",
      items: visiveis.filter((item) => item.status === "cancelada"),
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
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent">
            <ListTodo className="size-4" />
            Tarefas
          </p>
          <h1 className="mt-1 text-[32px] font-semibold tracking-tight text-foreground">
            {modo === "calendario" ? "Calendário" : modo === "lista" ? "Minhas tarefas" : "Visão geral"}
          </h1>
          <p className="mt-1 text-sm text-[#5C6B76]">
            Organize seus compromissos e acompanhe suas prioridades.
          </p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#98A2B3]">
            <span className="size-2 rounded-full bg-[#12B76A]" />
            {atrasadas > 0
              ? `${atrasadas} pendência${atrasadas === 1 ? "" : "s"} pedindo atenção. O resto do dia está no seu ritmo.`
              : "Nenhuma pendência atrasada. O resto do dia está no seu ritmo."}
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
          <Button className={cn("h-11 rounded-xl px-4", BRAND_GRADIENT_BTN)} onClick={onCreate}>
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
          <FiltroSelectNativo
            id="filtro-usuario-tarefa"
            className="min-w-56"
            value={usuarioId}
            onChange={(event) => onUsuario?.(event.target.value)}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.name}
              </option>
            ))}
          </FiltroSelectNativo>
        </div>
      ) : null}

      {visao === "lista" || visao === "dia" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoResumo ativo={recorte === "pendentes"} icon={Clock3} tom="blue" valor={proximas} titulo="Pendentes" onClick={() => setRecorte(recorte === "pendentes" ? "dia" : "pendentes")} />
          <CartaoResumo ativo={recorte === "andamento"} icon={Clock3} tom="teal" valor={andamento} titulo="Em andamento" onClick={() => setRecorte(recorte === "andamento" ? "dia" : "andamento")} />
          <CartaoResumo ativo={recorte === "concluidas"} icon={CheckCircle2} tom="emerald" valor={concluidasHoje} titulo="Concluídas hoje" onClick={() => setRecorte(recorte === "concluidas" ? "dia" : "concluidas")} />
          <CartaoResumo ativo={recorte === "atrasadas"} icon={CalendarDays} tom="rose" valor={atrasadas} titulo="Atrasadas" onClick={() => setRecorte(recorte === "atrasadas" ? "dia" : "atrasadas")} />
        </div>
      ) : null}

      {visao === "semana" ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Resumo tone="sky" icon={List} valor={hojeCount} titulo="Tarefas para hoje" detalhe="Seu foco para o dia" />
        <Resumo tone="violet" icon={CalendarDays} valor={proximas} titulo="Próximas tarefas" detalhe="O que vem pela frente" />
        <Resumo tone="rose" icon={Clock3} valor={atrasadas} titulo="Tarefas atrasadas" detalhe="Precisam da sua atenção" pulse={atrasadas > 0} />
        <Resumo tone="emerald" icon={CheckCircle2} valor={concluidas} titulo="Tarefas concluídas" detalhe="Cada conquista conta" />
      </div>
      ) : null}

      <div className={cn("grid items-start gap-5", modo !== "lista" && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <section className="min-w-0 rounded-2xl border border-[#EEF2F6] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#F2F4F7] px-3 py-3">
            <div className="flex gap-1">
            {PERIODOS.map((item) => {
              const ativo = visao === item.id || (item.id === "lista" && visao === "dia");
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                    ativo
                      ? "bg-[#079ED4] text-white shadow-sm"
                      : "bg-secondary text-muted-foreground hover:bg-accent",
                  )}
                  onClick={() => {
                    onVisao(item.id);
                    if (item.id === "lista") {
                      onAnchor(hoje);
                      setRecorte("dia");
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            </div>
            {visao === "lista" || visao === "dia" ? (
              <label className="inline-flex items-center gap-2 rounded-lg border border-[#E6EBF0] bg-white px-3 py-2 text-sm text-[#344054]">
                <CalendarDays className="size-4 text-[#98A2B3]" />
                <input
                  type="date"
                  className="bg-transparent outline-none"
                  value={dia}
                  onChange={(event) => event.target.value && onAnchor(event.target.value)}
                  aria-label="Data das tarefas"
                />
              </label>
            ) : null}
            {visao === "lista" || visao === "dia" ? (
              <>
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar tarefa..."
                  className="h-10 min-w-40 flex-1 rounded-lg border border-[#E6EBF0] px-3 text-sm outline-none"
                />
                <select className="h-10 rounded-lg border border-[#E6EBF0] bg-white px-2 text-sm text-[#344054]" value={recorte} onChange={(event) => setRecorte(event.target.value as typeof recorte)} aria-label="Status">
                  <option value="dia">Status</option>
                  <option value="pendentes">Pendentes</option>
                  <option value="andamento">Em andamento</option>
                  <option value="concluidas">Concluídas hoje</option>
                  <option value="atrasadas">Atrasadas</option>
                </select>
                <select className="h-10 rounded-lg border border-[#E6EBF0] bg-white px-2 text-sm text-[#344054]" value={prioridade} onChange={(event) => setPrioridade(event.target.value)} aria-label="Prioridade">
                  <option value="todas">Prioridade</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
                <select className="h-10 rounded-lg border border-[#E6EBF0] bg-white px-2 text-sm text-[#344054]" value={responsavelId} onChange={(event) => setResponsavelId(event.target.value)} aria-label="Responsável">
                  <option value="">Responsável</option>
                  {responsaveis.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>{pessoa.name}</option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1 text-sm text-[#667085]">
                  Ordenar por:
                  <select className="h-10 rounded-lg border border-[#E6EBF0] bg-white px-2 font-medium text-[#16324A]" value={ordem} onChange={(event) => setOrdem(event.target.value as typeof ordem)}>
                    <option value="proximas">Mais próximas</option>
                    <option value="distantes">Mais distantes</option>
                    <option value="prioridade">Prioridade</option>
                  </select>
                </label>
              </>
            ) : null}
          </div>

          {visao === "lista" || visao === "dia" ? null : (
          <div className="flex items-center justify-end gap-1 px-5 py-4 text-sm">
                <Button size="icon" variant="ghost" onClick={() => onAnchor(visao === "mes" ? shiftMonth(anchor, -1) : addDays(anchor, -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-36 text-center font-medium">
                  {monthLabel(anchor)}
                </span>
                <Button size="icon" variant="ghost" onClick={() => onAnchor(visao === "mes" ? shiftMonth(anchor, 1) : addDays(anchor, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
          </div>
          )}

          <div className="space-y-6 px-5 pb-5">
            {visao === "semana" || visao === "mes" ? (
              <TarefasAgendaPainel
                compacto
                visaoInicial={visao === "mes" ? "mes" : "semana"}
                anchorYmd={anchor}
                onAnchorYmd={onAnchor}
                onCreateAt={(day, hour) => {
                  const y = day.getFullYear();
                  const m = String(day.getMonth() + 1).padStart(2, "0");
                  const d = String(day.getDate()).padStart(2, "0");
                  onCreateSlot?.([y, m, d].join("-"), hour);
                }}
              />
            ) : (
              <ListaPorHorario
                hoje={dia}
                items={listaDia}
                ordem={ordem}
                onOrdem={setOrdem}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
                onComplete={onComplete}
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

function CartaoResumo({
  icon: Icon,
  valor,
  titulo,
  tom,
  ativo,
  onClick,
}: {
  icon: typeof List;
  valor: number;
  titulo: string;
  tom: FinanceKpiTone;
  ativo: boolean;
  onClick: () => void;
}) {
  const paint = dashCardTone(tom);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col rounded-xl border px-3.5 py-3 text-left",
        paint.card,
        ativo && "ring-2 ring-[#079ED4]/45",
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", paint.disc)}>
          <Icon className="size-4" />
        </span>
        <span className={cn("text-[13px]", paint.label)}>{titulo}</span>
      </span>
      <span className={cn("mt-2 text-[22px] font-semibold leading-none tracking-tight tabular-nums", paint.ink)}>
        {valor.toLocaleString("pt-BR")}
      </span>
    </button>
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
        "rounded-xl border px-3.5 py-3",
        cores.card,
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{titulo}</span>
        <span className={cn("relative grid size-9 place-items-center rounded-full", cores.icon)}>
          {pulse ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/40" />
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
