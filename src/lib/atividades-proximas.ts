import {
  AGENDAMENTO_TIPO_LABEL,
  fetchAgendaLembretes,
  type AgendaProximo,
} from "@/lib/agenda-api";
import {
  fetchTarefas,
  fetchTarefasAcesso,
  type Tarefa,
} from "@/lib/tarefas-api";

function hojeYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function addDays(ymd: string, days: number) {
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type AtividadeProxima = {
  id: string;
  origem: "agenda" | "tarefa";
  titulo: string;
  quando: string;
  detalhe: string | null;
  sortKey: string;
};

const LIMITE = 8;

function formatAgendaQuando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTarefaQuando(data: string, horario: string | null) {
  const base = new Date(`${data}T${horario ? `${horario}:00` : "12:00:00"}`);
  return base.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    ...(horario ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}),
  });
}

function fromAgenda(item: AgendaProximo): AtividadeProxima {
  return {
    id: `agenda-${item.id}`,
    origem: "agenda",
    titulo: item.titulo,
    quando: formatAgendaQuando(item.startsAt),
    detalhe: item.leadNome ?? item.local ?? item.publicoLabel,
    sortKey: item.startsAt,
  };
}

function fromTarefa(item: Tarefa): AtividadeProxima {
  return {
    id: `tarefa-${item.id}`,
    origem: "tarefa",
    titulo: item.titulo,
    quando: formatTarefaQuando(item.data, item.horario),
    detalhe: item.contexto.lead?.nome ?? AGENDAMENTO_TIPO_LABEL[item.tipo] ?? null,
    sortKey: `${item.data}T${item.horario ?? "23:59"}`,
  };
}

export async function fetchAtividadesProximas(): Promise<AtividadeProxima[]> {
  const hoje = hojeYmd();
  const limiteData = addDays(hoje, 7);

  const [agenda, acesso] = await Promise.all([
    fetchAgendaLembretes().catch(() => null),
    fetchTarefasAcesso().catch(() => ({ enabled: false })),
  ]);

  let tarefas: Tarefa[] = [];
  if (acesso.enabled) {
    const [hojeList, proximas] = await Promise.all([
      fetchTarefas({ filtro: "hoje" }).catch(() => [] as Tarefa[]),
      fetchTarefas({ filtro: "proximas" }).catch(() => [] as Tarefa[]),
    ]);
    tarefas = [...hojeList, ...proximas]
      .filter((item) => item.status === "aberta" && item.data <= limiteData)
      .sort((a, b) =>
        `${a.data}${a.horario ?? ""}`.localeCompare(`${b.data}${b.horario ?? ""}`),
      );
  }

  const seen = new Set<string>();
  const merged: AtividadeProxima[] = [];
  for (const item of [
    ...(agenda?.proximos ?? []).map(fromAgenda),
    ...tarefas.map(fromTarefa),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
    if (merged.length >= LIMITE) break;
  }
  return merged;
}
