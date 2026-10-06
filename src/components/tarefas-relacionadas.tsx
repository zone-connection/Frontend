import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fetchTarefas, type Tarefa } from "@/lib/tarefas-api";
import { getSession } from "@/lib/auth";

export function TarefasRelacionadas({
  leadId,
  agendamentoId,
  imovelId,
}: {
  leadId?: string;
  agendamentoId?: string;
  imovelId?: string;
}) {
  const enabled = getSession()?.tenant?.tarefasEnabled;
  const [items, setItems] = useState<Tarefa[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void fetchTarefas({ filtro: "todas", leadId, agendamentoId, imovelId })
      .then((list) => setItems(list.filter((t) => t.status === "aberta").slice(0, 5)))
      .catch(() => setItems([]));
  }, [enabled, leadId, agendamentoId, imovelId]);

  if (!enabled) return null;
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Próximas tarefas</p>
        <Link to="/tarefas" className="text-xs underline">
          Ver todas
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma tarefa aberta.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((t) => (
            <li key={t.id}>
              {t.titulo}
              {t.horario ? ` · ${t.horario}` : ""} · {t.data.split("-").reverse().join("/")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
