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
 * Cores dos eventos = as mesmas das pílulas da agenda.
 * visita azul, ligação verde, reunião roxa, tarefa laranja,
 * outro teal, bloqueio vermelho, aniversário rosa.
 */

/** Hachura do bloqueio: reforça o tipo mesmo em blocos pequenos. */
const BLOQUEIO_HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(180,74,74,0.28)_4px,rgba(180,74,74,0.28)_8px)]";

/** Blocos sólidos (calendário semana/mês). */
export const AGENDAMENTO_TIPO_BLOCK: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] border-[#2563c9] text-white",
  ligacao: "bg-[#22a06b] border-[#1b8558] text-white",
  reuniao: "bg-[#7c5cbf] border-[#6849a8] text-white",
  tarefa: "bg-[#e0892a] border-[#c4731c] text-white",
  outro: "bg-[#2aa3a3] border-[#218686] text-white",
  bloqueio: `bg-[#d45c5c] border-[#b94a4a] text-white ${BLOQUEIO_HATCH}`,
  retirada_chave: "bg-[#075a82] border-[#054a6b] text-white",
  aniversario: "bg-[#d46aa8] border-[#b85590] text-white",
};

/** Badges e ícones suaves. */
export const AGENDAMENTO_TIPO_SOFT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8]/12 text-[#1d4fad] border-[#2f79e8]/30",
  ligacao: "bg-[#22a06b]/12 text-[#157a50] border-[#22a06b]/30",
  reuniao: "bg-[#7c5cbf]/12 text-[#5a3d99] border-[#7c5cbf]/30",
  tarefa: "bg-[#e0892a]/12 text-[#b56a16] border-[#e0892a]/30",
  outro: "bg-[#2aa3a3]/12 text-[#1c7a7a] border-[#2aa3a3]/30",
  bloqueio: "bg-[#d45c5c]/12 text-[#a63d3d] border-[#d45c5c]/30",
  retirada_chave: "bg-[#075a82]/12 text-[#075a82] border-[#075a82]/30",
  aniversario: "bg-[#d46aa8]/12 text-[#a34a80] border-[#d46aa8]/30",
};

/** Ícone (cards, seletor de tipo). */
export const AGENDAMENTO_TIPO_WELL: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] text-white",
  ligacao: "bg-[#22a06b] text-white",
  reuniao: "bg-[#7c5cbf] text-white",
  tarefa: "bg-[#e0892a] text-white",
  outro: "bg-[#2aa3a3] text-white",
  bloqueio: "bg-[#d45c5c] text-white",
  retirada_chave: "bg-[#075a82] text-white",
  aniversario: "bg-[#d46aa8] text-white",
};

/** Faixa / acento sólido do tipo. */
export const AGENDAMENTO_TIPO_ACCENT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8]",
  ligacao: "bg-[#22a06b]",
  reuniao: "bg-[#7c5cbf]",
  tarefa: "bg-[#e0892a]",
  outro: "bg-[#2aa3a3]",
  bloqueio: "bg-[#d45c5c]",
  retirada_chave: "bg-[#075a82]",
  aniversario: "bg-[#d46aa8]",
};

/** Cards da visão lista: fundo do sistema + faixa colorida à esquerda. */
export const AGENDAMENTO_TIPO_CARD: Record<AgendamentoVisual, string> = {
  visita: "bg-card border-border border-l-[#2f79e8] text-foreground",
  ligacao: "bg-card border-border border-l-[#22a06b] text-foreground",
  reuniao: "bg-card border-border border-l-[#7c5cbf] text-foreground",
  tarefa: "bg-card border-border border-l-[#e0892a] text-foreground",
  outro: "bg-card border-border border-l-[#2aa3a3] text-foreground",
  bloqueio:
    "bg-muted/40 border-[#d45c5c]/40 border-l-[#d45c5c] text-foreground",
  retirada_chave: "bg-card border-border border-l-[#075a82] text-foreground",
  aniversario: "bg-card border-border border-l-[#d46aa8] text-foreground",
};

/** Marcador da legenda e dos seletores de tipo. */
export const AGENDAMENTO_TIPO_DOT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8]",
  ligacao: "bg-[#22a06b]",
  reuniao: "bg-[#7c5cbf]",
  tarefa: "bg-[#e0892a]",
  outro: "bg-[#2aa3a3]",
  bloqueio: "bg-[#d45c5c]",
  retirada_chave: "bg-[#075a82]",
  aniversario: "bg-[#d46aa8]",
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

type AgendaImovelResumo = {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
};

export function imovelAgendaResumo(imovel: AgendaImovelResumo | null | undefined) {
  if (!imovel) return null;
  const endereco = [imovel.logradouro, imovel.numero].filter(Boolean).join(", ");
  return (
    endereco ||
    [imovel.bairro, imovel.cidade].filter(Boolean).join(" · ") ||
    "Imóvel"
  );
}

/** Chave, imóvel ou empreendimento ligado à visita. */
export function getAgendamentoVinculoLabel(item: {
  empreendimento?: { nome: string } | null;
  imovel?: AgendaImovelResumo | null;
  muralChave?: { identificador: string } | null;
}) {
  const lugar =
    item.empreendimento?.nome?.trim() || imovelAgendaResumo(item.imovel);
  const chave = item.muralChave?.identificador?.trim();
  if (chave && lugar) return `${chave} · ${lugar}`;
  if (chave) return `Chave ${chave}`;
  return lugar || null;
}

function visitaComLocal(tipo: AgendamentoTipo) {
  return tipo === "visita" || tipo === "retirada_chave";
}

/** Título principal no card do calendário. */
export function getAgendamentoCardTitle(item: {
  tipo: AgendamentoTipo;
  titulo: string;
  autor: { name: string };
  empreendimento?: { nome: string } | null;
  imovel?: AgendaImovelResumo | null;
  muralChave?: { identificador: string } | null;
}) {
  if (isAgendamentoBloqueio(item)) {
    return `Bloqueado · ${item.autor.name}`;
  }
  if (visitaComLocal(item.tipo)) {
    const vinculo = getAgendamentoVinculoLabel(item);
    if (vinculo) return vinculo;
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
  imovel?: AgendaImovelResumo | null;
  atribuidoPara?: { name: string } | null;
  toleranciaAtiva?: boolean;
  muralChave?: { identificador: string } | null;
  chaveRetiradaEm?: string | null;
}) {
  if (isAgendamentoBloqueio(item)) {
    return item.titulo?.trim() || null;
  }
  const vinculo = getAgendamentoVinculoLabel(item);
  const vinculoNoTitulo = visitaComLocal(item.tipo) && Boolean(vinculo);
  const tituloLivre =
    item.titulo?.trim() && item.titulo.trim() !== vinculo
      ? item.titulo.trim()
      : null;
  const chaveExtra =
    !vinculoNoTitulo && item.muralChave
      ? `Chave ${item.muralChave.identificador}${item.chaveRetiradaEm ? " retirada" : ""}`
      : item.chaveRetiradaEm && item.muralChave
        ? "chave retirada"
        : null;
  const partes = [
    item.atribuidoParaId ? `De ${item.autor.name}` : null,
    tituloLivre,
    item.lead?.nome,
    item.tipo === "visita"
      ? item.atribuidoPara?.name ?? item.autor.name
      : null,
    vinculoNoTitulo ? null : vinculo,
    chaveExtra,
    item.tipo === "visita" && item.toleranciaAtiva
      ? "tolerância de 2 horas"
      : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
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
  empreendimentoId?: string;
  imovelId?: string;
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
  if (params.empreendimentoId) qs.set("empreendimentoId", params.empreendimentoId);
  if (params.imovelId) qs.set("imovelId", params.imovelId);
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
