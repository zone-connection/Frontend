import { useMemo, useState } from "react";
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, FileText, Home, MoreHorizontal, Phone, UserRound, type LucideIcon } from "lucide-react";
import { PRIORIDADE_LABEL, type Tarefa, type TarefaEtiqueta } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

const PAGE = 10;

const ICONE: Record<TarefaEtiqueta, { icon: LucideIcon; well: string; barra: string; card: string }> = {
  ligacao: { icon: Phone, well: "bg-[#FFF1E8] text-[#F97316]", barra: "bg-[#F97316]", card: "bg-[#FFF8F3]" },
  cliente: { icon: CalendarDays, well: "bg-[#F3E8FF] text-[#7C3AED]", barra: "bg-[#7C3AED]", card: "bg-[#F8F5FF]" },
  documentos: { icon: FileText, well: "bg-[#E7F8EE] text-[#16A34A]", barra: "bg-[#16A34A]", card: "bg-[#F3FBF6]" },
  captacao: { icon: Building2, well: "bg-[#FFF6E0] text-[#D97706]", barra: "bg-[#F59E0B]", card: "bg-[#FFF9EE]" },
  followup: { icon: UserRound, well: "bg-[#E6F7F7] text-[#0F766E]", barra: "bg-[#14B8A6]", card: "bg-[#F2FBFA]" },
  interna: { icon: UserRound, well: "bg-[#F3E8FF] text-[#7C3AED]", barra: "bg-[#A855F7]", card: "bg-[#F8F5FF]" },
  contrato: { icon: FileText, well: "bg-[#FDECEC] text-[#E11D48]", barra: "bg-[#E11D48]", card: "bg-[#FFF5F6]" },
};

function iconeDa(tarefa: Tarefa) {
  if (tarefa.tipo === "visita") return { icon: Home, well: "bg-[#E7F1FF] text-[#2563EB]", barra: "bg-[#3B82F6]", card: "bg-[#F4F8FF]" };
  if (tarefa.tipo === "tarefa" && tarefa.etiqueta === "documentos") {
    return { icon: ClipboardList, well: "bg-[#E7F4FA] text-[#05749E]", barra: "bg-[#079ED4]", card: "bg-[#F3FAFD]" };
  }
  return ICONE[tarefa.etiqueta] ?? ICONE.documentos;
}

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("");
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-[#98A2B3]">
            <tr className="border-b border-[#F2F4F7]">
              <th className="w-10 px-3 py-3" />
              {["Tarefa", "Cliente / Lead", "Imóvel / Empreendimento", "Responsável", "Horário", "Prioridade", "Status", "Ações"].map((coluna) => (
                <th key={coluna} className="px-3 py-3 font-medium">{coluna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
      {fatia.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-3 py-10 text-center text-sm text-[#5C6B76]">Nenhuma tarefa neste recorte.</td>
          </tr>
        ) : (
          fatia.map((tarefa) => {
            const concluida = tarefa.status === "concluida";
            const cancelada = tarefa.status === "cancelada";
            const atrasada = tarefa.status === "aberta" && (tarefa.atrasada || tarefa.data < _hoje);
            const andamento = tarefa.status === "aberta" && tarefa.data === _hoje && !atrasada;
            const visual = iconeDa(tarefa);
            const Icone = visual.icon;
            const pessoa = tarefa.contexto.lead?.nome;
            const imovel = tarefa.contexto.imovel?.rotulo;
            const hora = horaDe(tarefa) === "99:99" ? null : horaDe(tarefa);
            const status = concluida
              ? { label: "Concluída", className: "bg-[#E7F8EF] text-[#067647]" }
              : cancelada
                ? { label: "Cancelada", className: "bg-[#F2F4F7] text-[#667085]" }
                : atrasada
                  ? { label: "Atrasada", className: "bg-[#FDECEC] text-[#B42318]" }
                  : andamento
                    ? { label: "Em andamento", className: "bg-[#FFF6E8] text-[#B54708]" }
                    : { label: "Pendente", className: "bg-[#E8F1FF] text-[#175CD3]" };
            const prioridade = {
              alta: "bg-[#FDECEC] text-[#D92D20]",
              media: "bg-[#FFF4E5] text-[#F79009]",
              baixa: "bg-[#E7F8EF] text-[#12B76A]",
            }[tarefa.prioridade];
            return (
              <tr key={tarefa.id} className="border-b border-[#F8FAFC] hover:bg-[#FAFBFC]">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
                    className={cn(
                      "grid size-4 place-items-center rounded border bg-white",
                      concluida ? "border-[#079ED4] bg-[#079ED4] text-white" : "border-[#D0D5DD]",
                    )}
                    onClick={() => onComplete(tarefa)}
                  >
                    {concluida ? <Check className="size-3" strokeWidth={3} /> : null}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <button type="button" className="flex min-w-[220px] items-start gap-3 text-left" onClick={() => onOpen(tarefa)}>
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", visual.well)}>
                      <Icone className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block truncate font-semibold text-[#101828]", cancelada && "line-through text-[#98A2B3]")}>{tarefa.titulo}</span>
                      {tarefa.descricao ? <span className="block truncate text-xs text-[#98A2B3]">{tarefa.descricao}</span> : null}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3">
                  {pessoa ? (
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-[#EEF2FF] text-[11px] font-semibold text-[#3538CD]">{iniciais(pessoa)}</span>
                      <span className="truncate text-[#344054]">{pessoa}</span>
                    </span>
                  ) : <span className="text-[#98A2B3]">—</span>}
                </td>
                <td className="max-w-48 px-3 py-3">
                  {imovel ? <span className="block truncate text-[#344054]">{imovel}</span> : <span className="text-[#98A2B3]">—</span>}
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-[#F2F4F7] text-[11px] font-semibold text-[#344054]">{iniciais(tarefa.responsavel.name)}</span>
                    <span className="truncate text-[#344054]">{tarefa.responsavel.name}</span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  {hora ? <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FB] px-2 py-1 text-xs text-[#667085]">{hora}</span> : <span className="text-[#98A2B3]">—</span>}
                </td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", prioridade)}>{PRIORIDADE_LABEL[tarefa.prioridade]}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>{status.label}</span>
                </td>
                <td className="relative px-3 py-3">
                  <button
                    type="button"
                    aria-label="Ações da tarefa"
                    className="grid size-8 place-items-center rounded-lg text-[#98A2B3] hover:bg-[#F8FAFC]"
                    onClick={() => setMenu(menu === tarefa.id ? null : tarefa.id)}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menu === tarefa.id ? (
                    <div className="absolute right-3 z-10 mt-1 w-36 rounded-xl border border-[#E2E8EC] bg-white p-1 shadow-lg">
                      <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-[#F8FAFC]" onClick={() => { setMenu(null); onEdit(tarefa); }}>Editar</button>
                      <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-[#B42318] hover:bg-[#FEF3F2]" onClick={() => { setMenu(null); onDelete(tarefa); }}>Excluir</button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })
        )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2">
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
