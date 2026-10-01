import { apiFetch } from "@/lib/api";
import type { ContatoTipo, StageId } from "@/lib/crm-types";

/** Defaults legados (fallback se o catálogo ainda não carregou). */
export const DEFAULT_DOCUMENTACAO_FONTES = [
  "Indicação",
  "Lead próprio",
  "Lista",
  "Campanha",
  "Outro",
] as const;

/** @deprecated Use labels do catálogo; mantido para compat com import/export. */
export const FONTE_LABELS: Record<string, string> = {
  indicacao: "Indicação",
  lead_proprio: "Lead próprio",
  lista: "Lista",
  campanha: "Campanha",
  outro: "Outro",
  Indicação: "Indicação",
  "Lead próprio": "Lead próprio",
  Lista: "Lista",
  Campanha: "Campanha",
  Outro: "Outro",
};

/** Defaults de Status 1 (crédito/análise). */
export const DEFAULT_STATUS1 = [
  "Em análise",
  "Aprovado",
  "Aprovado c/ restrição",
  "Reprovado",
] as const;

/** Defaults de Status 2 (andamento comercial). */
export const DEFAULT_STATUS2 = ["Vendido", "Bacen", "Andamento"] as const;

export interface Documentacao {
  id: string;
  leadId: string | null;
  tipoContato: ContatoTipo;
  stageSituacao: StageId;
  nome: string;
  construtoraId: string | null;
  empreendimentoId: string | null;
  fonte: string;
  status1: string;
  status2: string;
  corretorId: string | null;
  gerenteId: string | null;
  dataAnalise: string | null;
  dataVenda: string | null;
  vgv: number | null;
  obs: string | null;
  temEntrada: boolean;
  valorEntrada: number | null;
  temFgts: boolean;
  valorFgts: number | null;
  temDependente: boolean;
  createdAt: string;
  updatedAt: string;
  autor: {
    id: string;
    name: string;
    role?: "admin" | "gerente" | "corretor" | "analista" | "treinee" | "super_admin";
  };
  construtora: { id: string; nome: string; cor: string | null } | null;
  empreendimento: {
    id: string;
    nome: string;
    cidade: string | null;
    cor: string | null;
  } | null;
  corretor: { id: string; name: string; cor: string | null } | null;
  gerente: { id: string; name: string; role?: string } | null;
  lead: {
    id: string;
    tipo: ContatoTipo;
    nome: string;
    stage: StageId;
    origem: string;
    corretorId: string | null;
    corretor: { id: string; name: string; cor: string | null } | null;
  } | null;
}

export type CreateDocumentacaoInput = {
  nome: string;
  construtoraId?: string | null;
  empreendimentoId?: string | null;
  fonte: string;
  status1: string;
  status2: string;
  corretorId?: string | null;
  gerenteId?: string | null;
  dataAnalise?: string | null;
  dataVenda?: string | null;
  vgv?: number | null;
  obs?: string | null;
  temEntrada?: boolean;
  valorEntrada?: number | null;
  temFgts?: boolean;
  valorFgts?: number | null;
  temDependente?: boolean;
  /** Data de cadastro retroativa (YYYY-MM-DD ou ISO). */
  createdAt?: string | null;
};

export type UpdateDocumentacaoInput = Partial<
  Omit<CreateDocumentacaoInput, "leadId">
>;

export async function fetchDocumentacoes(
  corretorId?: string,
  sort?: string,
  incluirComissoes?: boolean,
): Promise<Documentacao[]> {
  const qs = new URLSearchParams();
  if (corretorId) qs.set("corretorId", corretorId);
  if (sort) qs.set("sort", sort);
  if (incluirComissoes) qs.set("incluirComissoes", "true");
  const query = qs.toString();
  return apiFetch<Documentacao[]>(`/documentacao${query ? `?${query}` : ""}`);
}

/** Usuários ativos do tenant para o select na ficha (analista/admin/gerente/treinee: todos). */
export type DocumentacaoCorretor = {
  id: string;
  name: string;
  role: string;
  cor: string | null;
  gerenteId: string | null;
  gerente: { id: string; name: string } | null;
};

export async function fetchDocumentacaoCorretores(): Promise<
  DocumentacaoCorretor[]
> {
  return apiFetch<DocumentacaoCorretor[]>("/documentacao/corretores");
}

export async function createDocumentacao(
  input: CreateDocumentacaoInput,
): Promise<Documentacao> {
  return apiFetch<Documentacao>("/documentacao", {
    method: "POST",
    body: input,
  });
}

export async function updateDocumentacao(
  id: string,
  input: UpdateDocumentacaoInput,
): Promise<Documentacao> {
  return apiFetch<Documentacao>(`/documentacao/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteDocumentacao(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/documentacao/${id}`, {
    method: "DELETE",
  });
}

/** Normaliza valor de fonte (slug legado ou label) para o label exibido. */
export function displayFonte(fonte: string): string {
  return FONTE_LABELS[fonte] ?? fonte;
}
