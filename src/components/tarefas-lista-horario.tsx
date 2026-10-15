import { useMemo, useState } from "react";
import { Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FileText, Home, MoreHorizontal, Phone, UserRound, type LucideIcon } from "lucide-react";
import { PRIORIDADE_LABEL, type Tarefa, type TarefaEtiqueta } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

const PAGE = 10;

const ICONE: Record<TarefaEtiqueta, { icon: LucideIcon; well: string }> = {
  ligacao: { icon: Phone, well: "bg-[#FFF1E8] text-[#F97316]" },
  cliente: { icon: CalendarDays, well: "bg-[#F3E8FF] text-[#7C3AED]" },
  documentos: { icon: FileText, well: "bg-[#E7F8EE] text-[#16A34A]" },
  captacao: { icon: Building2, well: "bg-[#FFF6E0] text-[#F59E0B]" },
  followup: { icon: UserRound, well: "bg-[#E7F8EE] text-[#16A34A]" },
  interna: { icon: UserRound, well: "bg-[#F3E8FF] text-[#7C3AED]" },
  contrato: { icon: FileText, well: "bg-[#FDECEC] text-[#E11D48]" },
};

function iconeDa(tarefa: Tarefa) {
  if (tarefa.tipo === "visita") return { icon: Home, well: "bg-[#E7F1FF] text-[#3B82F6]" };
  if (tarefa.tipo === "tarefa" && tarefa.etiqueta === "documentos") {
    return { icon: ClipboardList, well: "bg-[#E7F1FF] text-[#3B82F6]" };
  }
  return ICONE[tarefa.etiqueta] ?? ICONE.documentos;
}

function horaDe(tarefa: Tarefa) {
  return tarefa.horario?.slice(0, 5) || "99:99";
}

export function ListaPorHorario({
  hoje: _hoje,
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
          fatia.map((tarefa) => {
            const concluida = tarefa.status === "concluida";
            const cancelada = tarefa.status === "cancelada";
            const marcada = concluida || tarefa.id === "mock-1";
            const visual = iconeDa(tarefa);
            const Icone = visual.icon;
            return (
              <li key={tarefa.id} className="flex items-center gap-3 border-b border-[#F1F4F7] py-3">
                <button
                  type="button"
                  aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-[4px] border",
                    marcada ? "border-[#079ED4] bg-[#079ED4] text-white" : "border-[#D5DEE7] bg-white",
                  )}
                  onClick={() => onComplete(tarefa)}
                >
                  {marcada ? <Check className="size-3" strokeWidth={3} /> : null}
                </button>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", visual.well)}>
                  <Icone className="size-[18px]" />
                </span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
                  <p className={cn("truncate text-[15px] font-semibold text-[#16324A]", cancelada && "text-[#8B98A3] line-through")}>
                    {tarefa.titulo}
                  </p>
                  {tarefa.descricao ? <p className="truncate text-[13px] text-[#98A2B3]">{tarefa.descricao}</p> : null}
                  <span className="sr-only">{PRIORIDADE_LABEL[tarefa.prioridade]}</span>
                </button>
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
                        <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[#F3FAFD]" onClick={() => { setMenu(null); onEdit(tarefa); }}>
                          Editar
                        </button>
                        <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-[#B42318] hover:bg-[#FEF3F2]" onClick={() => { setMenu(null); onDelete(tarefa); }}>
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </div>
              </li>
            );
          })
        )}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#98A2B3]">
          Mostrando {fatia.length} de {ordenadas.length} tarefas
        </p>
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
                numero === atual ? "bg-[#079ED4] text-white" : "border border-[#E6EBF0] text-[#667085]",
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
