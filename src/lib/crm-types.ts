/**
 * Tipos e helpers compartilhados das telas conectadas à API.
 * Dados mock foram removidos — use a API ou o componente SemConexao.
 */

import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import type { LeadMonitoramento } from "@/lib/lead-monitoramento";
import type { LeadProspeccao } from "@/lib/lead-prospeccao";

export type StageId = string;

export type ContatoTipo = "lead" | "cliente";

export type AnaliseStatus =
  "pendente" | "em_analise" | "aprovado" | "reprovado";

export interface Lead {
  id: string;
  /** lead = captação; cliente = carteira pessoal do corretor. */
  tipo: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: "Comprar";
  cidade: string;
  bairro: string;
  /** Nome do corretor (exibição). */
  corretor: string;
  /** UUID do corretor no backend. */
  corretorId?: string | null;
  /** UUID da equipe (pool ou herdada). */
  equipeId?: string | null;
  /** Liberado por automação de atraso. */
  origemAtrasoLiberacao?: "caca_lead" | "retrabalho" | null;
  atrasoLiberadoAt?: string | null;
  /** Destaque na triagem após herdar o lead (caça-lead / retrabalho). */
  triagemOrigemHerdada?: "caca_lead" | "retrabalho" | null;
  /** Nome da equipe para exibição. */
  equipe?: string | null;
  construtoraId?: string | null;
  construtora?: { id: string; nome: string } | null;
  empreendimentoId?: string | null;
  empreendimento?: { id: string; nome: string; cidade?: string | null } | null;
  stage: StageId;
  prioridade: "Alta" | "Média" | "Baixa";
  /** Renda mensal do cliente (opcional). */
  renda: number | null;
  /** Tipo de renda (CLT, autônomo, etc.) — opcional. */
  tipoRenda: string | null;
  /** Estado civil do cliente (opcional). */
  estadoCivil: string | null;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cep?: string | null;
  corretorPerfil?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    creci?: string | null;
    cpf?: string | null;
    rg?: string | null;
    endereco?: string | null;
    cep?: string | null;
  } | null;
  /** Orçamento máximo para imóvel (opcional). */
  orcamentoMax: number | null;
  /** Mínimo de quartos desejado (opcional). */
  quartosMin: number | null;
  /** Mínimo de vagas desejado (opcional). */
  vagasMin: number | null;
  /** Prospecção B2B (tenant da plataforma). */
  prospeccao?: LeadProspeccao | null;
  /** Data de cadastro (ISO). */
  createdAt?: string;
  updatedAt: string;
  /** Timestamp ISO da última atualização (quando a API envia). */
  updatedAtIso?: string;
  tags: string[];
  /** Ficha de análise, se existir. */
  analise?: {
    id?: string;
    status: AnaliseStatus;
    parecer: string | null;
    analistaId?: string | null;
  } | null;
  /**
   * Parecer de crédito da documentação mais recente (Status 1).
   * Ex.: Aprovado, Reprovado, Aprovado c/ restrição.
   */
  documentacaoStatus1?: string | null;
  documentacaoStatus2?: string | null;
  monitoramento?: LeadMonitoramento | null;
}

/** Lead da carteira pessoal do usuário (ex.: gerente), não da equipe. */
export function isLeadCarteiraPropria(
  lead: Pick<Lead, "corretorId">,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId && lead.corretorId === userId);
}

export function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Classes Tailwind para badge/chip de prioridade do lead. */
export function prioridadeBadgeClass(prioridade: Lead["prioridade"]): string {
  const size = STATUS_CHIP_CLASS;
  switch (prioridade) {
    case "Alta":
      return `${size} border-transparent bg-destructive/15 text-destructive hover:bg-destructive/20`;
    case "Média":
      return `${size} border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100/90`;
    case "Baixa":
      return `${size} border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20`;
    default:
      return `${size} border-transparent bg-secondary text-secondary-foreground`;
  }
}
