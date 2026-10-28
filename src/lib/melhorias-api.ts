import { apiFetch } from "@/lib/api";

export type MelhoriaItem = {
  id: string;
  codigo: string;
  tenantId: string;
  tenantNome: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  responsavelNome: string | null;
  justificativaDecisao: string;
  recente: boolean;
  updatedAt: string;
};

export type MelhoriaDetalhe = MelhoriaItem & {
  comentarios: Array<{
    id: string;
    texto: string;
    interna: boolean;
    createdAt: string;
    autorNome: string | null;
  }>;
  historico: Array<{
    id: string;
    acao: string;
    detalhe: string;
    createdAt: string;
    autorNome: string | null;
  }>;
};

export function fetchMelhorias(filtro: {
  q?: string;
  status?: string;
  tenantId?: string;
  prioridade?: string;
  categoria?: string;
  responsavelId?: string;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filtro)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return apiFetch<MelhoriaItem[]>(`/melhorias${qs ? `?${qs}` : ""}`);
}

export function fetchMelhoria(id: string) {
  return apiFetch<MelhoriaDetalhe>(`/melhorias/${id}`);
}

export function createMelhoria(input: {
  tenantId: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade?: string;
}) {
  return apiFetch<MelhoriaItem>("/melhorias", { method: "POST", body: input });
}

export function updateMelhoria(
  id: string,
  input: { status?: string; responsavelId?: string; justificativaDecisao?: string; titulo?: string },
) {
  return apiFetch<MelhoriaItem>(`/melhorias/${id}`, { method: "PATCH", body: input });
}

export function addMelhoriaComentario(id: string, input: { texto: string; interna?: boolean }) {
  return apiFetch<MelhoriaDetalhe>(`/melhorias/${id}/comentarios`, { method: "POST", body: input });
}
