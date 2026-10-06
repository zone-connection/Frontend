import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, hojeYmd, startOfWeek } from "@/components/tarefas-calendario";
import { PRIORIDADE_LABEL } from "@/lib/tarefas-api";
import type { TarefaVisivel } from "@/lib/tarefas-mock";
import { cn } from "@/lib/utils";

function diaLabel(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TarefasSemana({
  items,
  onOpen,
}: {
  items: TarefaVisivel[];
  onOpen: (tarefa: TarefaVisivel) => void;
}) {
  const [inicio, setInicio] = useState(() => startOfWeek(hojeYmd()));
  const dias = Array.from({ length: 7 }, (_, index) => addDays(inicio, index));

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Tarefas da semana, no mesmo ritmo da rotina.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setInicio((dia) => addDays(dia, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setInicio(startOfWeek(hojeYmd()))}>
            Esta semana
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setInicio((dia) => addDays(dia, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-5 p-5">
        {dias.map((dia) => {
          const doDia = items
            .filter((item) => item.data === dia)
            .sort((a, b) => (a.horario ?? "99:99").localeCompare(b.horario ?? "99:99"));
          return (
            <div key={dia}>
              <p className="mb-2 text-sm font-medium">{diaLabel(dia)}</p>
              {doDia.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem tarefas.</p>
              ) : (
                <ul className="space-y-2">
                  {doDia.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(item)}
                        className="flex w-full gap-3 rounded-xl border px-3 py-2 text-left"
                      >
                        <span className="w-12 shrink-0 text-sm text-muted-foreground">
                          {item.horario ?? "—"}
                        </span>
                        <span className="min-w-0">
                          <span className={cn("block font-medium", item.status === "concluida" && "line-through opacity-60")}>
                            {item.titulo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {PRIORIDADE_LABEL[item.prioridade]}
                            {item.contexto.lead ? ` · Lead: ${item.contexto.lead.nome}` : ""}
                            {item.contexto.imovel ? ` · Imóvel: ${item.contexto.imovel.rotulo}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
