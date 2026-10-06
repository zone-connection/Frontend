import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, hojeYmd, startOfWeek } from "@/components/tarefas-calendario";
import { fetchAgendamentos, type Agendamento, type AgendamentoTipo } from "@/lib/agenda-api";
import { cn } from "@/lib/utils";

const TIPO: Record<AgendamentoTipo, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  outro: "Compromisso",
  bloqueio: "Bloqueio",
  retirada_chave: "Retirada de chave",
};

function diaLabel(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function hora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function ymdDe(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function detalhe(item: Agendamento) {
  const partes = [TIPO[item.tipo]];
  if (item.lead?.nome) partes.push(`Lead: ${item.lead.nome}`);
  if (item.imovel) {
    partes.push(
      `Imóvel: ${[item.imovel.logradouro, item.imovel.bairro].filter(Boolean).join(", ")}`,
    );
  }
  if (item.atribuidoPara?.name) partes.push(item.atribuidoPara.name);
  return partes.join(" · ");
}

export function TarefasSemana() {
  const [inicio, setInicio] = useState(() => startOfWeek(hojeYmd()));
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const dias = Array.from({ length: 7 }, (_, index) => addDays(inicio, index));

  useEffect(() => {
    const from = new Date(`${inicio}T00:00:00-03:00`);
    const to = new Date(`${addDays(inicio, 7)}T00:00:00-03:00`);
    setLoading(true);
    void fetchAgendamentos({ from: from.toISOString(), to: to.toISOString() })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [inicio]);

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Agenda da semana, com os compromissos do usuário.
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
        {loading ? <p className="text-sm text-muted-foreground">Carregando agenda…</p> : null}
        {dias.map((dia) => {
          const doDia = items
            .filter((item) => ymdDe(item.startsAt) === dia && item.status !== "cancelado")
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          return (
            <div key={dia}>
              <p className="mb-2 text-sm font-medium">{diaLabel(dia)}</p>
              {doDia.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem compromissos.</p>
              ) : (
                <ul className="space-y-2">
                  {doDia.map((item) => (
                    <li key={item.id} className="flex gap-3 rounded-xl border px-3 py-2">
                      <span className="w-12 shrink-0 text-sm text-muted-foreground">{hora(item.startsAt)}</span>
                      <span className="min-w-0">
                        <span className={cn("block font-medium", item.status === "concluido" && "line-through opacity-60")}>
                          {item.titulo}
                        </span>
                        <span className="text-xs text-muted-foreground">{detalhe(item)}</span>
                      </span>
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
