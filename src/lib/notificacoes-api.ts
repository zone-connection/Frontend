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
  | "proposta_publica_recebida"
  | "proposta_publica_aceita"
  | "lead_atribuido"
  | "lead_pool"
  | "chave_retirada"
  | "chave_devolucao"
  | "chave_confirmacao"
  | "processo_pendencia"
  | "processo_reenvio"
  | "two_factor_desativado"
  | "two_factor_ativado";

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

export async function fetchAvisosPlataforma(): Promise<Notificacao[]> {
  const rows = await apiFetch<
    Array<{
      id: string;
      tipo: "two_factor_desativado" | "two_factor_ativado";
      titulo: string;
      corpo: string;
      lida: boolean;
      createdAt: string;
    }>
  >("/seguranca/2fa/avisos");
  return rows.map((row) => ({
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    corpo: row.corpo,
    lida: row.lida,
    leadId: null,
    analiseId: null,
    agendamentoId: null,
    empreendimentoId: null,
    propostaId: null,
    createdAt: row.createdAt,
  }));
}

export async function markAvisoPlataformaLido(id: string): Promise<void> {
  await apiFetch(`/seguranca/2fa/avisos/${id}/lida`, { method: "PATCH" });
}
