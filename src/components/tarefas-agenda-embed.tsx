import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, hojeYmd, startOfWeek } from "@/components/tarefas-calendario";
import { fetchAgendamentos, type Agendamento } from "@/lib/agenda-api";

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

export function TarefasAgendaEmbed() {
  const [inicio, setInicio] = useState(() => startOfWeek(hojeYmd()));
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date(`${inicio}T00:00:00-03:00`);
    const to = new Date(`${addDays(inicio, 7)}T00:00:00-03:00`);
    setLoading(true);
    void fetchAgendamentos({
      from: from.toISOString(),
      to: to.toISOString(),
    })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [inicio]);

  const dias = Array.from({ length: 7 }, (_, index) => addDays(inicio, index));

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Compromissos da semana, sem sair de Tarefas.
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
                      <span>
                        <span className="block font-medium">{item.titulo}</span>
                        <span className="text-xs capitalize text-muted-foreground">{item.tipo.replace("_", " ")}</span>
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
