import { Pencil, Trash2 } from "lucide-react";
import { AgendamentoTipoDot } from "@/components/agenda-tipo-option";
import { AGENDAMENTO_TIPO_LABEL } from "@/lib/agenda-api";
import { PRIORIDADE_LABEL, type Tarefa } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

const HORAS = Array.from({ length: 13 }, (_, index) => index + 7);

function horaDe(tarefa: Tarefa) {
  const hora = Number((tarefa.horario ?? "").slice(0, 2));
  return Number.isFinite(hora) ? hora : null;
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export function ListaPorHorario({
  hoje,
  items,
  onOpen,
  onEdit,
  onDelete,
  onComplete,
  onCreateSlot,
}: {
  hoje: string;
  items: Tarefa[];
  onOpen: (tarefa: Tarefa) => void;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onComplete: (tarefa: Tarefa) => void;
  onCreateSlot?: (ymd: string, hour?: number) => void;
}) {
  const semHora = items.filter((item) => horaDe(item) == null);
  const faixas = HORAS.map((hora) => ({
    hora,
    items: items
      .filter((item) => horaDe(item) === hora)
      .sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? "")),
  }));

  return (
    <div className="divide-y divide-[#E6EDF2]">
      {semHora.length > 0 ? (
        <Faixa
          rotulo="Sem horário"
          items={semHora}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
        />
      ) : null}
      {faixas.map((faixa) => (
        <button
          key={faixa.hora}
          type="button"
          className="flex w-full gap-3 px-1 py-2 text-left hover:bg-[#F3FAFD]"
          onClick={() => onCreateSlot?.(hoje, faixa.hora)}
        >
          <span className="w-12 shrink-0 pt-1 text-xs font-medium tabular-nums text-[#5C6B76]">
            {String(faixa.hora).padStart(2, "0")}:00
          </span>
          <span className="min-w-0 flex-1 space-y-1.5">
            {faixa.items.length === 0 ? (
              <span className="block py-1 text-xs text-[#9AA8B2]">Livre</span>
            ) : (
              faixa.items.map((tarefa) => (
                <Linha
                  key={tarefa.id}
                  tarefa={tarefa}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onComplete={onComplete}
                />
              ))
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function Faixa({
  rotulo,
  items,
  onOpen,
  onEdit,
  onDelete,
  onComplete,
}: {
  rotulo: string;
  items: Tarefa[];
  onOpen: (tarefa: Tarefa) => void;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onComplete: (tarefa: Tarefa) => void;
}) {
  return (
    <div className="flex gap-3 px-1 py-2">
      <span className="w-12 shrink-0 pt-2 text-[11px] font-medium text-[#5C6B76]">{rotulo}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {items.map((tarefa) => (
          <Linha
            key={tarefa.id}
            tarefa={tarefa}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
          />
        ))}
      </div>
    </div>
  );
}

function Linha({
  tarefa,
  onOpen,
  onEdit,
  onDelete,
  onComplete,
}: {
  tarefa: Tarefa;
  onOpen: (tarefa: Tarefa) => void;
  onEdit: (tarefa: Tarefa) => void;
  onDelete: (tarefa: Tarefa) => void;
  onComplete: (tarefa: Tarefa) => void;
}) {
  const concluida = tarefa.status === "concluida";
  const cancelada = tarefa.status === "cancelada";
  return (
    <article
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-background px-3 py-2",
        concluida && "border-emerald-200 bg-emerald-50",
        cancelada && "border-[#E6EDF2] opacity-60",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Concluir tarefa"
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40",
          concluida && "border-emerald-500 bg-emerald-500",
        )}
        onClick={() => onComplete(tarefa)}
      />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(tarefa)}>
        <p className={cn("flex items-center gap-2 truncate text-sm font-medium", concluida && "text-emerald-800", cancelada && "text-[#5C6B76]")}>
          <AgendamentoTipoDot tipo={tarefa.tipo ?? "tarefa"} />
          <span className={cn("truncate", cancelada && "line-through")}>{tarefa.titulo}</span>
          {cancelada ? <span className="text-[11px] font-normal">Cancelada</span> : null}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {tarefa.horario ?? "Sem horário"} · {AGENDAMENTO_TIPO_LABEL[tarefa.tipo ?? "tarefa"]} · {PRIORIDADE_LABEL[tarefa.prioridade]}
        </p>
      </button>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#079ED4] text-[10px] font-semibold text-white">
        {iniciais(tarefa.responsavel.name)}
      </span>
      <button type="button" aria-label="Editar tarefa" className="text-[#5C6B76]" onClick={() => onEdit(tarefa)}>
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Excluir tarefa" className="text-[#5C6B76]" onClick={() => onDelete(tarefa)}>
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}
