import { useState } from "react";
import { Building2, ChevronLeft, ChevronRight, MoreHorizontal, UserRound } from "lucide-react";
import { AGENDAMENTO_TIPO_LABEL } from "@/lib/agenda-api";
import { PRIORIDADE_LABEL, type Tarefa } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

const PAGE = 8;

const TIPO_CHIP: Record<string, string> = {
  visita: "bg-[#E7F4FA] text-[#05749E]",
  ligacao: "bg-[#EDE9FE] text-[#6D28D9]",
  reuniao: "bg-[#E0E7FF] text-[#3730A3]",
  tarefa: "bg-[#F1F5F9] text-[#475569]",
  followup: "bg-[#D1FAE5] text-[#047857]",
  documentos: "bg-[#DCFCE7] text-[#15803D]",
  captacao: "bg-[#FEF3C7] text-[#B45309]",
  interna: "bg-[#F3E8FF] text-[#7E22CE]",
  contrato: "bg-[#FCE7F3] text-[#BE185D]",
  bloqueio: "bg-[#F1F5F9] text-[#475569]",
  retirada_chave: "bg-[#FFEDD5] text-[#C2410C]",
};

function horaDe(tarefa: Tarefa) {
  return tarefa.horario?.slice(0, 5) || "—";
}

function quandoCurto(tarefa: Tarefa, dia: string) {
  const rotulo = tarefa.data === dia ? "Hoje" : `${tarefa.data.slice(8)}/${tarefa.data.slice(5, 7)}`;
  return `${rotulo} · ${horaDe(tarefa)}`;
}

export function ListaPorHorario({
  hoje,
  items,
  onOpen,
  onEdit,
  onDelete,
  onComplete,
}: {
  hoje: string;
  items: Tarefa[];
  onOpen: (tarefa: Tarefa) => void;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onComplete: (tarefa: Tarefa) => void;
  onCreateSlot?: (ymd: string, hour?: number) => void;
}) {
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);
  const ordenadas = [...items].sort((a, b) => horaDe(a).localeCompare(horaDe(b)));
  const pages = Math.max(1, Math.ceil(ordenadas.length / PAGE));
  const atual = Math.min(page, pages);
  const fatia = ordenadas.slice((atual - 1) * PAGE, atual * PAGE);

  return (
    <div>
      <ul className="divide-y divide-[#E6EDF2]">
        {fatia.length === 0 ? (
          <li className="px-2 py-10 text-center text-sm text-[#5C6B76]">Nenhuma tarefa neste recorte.</li>
        ) : (
          fatia.map((tarefa) => {
            const concluida = tarefa.status === "concluida";
            const cancelada = tarefa.status === "cancelada";
            const pessoa = tarefa.contexto.lead?.nome;
            const imovel = tarefa.contexto.imovel?.rotulo;
            return (
              <li key={tarefa.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3">
                <span className="text-sm font-medium tabular-nums text-[#8B98A3]">{horaDe(tarefa)}</span>
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                      concluida ? "border-[#12B76A] bg-[#12B76A] text-white" : "border-[#D5DEE5] bg-white",
                    )}
                    onClick={() => onComplete(tarefa)}
                  >
                    {concluida ? <span className="text-[11px] leading-none">✓</span> : null}
                  </button>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
                    <p className={cn("truncate text-sm font-semibold text-[#0B3148]", concluida && "text-[#067647]", cancelada && "text-[#8B98A3] line-through")}>
                      {tarefa.titulo}
                      {cancelada ? <span className="ml-2 text-[11px] font-medium no-underline">Cancelada</span> : null}
                    </p>
                    {tarefa.descricao ? (
                      <p className="truncate text-xs text-[#8B98A3]">{tarefa.descricao}</p>
                    ) : null}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", TIPO_CHIP[tarefa.tipo] ?? TIPO_CHIP.tarefa)}>
                    {AGENDAMENTO_TIPO_LABEL[tarefa.tipo] ?? "Tarefa"}
                  </span>
                  {pessoa ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#5C6B76]">
                      <UserRound className="size-3.5 text-[#079ED4]" />
                      {pessoa}
                    </span>
                  ) : null}
                  {imovel ? (
                    <span className="inline-flex max-w-40 items-center gap-1 truncate text-xs text-[#5C6B76]">
                      <Building2 className="size-3.5 shrink-0 text-[#079ED4]" />
                      <span className="truncate">{imovel}</span>
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      tarefa.atrasada ? "bg-[#FEE4E2] text-[#B42318]" : "bg-[#FFF4ED] text-[#C4320A]",
                    )}
                  >
                    {quandoCurto(tarefa, hoje)}
                  </span>
                  <span className="sr-only">{PRIORIDADE_LABEL[tarefa.prioridade]}</span>
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Ações da tarefa"
                      className="grid size-8 place-items-center rounded-lg text-[#5C6B76] hover:bg-[#F3FAFD]"
                      onClick={() => setMenu(menu === tarefa.id ? null : tarefa.id)}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                    {menu === tarefa.id ? (
                      <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-[#E2E8EC] bg-white p-1 shadow-lg">
                        <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[#F3FAFD]" onClick={() => { setMenu(null); onEdit(tarefa); }}>
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF2] pt-3">
        <div className="flex flex-wrap gap-3 text-[11px] text-[#5C6B76]">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F04464]" /> Alta prioridade</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F79009]" /> Média prioridade</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#12B76A]" /> Baixa prioridade</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#E2E8EC] text-[#5C6B76]" onClick={() => setPage(Math.max(1, atual - 1))} aria-label="Página anterior">
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pages }, (_, index) => index + 1).slice(0, 5).map((numero) => (
            <button
              key={numero}
              type="button"
              className={cn(
                "grid size-8 place-items-center rounded-lg text-sm",
                numero === atual ? "bg-[#079ED4] text-white" : "text-[#5C6B76] hover:bg-[#F3FAFD]",
              )}
              onClick={() => setPage(numero)}
            >
              {numero}
            </button>
          ))}
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#E2E8EC] text-[#5C6B76]" onClick={() => setPage(Math.min(pages, atual + 1))} aria-label="Próxima página">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
