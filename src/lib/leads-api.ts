import { apiFetch } from "@/lib/api";
import type {
  AnaliseStatus,
  ContatoTipo,
  Lead,
  StageId,
} from "@/lib/crm-types";
import type { LeadProspeccao } from "@/lib/lead-prospeccao";
import type {
  CorretorMonitoramento,
  LeadMonitoramento,
  LeadPrazoAdiamento,
  MonitoramentoFiltro,
  PrazoUnidade,
} from "@/lib/lead-monitoramento";

/** Shape retornado pelo backend (Prisma select). */
export interface ApiLead {
  id: string;
  tipo: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  stage: StageId;
  prioridade: Lead["prioridade"];
  renda: number | null;
  tipoRenda: string | null;
  estadoCivil: string | null;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cep?: string | null;
  orcamentoMax: number | null;
  quartosMin: number | null;
  vagasMin: number | null;
  prospeccao?: LeadProspeccao | null;
  tags: string[];
  corretorId: string | null;
  corretor: {
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
  equipeId?: string | null;
  equipe?: { id: string; name: string } | null;
  construtoraId?: string | null;
  construtora?: { id: string; nome: string } | null;
  empreendimentoId?: string | null;
  empreendimento?: { id: string; nome: string; cidade: string | null } | null;
  analise?: {
    id?: string;
    status: AnaliseStatus;
    parecer: string | null;
    analistaId?: string | null;
  } | null;
  documentacoes?: Array<{
    id: string;
    status1: string;
    status2: string;
    updatedAt: string;
  }>;
  /** Status 1 da documentação mais recente (já achatado pelo backend). */
  documentacaoStatus1?: string | null;
  documentacaoStatus2?: string | null;
  perdidoAt?: string | null;
  motivoPerda?: string | null;
  perdidoPorId?: string | null;
  perdidoPor?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  monitoramento?: LeadMonitoramento | null;
}

export interface PaginatedLeads {
  data: ApiLead[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type CreateLeadInput = {
  /** lead (padrão) ou cliente da carteira pessoal. */
  tipo?: ContatoTipo;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  cidade: string;
  bairro: string;
  stage?: StageId;
  prioridade?: Lead["prioridade"];
  renda?: number | null;
  tipoRenda?: string | null;
  estadoCivil?: string | null;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cep?: string | null;
  orcamentoMax?: number | null;
  quartosMin?: number | null;
  vagasMin?: number | null;
  tags?: string[];
  prospeccao?: LeadProspeccao | null;
  /** UUID do corretor dono. null = pool da equipe. */
  corretorId?: string | null;
  /** UUID da equipe/gerente (pool). */
  equipeId?: string | null;
  /** Data de cadastro retroativa (YYYY-MM-DD ou ISO). */
  createdAt?: string | null;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Converte a resposta da API para o tipo Lead usado pelas telas. */
export function mapApiLead(api: ApiLead): Lead {
  return {
    id: api.id,
    tipo: api.tipo === "cliente" ? "cliente" : "lead",
    nome: api.nome,
    telefone: api.telefone,
    email: api.email,
    origem: api.origem,
    interesse: api.interesse,
    cidade: api.cidade,
    bairro: api.bairro,
    corretor: api.corretor?.name ?? "—",
    corretorId: api.corretorId,
    equipeId: api.equipeId ?? null,
    equipe: api.equipe?.name ?? null,
    construtoraId: api.construtoraId ?? null,
    construtora: api.construtora ?? null,
    empreendimentoId: api.empreendimentoId ?? null,
    empreendimento: api.empreendimento ?? null,
    stage: api.stage,
    prioridade: api.prioridade,
    renda: api.renda ?? null,
    tipoRenda: api.tipoRenda ?? null,
    estadoCivil: api.estadoCivil ?? null,
    cpf: api.cpf ?? null,
    rg: api.rg ?? null,
    endereco: api.endereco ?? null,
    cep: api.cep ?? null,
    corretorPerfil: api.corretor
      ? {
          id: api.corretor.id,
          name: api.corretor.name,
          email: api.corretor.email ?? null,
          phone: api.corretor.phone ?? null,
          creci: api.corretor.creci ?? null,
          cpf: api.corretor.cpf ?? null,
          rg: api.corretor.rg ?? null,
          endereco: api.corretor.endereco ?? null,
          cep: api.corretor.cep ?? null,
        }
      : null,
    orcamentoMax: api.orcamentoMax ?? null,
    quartosMin: api.quartosMin ?? null,
    vagasMin: api.vagasMin ?? null,
    prospeccao: api.prospeccao ?? null,
    createdAt: api.createdAt,
    updatedAt: formatUpdatedAt(api.updatedAt),
    updatedAtIso: api.updatedAt,
    tags: api.tags ?? [],
    analise: api.analise ?? null,
    documentacaoStatus1:
      api.documentacaoStatus1 ?? api.documentacoes?.[0]?.status1 ?? null,
    documentacaoStatus2:
      api.documentacaoStatus2 ?? api.documentacoes?.[0]?.status2 ?? null,
    monitoramento: api.monitoramento ?? null,
  };
}

export type LeadAssignee = {
  id: string;
  name: string;
  role?: string;
  cor?: string | null;
  /** Gerente da equipe do corretor (quando vinculado). */
  gerenteId?: string | null;
  gerente?: { id: string; name: string } | null;
};

/** Usuários ativos para o select de corretor (admin/gerente: equipe; corretor: só ele). */
export async function fetchLeadAssignees(): Promise<LeadAssignee[]> {
  return apiFetch<LeadAssignee[]>("/leads/assignees");
}

export async function fetchLeadById(id: string): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}`);
}

export async function fetchLeads(params?: {
  search?: string;
  tipo?: ContatoTipo;
  stage?: string;
  interesse?: string;
  prioridade?: string;
  origem?: string;
  corretorId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  monitoramento?: MonitoramentoFiltro;
}): Promise<PaginatedLeads> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.tipo) qs.set("tipo", params.tipo);
  if (params?.stage) qs.set("stage", params.stage);
  if (params?.interesse) qs.set("interesse", params.interesse);
  if (params?.prioridade) qs.set("prioridade", params.prioridade);
  if (params?.origem) qs.set("origem", params.origem);
  if (params?.corretorId) qs.set("corretorId", params.corretorId);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.monitoramento && params.monitoramento !== "todos") {
    qs.set("monitoramento", params.monitoramento);
  }
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  const query = qs.toString();
  return apiFetch<PaginatedLeads>(`/leads?${query}`);
}

export async function createLead(input: CreateLeadInput): Promise<ApiLead> {
  const { tipo, ...rest } = input;
  // APIs sem `tipo` no DTO (forbidNonWhitelisted) rejeitam `tipo: "lead"`.
  // O backend assume lead quando o campo é omitido.
  const body = tipo && tipo !== "lead" ? { tipo, ...rest } : rest;
  return apiFetch<ApiLead>("/leads", { method: "POST", body });
}

export type ImportLeadInput = {
  nome: string;
  telefone: string;
  email?: string | null;
  origem?: string;
  interesse?: Lead["interesse"];
  cidade?: string;
  bairro?: string;
  prioridade?: Lead["prioridade"];
  renda?: number | null;
  corretorId?: string;
  prospeccao?: LeadProspeccao | null;
};

export type ImportLeadsResult = {
  ok: boolean;
  total: number;
  created: number;
  failed: number;
  leads: ApiLead[];
  errors: Array<{ index: number; nome: string; message: string }>;
};

export async function checkImportDuplicates(input: {
  telefones: string[];
  emails?: string[];
  tipo?: ContatoTipo;
}): Promise<{ phones: Record<string, string>; emails: Record<string, string> }> {
  const data = await apiFetch<{
    phones?: Record<string, string>;
    emails?: Record<string, string>;
  }>("/leads/import/check", {
    method: "POST",
    body: input,
  });
  return {
    phones:
      data?.phones && typeof data.phones === "object" ? data.phones : {},
    emails:
      data?.emails && typeof data.emails === "object" ? data.emails : {},
  };
}

export async function importLeads(
  leads: ImportLeadInput[],
  opts?: { tipo?: ContatoTipo },
): Promise<ImportLeadsResult> {
  return apiFetch<ImportLeadsResult>("/leads/import", {
    method: "POST",
    body: {
      leads,
      ...(opts?.tipo ? { tipo: opts.tipo } : {}),
    },
  });
}

export type DistribuirResumo = {
  disponiveis: number;
  equipes: Array<{
    equipeId: string;
    nome: string;
    gerente: string;
    corretores: number;
    status?: string;
  }>;
  corretores: Array<{
    id: string;
    nome: string;
    equipeNome: string | null;
  }>;
};

export async function fetchDistribuirResumo(): Promise<DistribuirResumo> {
  return apiFetch<DistribuirResumo>("/leads/distribuir/resumo");
}

export async function distribuirLeadsEquipes(
  alocacoes: Array<{ equipeId: string; quantidade: number }>,
): Promise<{
  ok: boolean;
  total: number;
  alocacoes: Array<{ equipeId: string; nome: string; quantidade: number }>;
}> {
  return apiFetch("/leads/distribuir/equipes", {
    method: "POST",
    body: { modo: "equipes", alocacoes },
  });
}

export async function distribuirLeadsCorretores(input: {
  alocacoes?: Array<{ corretorId: string; quantidade: number }>;
  porCorretor?: number;
}): Promise<{
  ok: boolean;
  total: number;
  porCorretor: number | null;
  distribuicao: Array<{
    corretorId: string;
    nome: string;
    quantidade: number;
  }>;
}> {
  return apiFetch("/leads/distribuir/corretores", {
    method: "POST",
    body: { modo: "corretores", ...input },
  });
}

export async function updateLeadApi(
  id: string,
  input: UpdateLeadInput,
): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}`, { method: "PATCH", body: input });
}

export async function updateLeadStageApi(
  id: string,
  stage: StageId,
  extra?: {
    construtoraId?: string;
    empreendimentoId?: string;
    omitTriagem?: boolean;
    temEntrada?: boolean;
    valorEntrada?: number | null;
    temFgts?: boolean;
    valorFgts?: number | null;
    temDependente?: boolean;
  },
): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}/stage`, {
    method: "PATCH",
    body: {
      stage,
      ...(extra?.construtoraId ? { construtoraId: extra.construtoraId } : {}),
      ...(extra?.empreendimentoId
        ? { empreendimentoId: extra.empreendimentoId }
        : {}),
      ...(extra?.omitTriagem ? { omitTriagem: true } : {}),
      ...(extra?.temEntrada !== undefined
        ? { temEntrada: extra.temEntrada }
        : {}),
      ...(extra?.valorEntrada !== undefined
        ? { valorEntrada: extra.valorEntrada }
        : {}),
      ...(extra?.temFgts !== undefined ? { temFgts: extra.temFgts } : {}),
      ...(extra?.valorFgts !== undefined ? { valorFgts: extra.valorFgts } : {}),
      ...(extra?.temDependente !== undefined
        ? { temDependente: extra.temDependente }
        : {}),
    },
  });
}

export async function markLeadLostApi(
  id: string,
  motivo: string,
): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}/perder`, {
    method: "POST",
    body: { motivo },
  });
}

const BULK_CHUNK = 500;

export type MarkLeadsLostBulkResult = {
  ok: boolean;
  updated: number;
  skipped: number;
  ids: string[];
};

export async function markLeadsLostBulkApi(
  ids: string[],
  motivo: string,
): Promise<MarkLeadsLostBulkResult> {
  let updated = 0;
  let skipped = 0;
  const done: string[] = [];
  for (let i = 0; i < ids.length; i += BULK_CHUNK) {
    const chunk = ids.slice(i, i + BULK_CHUNK);
    const result = await apiFetch<MarkLeadsLostBulkResult>("/leads/perder", {
      method: "POST",
      body: { ids: chunk, motivo },
    });
    updated += result.updated ?? 0;
    skipped += result.skipped ?? 0;
    done.push(...(result.ids ?? []));
  }
  return { ok: true, updated, skipped, ids: done };
}

export type RemoveLeadsBulkResult = {
  ok: boolean;
  deleted: number;
  failed: number;
  failedIds: string[];
};

export async function deleteLeadsBulkApi(
  ids: string[],
): Promise<RemoveLeadsBulkResult> {
  let deleted = 0;
  const failedIds: string[] = [];
  for (let i = 0; i < ids.length; i += BULK_CHUNK) {
    const chunk = ids.slice(i, i + BULK_CHUNK);
    const result = await apiFetch<RemoveLeadsBulkResult>(
      "/leads/perdidos/excluir",
      { method: "POST", body: { ids: chunk } },
    );
    deleted += result.deleted ?? 0;
    failedIds.push(...(result.failedIds ?? []));
  }
  return {
    ok: true,
    deleted,
    failed: failedIds.length,
    failedIds,
  };
}

export async function fetchLostLeads(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<PaginatedLeads> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.sort) qs.set("sort", params.sort);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  return apiFetch<PaginatedLeads>(`/leads/perdidos?${qs.toString()}`);
}

/** Clientes perdidos — só corretor (própria carteira). */
export async function fetchLostClientes(params?: {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<PaginatedLeads> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.sort) qs.set("sort", params.sort);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  return apiFetch<PaginatedLeads>(`/leads/clientes-perdidos?${qs.toString()}`);
}

/** Exclusão definitiva (admin, só leads já perdidos). */
export async function deleteLeadApi(id: string): Promise<void> {
  await apiFetch<void>(`/leads/${id}`, { method: "DELETE" });
}

export async function fetchCorretoresMonitoramento(): Promise<
  CorretorMonitoramento[]
> {
  return apiFetch<CorretorMonitoramento[]>("/leads/monitoramento/corretores");
}

export async function syncLeadMonitoramento(): Promise<{
  ok: boolean;
  created: number;
}> {
  return apiFetch("/leads/monitoramento/sync", { method: "POST" });
}

export async function adiarPrazoLead(
  id: string,
  input: { valor: number; unidade: PrazoUnidade; motivo?: string },
): Promise<ApiLead> {
  return apiFetch<ApiLead>(`/leads/${id}/prazo/adiar`, {
    method: "POST",
    body: input,
  });
}

export async function fetchPrazoAdiamentos(
  id: string,
): Promise<LeadPrazoAdiamento[]> {
  return apiFetch<LeadPrazoAdiamento[]>(`/leads/${id}/prazo/adiamentos`);
}
