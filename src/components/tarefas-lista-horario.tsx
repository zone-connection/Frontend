import { useMemo, useState } from "react";
import { Building2, Check, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, UserRound } from "lucide-react";
import { AGENDAMENTO_TIPO_LABEL } from "@/lib/agenda-api";
import { SELO_MOCK } from "@/lib/tarefas-mock";
import { PRIORIDADE_LABEL, type Tarefa } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

const PAGE = 7;

const TIPO_CHIP: Record<string, { label: string; className: string }> = {
  visita: { label: "Captação", className: "bg-[#FFF4D6] text-[#C8890A]" },
  ligacao: { label: "Ligação", className: "bg-[#E7F0FF] text-[#3B6FD8]" },
  reuniao: { label: "Cliente", className: "bg-[#EEE8FF] text-[#6D5BD0]" },
  tarefa: { label: "Documentos", className: "bg-[#E5F8EA] text-[#3C9A57]" },
  outro: { label: "Contrato", className: "bg-[#FDE8EF] text-[#D4537E]" },
  bloqueio: { label: "Interna", className: "bg-[#F3E8FF] text-[#7E22CE]" },
  retirada_chave: { label: "Follow-up", className: "bg-[#E6F8F8] text-[#0F8A8A]" },
};

function horaDe(tarefa: Tarefa) {
  return tarefa.horario?.slice(0, 5) || "99:99";
}

function quandoCurto(tarefa: Tarefa, dia: string) {
  const rotulo = tarefa.data === dia ? "Hoje" : `${tarefa.data.slice(8)}/${tarefa.data.slice(5, 7)}`;
  return `${rotulo} · ${horaDe(tarefa) === "99:99" ? "—" : horaDe(tarefa)}`;
}

function selo(tarefa: Tarefa) {
  return (
    SELO_MOCK[tarefa.id] ?? {
      label: TIPO_CHIP[tarefa.tipo]?.label ?? AGENDAMENTO_TIPO_LABEL[tarefa.tipo] ?? "Tarefa",
      className: TIPO_CHIP[tarefa.tipo]?.className ?? "bg-[#F4F6F8] text-[#5C6B76]",
    }
  );
}

export function ListaPorHorario({
  hoje,
  items,
  ordem,
  onOrdem,
  onOpen,
  onEdit,
  onDelete,
  onComplete,
}: {
  hoje: string;
  items: Tarefa[];
  ordem: "proximas" | "distantes" | "prioridade";
  onOrdem: (ordem: "proximas" | "distantes" | "prioridade") => void;
  onOpen: (tarefa: Tarefa) => void;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onComplete: (tarefa: Tarefa) => void;
}) {
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);
  const peso = { alta: 0, media: 1, baixa: 2 };
  const ordenadas = useMemo(() => {
    const copia = [...items];
    if (ordem === "prioridade") {
      copia.sort((a, b) => peso[a.prioridade] - peso[b.prioridade] || horaDe(a).localeCompare(horaDe(b)));
    } else if (ordem === "distantes") {
      copia.sort((a, b) => horaDe(b).localeCompare(horaDe(a)));
    } else {
      copia.sort((a, b) => horaDe(a).localeCompare(horaDe(b)));
    }
    return copia;
  }, [items, ordem]);
  const pages = Math.max(1, Math.ceil(ordenadas.length / PAGE));
  const atual = Math.min(page, pages);
  const fatia = ordenadas.slice((atual - 1) * PAGE, atual * PAGE);

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-3 text-sm text-[#8B98A3]">
        <span>{fatia.length} tarefas</span>
        <label className="inline-flex items-center gap-1 rounded-xl border border-[#EEF1F4] bg-white px-3 py-1.5 text-[#5C6B76]">
          Ordenar por:
          <select
            className="bg-transparent font-medium text-[#16324A] outline-none"
            value={ordem}
            onChange={(event) => {
              setPage(1);
              onOrdem(event.target.value as "proximas" | "distantes" | "prioridade");
            }}
          >
            <option value="proximas">Mais próximas</option>
            <option value="distantes">Mais distantes</option>
            <option value="prioridade">Prioridade</option>
          </select>
          <ChevronDown className="size-3.5" />
        </label>
      </div>
      <ul>
        {fatia.length === 0 ? (
          <li className="px-2 py-10 text-center text-sm text-[#5C6B76]">Nenhuma tarefa neste recorte.</li>
        ) : (
          fatia.map((tarefa, index) => {
            const concluida = tarefa.status === "concluida";
            const cancelada = tarefa.status === "cancelada";
            const marcada = concluida || tarefa.id === "mock-1";
            const pessoa = tarefa.contexto.lead?.nome;
            const imovel = tarefa.contexto.imovel?.rotulo;
            const tag = selo(tarefa);
            return (
              <li
                key={tarefa.id}
                className={cn(
                  "grid grid-cols-[4.2rem_minmax(0,1fr)] items-center gap-2 border-b border-[#F1F4F7] py-3.5 lg:grid-cols-[4.2rem_minmax(16rem,1fr)_auto]",
                  index === 0 && atual === 1 && "border-l-[3px] border-l-[#F97316] pl-3",
                )}
              >
                <span className="text-sm tabular-nums text-[#A0AAB4]">{horaDe(tarefa) === "99:99" ? "—" : horaDe(tarefa)}</span>
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
                    className={cn(
                      "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border",
                      marcada ? "border-[#F97316] bg-[#F97316] text-white" : "border-[#E4E8ED] bg-white",
                    )}
                    onClick={() => onComplete(tarefa)}
                  >
                    {marcada ? <Check className="size-3" strokeWidth={3} /> : null}
                  </button>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
                    <p className={cn("truncate text-[15px] font-semibold text-[#1E293B]", cancelada && "text-[#8B98A3] line-through")}>
                      {tarefa.titulo}
                    </p>
                    {tarefa.descricao ? <p className="truncate text-[13px] text-[#98A2B0]">{tarefa.descricao}</p> : null}
                    <span className="sr-only">{PRIORIDADE_LABEL[tarefa.prioridade]}</span>
                  </button>
                </div>
                <div className="col-span-2 flex flex-wrap items-center justify-end gap-3 pl-16 lg:col-span-1 lg:pl-0">
                  <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium", tag.className)}>{tag.label}</span>
                  {pessoa ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#667085]">
                      <UserRound className="size-3.5 text-[#98A2B3]" />
                      {pessoa}
                    </span>
                  ) : null}
                  {imovel ? (
                    <span className="inline-flex max-w-44 items-center gap-1.5 text-[13px] text-[#667085]">
                      <Building2 className="size-3.5 shrink-0 text-[#98A2B3]" />
                      <span className="truncate">{imovel}</span>
                    </span>
                  ) : null}
                  <span className="rounded-full bg-[#FFF1E8] px-2.5 py-1 text-[12px] font-medium text-[#F97316]">
                    {quandoCurto(tarefa, hoje)}
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Ações da tarefa"
                      className="grid size-8 place-items-center rounded-lg text-[#98A2B3] hover:bg-[#F8FAFC]"
                      onClick={() => setMenu(menu === tarefa.id ? null : tarefa.id)}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                    {menu === tarefa.id ? (
                      <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-[#E2E8EC] bg-white p-1 shadow-lg">
                        <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[#FFF7F2]" onClick={() => { setMenu(null); onEdit(tarefa); }}>
                          Editar
                        </button>
                        <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-[#B42318] hover:bg-[#FEF3F2]" onClick={() => { setMenu(null); onDelete(tarefa); }}>
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-[12px] text-[#98A2B3]">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F04438]" /> Alta prioridade</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F79009]" /> Média prioridade</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#12B76A]" /> Baixa prioridade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#E6EBF0] text-[#98A2B3]" onClick={() => setPage(Math.max(1, atual - 1))} aria-label="Página anterior">
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pages }, (_, index) => index + 1).slice(0, 5).map((numero) => (
            <button
              key={numero}
              type="button"
              className={cn(
                "grid size-8 place-items-center rounded-lg text-sm",
                numero === atual ? "bg-[#F97316] text-white" : "border border-[#E6EBF0] text-[#667085]",
              )}
              onClick={() => setPage(numero)}
            >
              {numero}
            </button>
          ))}
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#E6EBF0] text-[#98A2B3]" onClick={() => setPage(Math.min(pages, atual + 1))} aria-label="Próxima página">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
