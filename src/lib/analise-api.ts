import { apiFetch } from "@/lib/api";
import type { ContatoTipo, Lead, StageId } from "@/lib/crm-types";

export type AnaliseStatus =
  "pendente" | "em_analise" | "aprovado" | "reprovado";

export interface Analise {
  id: string;
  leadId: string;
  tipoContato: ContatoTipo;
  stageSituacao: StageId;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  prioridade: Lead["prioridade"];
  renda: number | null;
  tags: string[];
  temFgts: boolean;
  valorFgts: number | null;
  temEntrada: boolean;
  valorEntrada: number | null;
  temDependente: boolean;
  status: AnaliseStatus;
  parecer: string | null;
  analistaId: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  analista: { id: string; name: string } | null;
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    stage: StageId;
    corretorId: string | null;
    corretor: {
      id: string;
      name: string;
      role?: string | null;
      whatsapp?: string | null;
      equipe: { gerente: { id: string; name: string } } | null;
    } | null;
    construtoraId: string | null;
    construtora: { id: string; nome: string; cor: string | null } | null;
    empreendimentoId: string | null;
    empreendimento: { id: string; nome: string; cidade: string | null } | null;
  };
}

export type UpdateAnaliseInput = {
  status?: AnaliseStatus;
  parecer?: string | null;
  /** VGV em reais (inteiro), sincronizado na documentação ao aprovar. */
  vgv?: number | null;
};

export async function fetchAnalises(params?: {
  corretorId?: string;
  status?: AnaliseStatus;
  mes?: string;
}): Promise<Analise[]> {
  const qs = new URLSearchParams();
  if (params?.corretorId) qs.set("corretorId", params.corretorId);
  if (params?.status) qs.set("status", params.status);
  if (params?.mes) qs.set("mes", params.mes);
  const query = qs.toString();
  return apiFetch<Analise[]>(`/analise${query ? `?${query}` : ""}`);
}

export type AnaliseRankingRow = {
  corretorId: string | null;
  nome: string;
  total: number;
  emAnalise: number;
  aprovados: number;
  reprovados: number;
  vendidos: number;
};

export type AnaliseResumo = {
  totais: {
    emAnalise: number;
    aprovado: number;
    reprovado: number;
    vendidos: number;
  };
  ranking: AnaliseRankingRow[];
  vendaSlugs: string[];
};

export async function fetchAnaliseResumo(params?: {
  corretorId?: string;
  mes?: string;
}): Promise<AnaliseResumo> {
  const qs = new URLSearchParams();
  if (params?.corretorId) qs.set("corretorId", params.corretorId);
  if (params?.mes) qs.set("mes", params.mes);
  const query = qs.toString();
  return apiFetch<AnaliseResumo>(`/analise/resumo${query ? `?${query}` : ""}`);
}

export async function fetchAnalise(id: string): Promise<Analise> {
  return apiFetch<Analise>(`/analise/${id}`);
}

export async function assumirAnalise(id: string): Promise<Analise> {
  return apiFetch<Analise>(`/analise/${id}/assumir`, { method: "POST" });
}

export async function updateAnalise(
  id: string,
  input: UpdateAnaliseInput,
): Promise<Analise> {
  return apiFetch<Analise>(`/analise/${id}`, {
    method: "PATCH",
    body: input,
  });
}
