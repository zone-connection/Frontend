import { apiFetch } from "@/lib/api";

export type SuporteItem = {
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
  prazoEm: string | null;
  atrasado: boolean;
};

export type SuporteDetalhe = SuporteItem & {
  mensagens: Array<{
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

export function fetchSuportes(filtro: {
  q?: string;
  status?: string;
  tenantId?: string;
  prioridade?: string;
  categoria?: string;
  responsavelId?: string;
}) {
  const query = new URLSearchParams();
  if (filtro.q) query.set("q", filtro.q);
  if (filtro.status) query.set("status", filtro.status);
  if (filtro.tenantId) query.set("tenantId", filtro.tenantId);
  if (filtro.prioridade) query.set("prioridade", filtro.prioridade);
  if (filtro.categoria) query.set("categoria", filtro.categoria);
  if (filtro.responsavelId) query.set("responsavelId", filtro.responsavelId);
  const qs = query.toString();
  return apiFetch<SuporteItem[]>(`/suporte${qs ? `?${qs}` : ""}`);
}

export function fetchSuporte(id: string) {
  return apiFetch<SuporteDetalhe>(`/suporte/${id}`);
}

export function createSuporteChamado(input: {
  tenantId: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade?: "baixa" | "normal" | "alta" | "urgente";
  prazoEm?: string;
}) {
  return apiFetch<SuporteItem>("/suporte", { method: "POST", body: input });
}

export function updateSuporteChamado(id: string, input: { status?: string; responsavelId?: string }) {
  return apiFetch<SuporteItem>(`/suporte/${id}`, { method: "PATCH", body: input });
}

export function addSuporteMensagem(id: string, input: { texto: string; interna?: boolean }) {
  return apiFetch<SuporteDetalhe>(`/suporte/${id}/mensagens`, { method: "POST", body: input });
}
