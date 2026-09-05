import { apiFetch } from "@/lib/api";

export function empreendimentoTipoLabel(tipo: string | null | undefined) {
  return tipo?.trim() || "";
}

export function empreendimentoStatusLabel(status: string | null | undefined) {
  return status?.trim() || "";
}

export function empreendimentoHasLitoral(item: {
  tags?: string[] | null;
}) {
  return (item.tags ?? []).some(
    (tag) => tag.trim().toLocaleLowerCase("pt-BR") === "litoral",
  );
}

export type Empreendimento = {
  id: string;
  nome: string;
  cor: string | null;
  construtoraId: string | null;
  localidadeId: string | null;
  cidade: string | null;
  endereco: string | null;
  tipo: string | null;
  status: string | null;
  previsaoEntrega: string | null;
  tags: string[];
  observacao: string | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  valorReferencia: number | null;
  rendaAPartirDe: number | null;
  areaM2: number | null;
  externalUrl: string | null;
  imagemUrl: string | null;
  imagens: string[];
  externalKey: string;
  ativo: boolean;
  oruloBuildingId?: number | null;
  oruloStatus?: string | null;
  oruloSyncedAt?: string | null;
  matchTotal?: number;
  matchMuitoCompativeis?: number;
  matchInteressePrevio?: number;
  matchComputedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  construtora: { id: string; nome: string; cor: string | null } | null;
  localidade: { id: string; nome: string } | null;
};

export type CreateEmpreendimentoInput = {
  nome: string;
  construtoraId: string;
  cidade?: string;
  cor?: string | null;
  localidadeId?: string | null;
  endereco?: string | null;
  tipo?: string | null;
  status?: string | null;
  previsaoEntrega?: string | null;
  tags?: string[];
  observacao?: string | null;
  quartos?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  valorReferencia?: number | null;
  rendaAPartirDe?: number | null;
  areaM2?: number | null;
};

export type UpdateEmpreendimentoInput = {
  nome?: string;
  cor?: string | null;
  construtoraId?: string | null;
  localidadeId?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  tipo?: string | null;
  status?: string | null;
  previsaoEntrega?: string | null;
  tags?: string[];
  observacao?: string | null;
  quartos?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  valorReferencia?: number | null;
  rendaAPartirDe?: number | null;
  areaM2?: number | null;
  externalUrl?: string | null;
  ativo?: boolean;
};

export type EmpreendimentoMatchNivel = "muito_compativel" | "compativel";

export type EmpreendimentoMatch = {
  lead: {
    id: string;
    tipo: string;
    nome: string;
    telefone: string;
    cidade: string;
    bairro: string;
    orcamentoMax: number | null;
    quartosMin: number | null;
    vagasMin: number | null;
    tags: string[];
    corretorId: string | null;
    corretor: { id: string; name: string } | null;
  };
  score: number;
  nivel: EmpreendimentoMatchNivel;
  motivos: string[];
  interessePrevio: boolean;
};

export type EmpreendimentoMatchesResult = {
  empreendimentoId: string;
  total: number;
  muitoCompativeis: number;
  comInteressePrevio: number;
  matches: EmpreendimentoMatch[];
};

export async function fetchEmpreendimentoMatches(
  id: string,
): Promise<EmpreendimentoMatchesResult> {
  return apiFetch<EmpreendimentoMatchesResult>(
    `/empreendimentos/${id}/matches`,
  );
}

export async function fetchEmpreendimento(id: string): Promise<Empreendimento> {
  return apiFetch<Empreendimento>(`/empreendimentos/${id}`);
}

export async function fetchEmpreendimentos(params?: {
  construtoraId?: string;
  ativo?: boolean;
  sort?: string;
}): Promise<Empreendimento[]> {
  const qs = new URLSearchParams();
  if (params?.construtoraId) qs.set("construtoraId", params.construtoraId);
  if (params?.ativo !== undefined) qs.set("ativo", String(params.ativo));
  if (params?.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiFetch<Empreendimento[]>(
    `/empreendimentos${query ? `?${query}` : ""}`,
  );
}

export async function createEmpreendimento(
  input: CreateEmpreendimentoInput,
): Promise<Empreendimento> {
  return apiFetch<Empreendimento>("/empreendimentos", {
    method: "POST",
    body: input,
  });
}

export async function updateEmpreendimento(
  id: string,
  input: UpdateEmpreendimentoInput,
): Promise<Empreendimento> {
  return apiFetch<Empreendimento>(`/empreendimentos/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteEmpreendimento(
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/empreendimentos/${id}`, {
    method: "DELETE",
  });
}

export const EMPREENDIMENTO_MAX_IMAGES = 2;
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";

export function empreendimentoImagens(item: Empreendimento): string[] {
  if (item.imagens?.length) return item.imagens.slice(0, EMPREENDIMENTO_MAX_IMAGES);
  return item.imagemUrl ? [item.imagemUrl] : [];
}

export function empreendimentoLocalidadeNome(item: Empreendimento) {
  return item.localidade?.nome || item.cidade || "";
}

export async function uploadEmpreendimentoImagem(
  id: string,
  file: File,
): Promise<Empreendimento> {
  const data = new FormData();
  data.append("file", file);
  return apiFetch<Empreendimento>(`/empreendimentos/${id}/imagens`, {
    method: "POST",
    body: data,
  });
}

export async function deleteEmpreendimentoImagem(
  id: string,
  index: number,
): Promise<Empreendimento> {
  return apiFetch<Empreendimento>(`/empreendimentos/${id}/imagens/${index}`, {
    method: "DELETE",
  });
}
