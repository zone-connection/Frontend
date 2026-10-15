import { apiFetch } from "@/lib/api";
import type { AgendamentoTipo } from "@/lib/agenda-api";

export type TarefaFiltro =
  | "todas"
  | "hoje"
  | "proximas"
  | "atrasadas"
  | "concluidas"
  | "canceladas";

export type TarefaPrioridade = "alta" | "media" | "baixa";
export type TarefaEtiqueta =
  | "cliente"
  | "ligacao"
  | "documentos"
  | "captacao"
  | "interna"
  | "followup"
  | "contrato";
export type TarefaRecorrencia =
  | "nenhuma"
  | "diaria"
  | "semanal"
  | "mensal"
  | "dias_especificos"
  | "personalizado";
export type TarefaLembrete =
  | "nenhum"
  | "no_horario"
  | "min_5"
  | "min_15"
  | "min_30"
  | "hora_1"
  | "dia_1"
  | "personalizado";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  horario: string | null;
  prioridade: TarefaPrioridade;
  tipo: AgendamentoTipo;
  etiqueta: TarefaEtiqueta;
  status: "aberta" | "concluida" | "cancelada";
  atrasada: boolean;
  responsavel: { id: string; name: string };
  recorrencia: TarefaRecorrencia;
  diasSemana: number[];
  intervaloDias: number | null;
  lembrete: TarefaLembrete;
  lembreteMinutos: number | null;
  leadId: string | null;
  agendamentoId: string | null;
  imovelId: string | null;
  empreendimentoId: string | null;
  agendaEventoId: string | null;
  contexto: {
    lead: { id: string; nome: string } | null;
    atendimento: { id: string; titulo: string } | null;
    imovel: { id: string; rotulo: string } | null;
  };
  comentarios: {
    id: string;
    texto: string;
    createdAt: string;
    autor: { id: string; name: string };
  }[];
};

export type TarefaInput = {
  titulo: string;
  data: string;
  responsavelId: string;
  horario?: string;
  prioridade?: TarefaPrioridade;
  tipo?: AgendamentoTipo;
  etiqueta?: TarefaEtiqueta;
  descricao?: string;
  lembrete?: TarefaLembrete;
  lembreteMinutos?: number;
  recorrencia?: TarefaRecorrencia;
  diasSemana?: number[];
  intervaloDias?: number;
  leadId?: string;
  agendamentoId?: string;
  imovelId?: string;
  empreendimentoId?: string;
  status?: "aberta" | "concluida" | "cancelada";
};

export const PRIORIDADE_LABEL: Record<TarefaPrioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const ETIQUETA_TAREFA: Record<TarefaEtiqueta, { label: string; className: string }> = {
  cliente: { label: "Cliente", className: "bg-[#EEE8FF] text-[#6D5BD0]" },
  ligacao: { label: "Ligação", className: "bg-[#E7F0FF] text-[#3B6FD8]" },
  documentos: { label: "Documentos", className: "bg-[#E5F8EA] text-[#3C9A57]" },
  captacao: { label: "Captação", className: "bg-[#FFF4D6] text-[#C8890A]" },
  interna: { label: "Interna", className: "bg-[#F3E8FF] text-[#7E22CE]" },
  followup: { label: "Follow-up", className: "bg-[#E6F8F8] text-[#0F8A8A]" },
  contrato: { label: "Contrato", className: "bg-[#FDE8EF] text-[#D4537E]" },
};

export async function fetchTarefasAcesso() {
  return apiFetch<{ enabled: boolean }>("/tarefas/acesso");
}

export async function fetchTarefas(params: {
  filtro?: TarefaFiltro;
  leadId?: string;
  agendamentoId?: string;
  imovelId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.filtro) qs.set("filtro", params.filtro);
  if (params.leadId) qs.set("leadId", params.leadId);
  if (params.agendamentoId) qs.set("agendamentoId", params.agendamentoId);
  if (params.imovelId) qs.set("imovelId", params.imovelId);
  return apiFetch<Tarefa[]>(`/tarefas?${qs.toString()}`);
}

export async function createTarefa(input: TarefaInput) {
  return apiFetch<Tarefa>("/tarefas", { method: "POST", body: input });
}

export async function updateTarefa(id: string, input: Partial<TarefaInput>) {
  return apiFetch<Tarefa>(`/tarefas/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteTarefa(id: string) {
  return apiFetch<{ ok: boolean }>(`/tarefas/${id}`, { method: "DELETE" });
}

export async function comentarTarefa(id: string, texto: string) {
  return apiFetch(`/tarefas/${id}/comentarios`, {
    method: "POST",
    body: { texto },
  });
}
