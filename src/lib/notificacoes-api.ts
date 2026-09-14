import { apiFetch } from "@/lib/api";

export type NotificacaoTipo =
  | "analise_resultado"
  | "agenda_solicitacao"
  | "agenda_resposta"
  | "agenda_atribuicao"
  | "agenda_lembrete_1d"
  | "agenda_lembrete_2h"
  | "agenda_lembrete_1h"
  | "lead_prazo_proximo"
  | "lead_prazo_ultrapassado"
  | "lead_sem_atendimento"
  | "tarefa_atrasada"
  | "imovel_compativel"
  | "proposta_vencimento_proximo"
  | "lead_atribuido"
  | "lead_pool";

export type Notificacao = {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string;
  lida: boolean;
  leadId: string | null;
  analiseId: string | null;
  agendamentoId: string | null;
  empreendimentoId: string | null;
  propostaId: string | null;
  createdAt: string;
};

export async function fetchNotificacoes(): Promise<Notificacao[]> {
  return apiFetch<Notificacao[]>("/notificacoes");
}

export async function markNotificacaoLida(id: string): Promise<Notificacao> {
  return apiFetch<Notificacao>(`/notificacoes/${id}/lida`, { method: "PATCH" });
}

export async function markAllNotificacoesLidas(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/notificacoes/lidas", { method: "POST" });
}
