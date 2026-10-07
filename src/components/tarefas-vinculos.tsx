import { PRIORIDADE_LABEL } from "@/lib/tarefas-api";
import type { TarefaVisivel } from "@/lib/tarefas-mock";
import { cn } from "@/lib/utils";

const TITULO: Record<"leads" | "imoveis" | "atendimentos", string> = {
  leads: "Leads e clientes",
  imoveis: "Imóveis",
  atendimentos: "Atendimentos",
};

export function TarefasVinculos({
  secao,
  items,
  onOpen,
}: {
  secao: "leads" | "imoveis" | "atendimentos";
  items: TarefaVisivel[];
  onOpen: (tarefa: TarefaVisivel) => void;
}) {
  const grupos = new Map<string, TarefaVisivel[]>();
  for (const item of items) {
    const nome =
      secao === "leads"
        ? item.contexto.lead?.nome
        : secao === "imoveis"
          ? item.contexto.imovel?.rotulo
          : item.contexto.atendimento?.titulo;
    if (!nome) continue;
    grupos.set(nome, [...(grupos.get(nome) ?? []), item]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{TITULO[secao]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tarefas ligadas a cada registro do CRM.
        </p>
      </div>
      {[...grupos.entries()].map(([nome, lista]) => (
        <section key={nome} className="rounded-2xl border bg-card p-4">
          <h2 className="font-medium">{nome}</h2>
          <ul className="mt-3 space-y-2">
            {lista.map((tarefa) => (
              <li key={tarefa.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  onClick={() => onOpen(tarefa)}
                >
                  <span>
                    <span className={cn("block font-medium", tarefa.status === "concluida" && "line-through opacity-60")}>
                      {tarefa.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tarefa.horario ?? "Sem horário"} · {tarefa.data}
                      {tarefa.demonstracao ? " · Demonstração" : ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {PRIORIDADE_LABEL[tarefa.prioridade]} · {tarefa.responsavel.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {grupos.size === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma tarefa ligada a este tipo de registro.
        </p>
      ) : null}
    </div>
  );
}
