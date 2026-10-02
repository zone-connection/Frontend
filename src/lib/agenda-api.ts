import { ApiError, apiFetch } from "@/lib/api";
import type { Role } from "@/lib/auth";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

export const AGENDAMENTO_TIPOS = [
  "visita",
  "ligacao",
  "reuniao",
  "tarefa",
  "outro",
  "bloqueio",
  "retirada_chave",
] as const;

export type AgendamentoTipo = (typeof AGENDAMENTO_TIPOS)[number];

export const AGENDAMENTO_STATUS = [
  "agendado",
  "concluido",
  "cancelado",
] as const;

export type AgendamentoStatus = (typeof AGENDAMENTO_STATUS)[number];

export const AGENDAMENTO_ESCOPOS = ["pessoal", "com_gerente"] as const;
export type AgendamentoEscopo = (typeof AGENDAMENTO_ESCOPOS)[number];

export const AGENDAMENTO_ALVOS = [
  "nenhum",
  "todos",
  "equipe",
  "gerente",
  "gerentes",
] as const;
export type AgendamentoAlvo = (typeof AGENDAMENTO_ALVOS)[number];

export const AGENDAMENTO_SOLICITACAO = [
  "nenhuma",
  "pendente",
  "aprovada",
  "recusada",
] as const;
export type AgendamentoSolicitacaoStatus =
  (typeof AGENDAMENTO_SOLICITACAO)[number];

export const AGENDAMENTO_RECURRENCE_FREQ = [
  "unica",
  "semanal",
  "mensal",
] as const;
export type AgendamentoRecurrenceFreq =
  (typeof AGENDAMENTO_RECURRENCE_FREQ)[number];

export const AGENDAMENTO_TIPO_LABEL: Record<AgendamentoTipo, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  outro: "Outro",
  bloqueio: "Bloqueio",
  retirada_chave: "Retirada de chave",
};

export const AGENDAMENTO_STATUS_LABEL: Record<AgendamentoStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const AGENDAMENTO_ESCOPO_LABEL: Record<AgendamentoEscopo, string> = {
  pessoal: "Tarefa pessoal",
  com_gerente: "Com o gerente",
};

export const AGENDAMENTO_ALVO_LABEL: Record<AgendamentoAlvo, string> = {
  nenhum: "Só eu (tarefa pessoal)",
  todos: "Todas as equipes",
  equipe: "Uma equipe",
  gerente: "Um gerente",
  gerentes: "Todos os gerentes",
};

export const AGENDAMENTO_RECURRENCE_LABEL: Record<
  AgendamentoRecurrenceFreq,
  string
> = {
  unica: "Único",
  semanal: "Semanal",
  mensal: "Mensal",
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
] as const;

/** Origem visual no calendário: quem criou o compromisso. */
export type AgendamentoOrigem =
  "admin" | "gerente" | "corretor" | "aniversario" | "bloqueio";

export const AGENDAMENTO_ORIGEM_LABEL: Record<AgendamentoOrigem, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor (lead/cliente)",
  aniversario: "Aniversário",
  bloqueio: "Bloqueado",
};

/** Bolinha do autor na linha do horário (a cor do evento vem do tipo). */
export const AGENDAMENTO_ORIGEM_DOT: Record<AgendamentoOrigem, string> = {
  admin: "bg-indigo-500",
  gerente: "bg-teal-500",
  corretor: "bg-amber-500",
  aniversario: "bg-rose-500",
  bloqueio: "bg-slate-500",
};

/**
 * Chave visual do evento: o tipo de atividade, mais o aniversário (evento
 * virtual, sem tipo). Define a cor do bloco no calendário.
 */
export type AgendamentoVisual = AgendamentoTipo | "aniversario";

export const AGENDAMENTO_VISUAL_LABEL: Record<AgendamentoVisual, string> = {
  ...AGENDAMENTO_TIPO_LABEL,
  aniversario: "Aniversário",
};

/**
 * Cores dos eventos = paleta da marca (navy #053647, ciano #079ED4,
 * teal #0e6f8a e a escala dos KPIs). Sem laranja/roxo/verde soltos.
 *
 * visita        → primary #079ed4
 * ligacao       → kpi-seq-4 #057aa8
 * reuniao       → navy #053647
 * tarefa        → CTA teal #0e6f8a
 * outro         → chart-5 #64748b
 * aniversario   → kpi-seq-1 #5bc4e8
 * bloqueio      → slate
 */

/** Hachura do bloqueio: reforça o tipo mesmo em blocos pequenos. */
const BLOQUEIO_HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(5,54,71,0.2)_4px,rgba(5,54,71,0.2)_8px)]";

/** Blocos sólidos (calendário semana/mês). */
export const AGENDAMENTO_TIPO_BLOCK: Record<AgendamentoVisual, string> = {
  visita: "bg-[#079ed4] border-[#0689bd] text-white",
  ligacao: "bg-[#057aa8] border-[#04648a] text-white",
  reuniao: "bg-[#053647] border-[#032b43] text-white",
  tarefa: "bg-[#0e6f8a] border-[#0a5a75] text-white",
  outro: "bg-[#64748b] border-[#475569] text-white",
  bloqueio: `bg-slate-400/80 border-slate-500 text-white border-dashed ${BLOQUEIO_HATCH}`,
  retirada_chave: "bg-[#075a82] border-[#054a6b] text-white",
  aniversario: "bg-[#5bc4e8] border-[#079ed4] text-[#053647]",
};

/** Badges e ícones suaves. */
export const AGENDAMENTO_TIPO_SOFT: Record<AgendamentoVisual, string> = {
  visita:
    "bg-[#079ed4]/12 text-[#04648a] dark:text-[#5bc4e8] border-[#079ed4]/30",
  ligacao:
    "bg-[#057aa8]/12 text-[#04648a] dark:text-[#5bc4e8] border-[#057aa8]/30",
  reuniao:
    "bg-[#053647]/10 text-[#053647] dark:bg-white/10 dark:text-slate-100 border-[#053647]/25 dark:border-white/20",
  tarefa:
    "bg-[#0e6f8a]/12 text-[#0a5a75] dark:text-[#5bc4e8] border-[#0e6f8a]/30",
  outro:
    "bg-[#64748b]/12 text-[#475569] dark:text-slate-300 border-[#64748b]/30",
  bloqueio:
    "bg-slate-500/10 text-slate-700 dark:text-slate-200 border-slate-500/35 border-dashed",
  retirada_chave:
    "bg-[#075a82]/12 text-[#075a82] dark:text-[#7ec8e8] border-[#075a82]/30",
  aniversario:
    "bg-[#5bc4e8]/20 text-[#04648a] dark:text-[#5bc4e8] border-[#5bc4e8]/40",
};

/** Ícone (cards, seletor de tipo). */
export const AGENDAMENTO_TIPO_WELL: Record<AgendamentoVisual, string> = {
  visita: "bg-[#079ed4] text-white",
  ligacao: "bg-[#057aa8] text-white",
  reuniao: "bg-[#053647] text-white",
  tarefa: "bg-[#0e6f8a] text-white",
  outro: "bg-[#64748b] text-white",
  bloqueio: "bg-slate-500 text-white",
  retirada_chave: "bg-[#075a82] text-white",
  aniversario: "bg-[#5bc4e8] text-[#053647]",
};

/** Faixa / acento sólido do tipo. */
export const AGENDAMENTO_TIPO_ACCENT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#079ed4]",
  ligacao: "bg-[#057aa8]",
  reuniao: "bg-[#053647]",
  tarefa: "bg-[#0e6f8a]",
  outro: "bg-[#64748b]",
  bloqueio: "bg-slate-400",
  retirada_chave: "bg-[#075a82]",
  aniversario: "bg-[#5bc4e8]",
};

/** Cards da visão dia: fundo do sistema + faixa da marca à esquerda. */
export const AGENDAMENTO_TIPO_CARD: Record<AgendamentoVisual, string> = {
  visita: "bg-card border-border border-l-[#079ed4] text-foreground",
  ligacao: "bg-card border-border border-l-[#057aa8] text-foreground",
  reuniao: "bg-card border-border border-l-[#053647] text-foreground",
  tarefa: "bg-card border-border border-l-[#0e6f8a] text-foreground",
  outro: "bg-card border-border border-l-[#64748b] text-foreground",
  bloqueio:
    "bg-muted/40 border-slate-400/50 border-l-slate-400 border-dashed text-foreground",
  retirada_chave: "bg-card border-border border-l-[#075a82] text-foreground",
  aniversario: "bg-card border-border border-l-[#5bc4e8] text-foreground",
};

/** Marcador da legenda e dos seletores de tipo. */
export const AGENDAMENTO_TIPO_DOT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#079ed4]",
  ligacao: "bg-[#057aa8]",
  reuniao: "bg-[#053647]",
  tarefa: "bg-[#0e6f8a]",
  outro: "bg-[#64748b]",
  bloqueio: "bg-slate-400 ring-1 ring-slate-500",
  retirada_chave: "bg-[#075a82]",
  aniversario: "bg-[#5bc4e8]",
};

export function isAgendamentoAniversario(item: {
  id: string;
  isAniversario?: boolean;
}) {
  return Boolean(item.isAniversario) || item.id.startsWith("aniversario:");
}

export function isAgendamentoBloqueio(item: { tipo: AgendamentoTipo }) {
  return item.tipo === "bloqueio";
}

/** Título principal no card do calendário. */
export function getAgendamentoCardTitle(item: {
  tipo: AgendamentoTipo;
  titulo: string;
  autor: { name: string };
}) {
  if (isAgendamentoBloqueio(item)) {
    return `Bloqueado · ${item.autor.name}`;
  }
  return item.titulo;
}

/** Linha secundária: quem atribuiu / título do bloqueio / lead. */
export function getAgendamentoCardSubtitle(item: {
  tipo: AgendamentoTipo;
  titulo: string;
  autor: { name: string };
  atribuidoParaId?: string | null;
  lead?: { nome: string } | null;
  empreendimento?: { nome: string } | null;
  muralChave?: { identificador: string } | null;
  chaveRetiradaEm?: string | null;
}) {
  if (isAgendamentoBloqueio(item)) {
    return item.titulo?.trim() || null;
  }
  const vinculo = [
    item.empreendimento?.nome,
    item.muralChave
      ? `Chave ${item.muralChave.identificador}${item.chaveRetiradaEm ? " retirada" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (item.atribuidoParaId) {
    const base = `De ${item.autor.name}`;
    const nome = item.lead?.nome;
    return [base, nome, vinculo].filter(Boolean).join(" · ");
  }
  return [item.lead?.nome, vinculo].filter(Boolean).join(" · ") || null;
}

/** Cor do evento: aniversário tem tom próprio; o resto segue o tipo. */
export function getAgendamentoVisual(item: {
  id: string;
  isAniversario?: boolean;
  tipo?: AgendamentoTipo;
}): AgendamentoVisual {
  if (isAgendamentoAniversario(item)) return "aniversario";
  return item.tipo ?? "outro";
}

export function getAgendamentoOrigem(item: {
  id: string;
  isAniversario?: boolean;
  tipo?: AgendamentoTipo;
  autor: { role: Role };
}): AgendamentoOrigem {
  if (isAgendamentoAniversario(item)) return "aniversario";
  if (item.tipo === "bloqueio") return "bloqueio";
  if (item.autor.role === "admin") return "admin";
  if (item.autor.role === "gerente") return "gerente";
  return "corretor";
}

export interface Agendamento {
  id: string;
  leadId: string | null;
  atribuidoParaId: string | null;
  titulo: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  escopo: AgendamentoEscopo;
  solicitacaoStatus: AgendamentoSolicitacaoStatus;
  alvoTipo: AgendamentoAlvo;
  alvoEquipeId: string | null;
  alvoGerenteId: string | null;
  seriesId: string | null;
  recurrenceFreq: AgendamentoRecurrenceFreq;
  recurrenceDays: number[];
  recurrenceUntil: string | null;
  startsAt: string;
  endsAt: string | null;
  local: string | null;
  observacoes: string | null;
  funilStage: string | null;
  motivoRecusa: string | null;
  aprovadoAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Evento virtual (aniversário de corretor) — somente leitura. */
  isAniversario?: boolean;
  autor: { id: string; name: string; role: Role };
  atribuidoPara: { id: string; name: string; role: Role } | null;
  aprovadoPor: { id: string; name: string } | null;
  alvoEquipe: { id: string; name: string } | null;
  alvoGerente: { id: string; name: string } | null;
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    telefone: string;
    stage: StageId;
    corretorId: string | null;
    corretor: { id: string; name: string } | null;
  } | null;
  empreendimentoId: string | null;
  empreendimento: { id: string; nome: string } | null;
  imovelId: string | null;
  toleranciaAtiva: boolean;
  bloqueadoAte: string | null;
  imovel: {
    id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
  } | null;
  muralChaveId: string | null;
  muralChave: { id: string; identificador: string; status: string } | null;
  chaveRetiradaEm: string | null;
}

export type CreateAgendamentoInput = {
  leadId?: string | null;
  atribuidoParaId?: string | null;
  titulo: string;
  tipo: AgendamentoTipo;
  escopo: AgendamentoEscopo;
  alvoTipo?: AgendamentoAlvo;
  alvoEquipeId?: string | null;
  alvoGerenteId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  local?: string | null;
  observacoes?: string | null;
  funilStage?: string | null;
  /** true só no follow-up. Tarefa registrada não coloca o lead em atraso. */
  contaAtraso?: boolean;
  recurrenceFreq?: AgendamentoRecurrenceFreq;
  recurrenceDays?: number[];
  recurrenceUntil?: string | null;
  empreendimentoId?: string | null;
  imovelId?: string | null;
  toleranciaAtiva?: boolean;
  muralChaveId?: string | null;
};

export type UpdateAgendamentoInput = Partial<
  Omit<
    CreateAgendamentoInput,
    | "leadId"
    | "atribuidoParaId"
    | "recurrenceFreq"
    | "recurrenceDays"
    | "recurrenceUntil"
  >
> & {
  status?: AgendamentoStatus;
};

export type FetchAgendamentosParams = {
  corretorId?: string;
  equipeId?: string;
  tipo?: AgendamentoTipo;
  status?: AgendamentoStatus;
  from?: string;
  to?: string;
};

export async function fetchAgendamentos(
  params: FetchAgendamentosParams = {},
): Promise<Agendamento[]> {
  const qs = new URLSearchParams();
  if (params.corretorId) qs.set("corretorId", params.corretorId);
  if (params.equipeId) qs.set("equipeId", params.equipeId);
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.status) qs.set("status", params.status);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<Agendamento[]>(`/agenda${query ? `?${query}` : ""}`);
}

export type AgendaKpiCard = { hoje: number; ontem: number };

export interface AgendaKpis {
  compromissos: AgendaKpiCard;
  atendimentos: AgendaKpiCard;
  reunioes: AgendaKpiCard;
  propostas: AgendaKpiCard;
  visitas: AgendaKpiCard;
}

export async function fetchAgendaKpis(params: {
  corretorId?: string;
  equipeId?: string;
} = {}): Promise<AgendaKpis> {
  const qs = new URLSearchParams();
  if (params.corretorId) qs.set("corretorId", params.corretorId);
  if (params.equipeId) qs.set("equipeId", params.equipeId);
  const query = qs.toString();
  return apiFetch<AgendaKpis>(`/agenda/kpis${query ? `?${query}` : ""}`);
}

export type VisitaOcupacao = {
  id: string;
  titulo: string;
  startsAt: string;
  endsAt: string | null;
  bloqueadoAte: string | null;
  toleranciaAtiva: boolean;
  corretorNome: string;
  empreendimentoId: string | null;
  empreendimentoNome: string | null;
  imovelId: string | null;
  imovelLabel: string | null;
};

export async function fetchDisponibilidadeVisitas(params: {
  empreendimentoId?: string;
  imovelId?: string;
  from: string;
  to: string;
}): Promise<{ total: number; visitas: VisitaOcupacao[] }> {
  const qs = new URLSearchParams();
  if (params.empreendimentoId) qs.set("empreendimentoId", params.empreendimentoId);
  if (params.imovelId) qs.set("imovelId", params.imovelId);
  qs.set("from", params.from);
  qs.set("to", params.to);
  return apiFetch(`/agenda/disponibilidade?${qs.toString()}`);
}

export type AgendamentoHistoricoItem = {
  id: string;
  acao: "criado" | "alterado" | "cancelado" | "concluido" | "excluido";
  detalhe: string;
  createdAt: string;
  autor: { id: string; name: string };
};

export async function fetchHistoricoVisita(
  id: string,
): Promise<AgendamentoHistoricoItem[]> {
  return apiFetch(`/agenda/${id}/historico`);
}

export async function fetchSolicitacoesAgenda(): Promise<Agendamento[]> {
  return apiFetch<Agendamento[]>("/agenda/solicitacoes");
}

export async function fetchSolicitacoesAgendaCount(): Promise<{
  count: number;
}> {
  return apiFetch<{ count: number }>("/agenda/solicitacoes/count");
}

export async function createAgendamento(
  input: CreateAgendamentoInput,
): Promise<Agendamento> {
  try {
    return await apiFetch<Agendamento>("/agenda", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 400 &&
      ((input.funilStage && /funilStage/i.test(err.message)) ||
        (input.contaAtraso != null && /contaAtraso/i.test(err.message)))
    ) {
      const { funilStage: _funilStage, contaAtraso: _contaAtraso, ...rest } =
        input;
      return apiFetch<Agendamento>("/agenda", {
        method: "POST",
        body: rest,
      });
    }
    throw err;
  }
}

export async function updateAgendamento(
  id: string,
  input: UpdateAgendamentoInput,
): Promise<Agendamento> {
  return apiFetch<Agendamento>(`/agenda/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function aprovarAgendamento(id: string): Promise<Agendamento> {
  return apiFetch<Agendamento>(`/agenda/${id}/aprovar`, { method: "POST" });
}

export async function recusarAgendamento(
  id: string,
  motivo?: string,
): Promise<Agendamento> {
  return apiFetch<Agendamento>(`/agenda/${id}/recusar`, {
    method: "POST",
    body: { motivo },
  });
}

export async function deleteAgendamento(
  id: string,
  opts?: { series?: "one" | "all" },
): Promise<void> {
  const qs = opts?.series === "all" ? "?series=all" : "";
  await apiFetch<{ ok: boolean }>(`/agenda/${id}${qs}`, {
    method: "DELETE",
  });
}

export type AgendaUrgencia = "nenhuma" | "dia" | "duas_horas" | "uma_hora";

export type AgendaProximo = {
  id: string;
  titulo: string;
  startsAt: string;
  local: string | null;
  leadNome: string | null;
  leadTipo: ContatoTipo | null;
  corretorNome: string | null;
  gerenteNome: string | null;
  equipeNome: string | null;
  publicoLabel: string | null;
  autorNome: string;
  autorRole: Role;
  nivel: "dia" | "duas_horas" | "uma_hora";
  msRestante: number;
};

export type AgendaLembretesResponse = {
  urgencia: AgendaUrgencia;
  proximosCount: number;
  solicitacoesCount: number;
  proximos: AgendaProximo[];
  novasNotificacoes: Array<{
    id: string;
    tipo: string;
    titulo: string;
    corpo: string;
  }>;
};

export async function fetchAgendaLembretes(): Promise<AgendaLembretesResponse> {
  return apiFetch<AgendaLembretesResponse>("/agenda/lembretes");
}
