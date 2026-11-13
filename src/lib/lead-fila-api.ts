import { apiFetch } from "@/lib/api";

export type FilaCampanha = {
  chave: string;
  nome: string;
  canal: "meta" | "olx" | string;
};

export type FilaMembro = {
  id: string;
  tipo?: "corretor" | "equipe";
  userId: string | null;
  equipeId?: string | null;
  nome: string;
  campanhas?: FilaCampanha[];
  avatar: string | null;
  role: string;
  cargo: string | null;
  ativo: boolean;
  ativoNaFila: boolean;
  ordem: number;
  proximo: boolean;
  recebidos: number;
  ultimaAtribuicaoAt: string | null;
};

export type FilaPainel = {
  ativa: boolean;
  filtroCampanhas?: boolean;
  outrosCanaisNaFila?: boolean;
  redistribuirMinutos: number;
  ativos: number;
  inativos: number;
  distribuidos: number;
  falhas: number;
  semResponsavel: number;
  porCargo: { corretor: number; gerente: number; treinee: number };
  proximoUserId: string | null;
  membros: FilaMembro[];
};

export type FilaEvento = {
  id: string;
  tipo: string;
  leadId: string | null;
  origem: string | null;
  detalhe: string | null;
  createdAt: string;
  usuario: string | null;
  ator: string | null;
};

export type FilaElegivel = {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
};

export function fetchFilaPainel(de?: string, ate?: string) {
  const qs = new URLSearchParams();
  if (de) qs.set("de", de);
  if (ate) qs.set("ate", ate);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<FilaPainel>(`/leads/distribuir/fila${suffix}`);
}

export function fetchFilaHistorico() {
  return apiFetch<FilaEvento[]>("/leads/distribuir/fila/historico");
}

export function fetchFilaElegiveis() {
  return apiFetch<FilaElegivel[]>("/leads/distribuir/fila/elegiveis");
}

export function setFilaAtiva(ativa: boolean) {
  return apiFetch<{ ativa: boolean }>("/leads/distribuir/fila", {
    method: "PATCH",
    body: { ativa },
  });
}

export function setFilaPrazo(minutos: number) {
  return apiFetch<{ redistribuirMinutos: number }>("/leads/distribuir/fila/prazo", {
    method: "PATCH",
    body: { minutos },
  });
}

export function addFilaMembro(userId: string) {
  return apiFetch("/leads/distribuir/fila/membros", { method: "POST", body: { userId } });
}

export function setFilaMembroAtivo(id: string, ativo: boolean) {
  return apiFetch(`/leads/distribuir/fila/membros/${id}`, {
    method: "PATCH",
    body: { ativo },
  });
}

export function removeFilaMembro(id: string) {
  return apiFetch(`/leads/distribuir/fila/membros/${id}`, { method: "DELETE" });
}

export function reordenarFila(ids: string[]) {
  return apiFetch("/leads/distribuir/fila/ordem", { method: "PUT", body: { ids } });
}

export function fetchFilaCampanhas() {
  return apiFetch<FilaCampanha[]>("/leads/distribuir/fila/campanhas");
}

export function setFilaFiltros(filtros: {
  filtroCampanhas: boolean;
  outrosCanaisNaFila: boolean;
}) {
  return apiFetch("/leads/distribuir/fila/filtros", { method: "PATCH", body: filtros });
}

export function addFilaEquipe(equipeId: string) {
  return apiFetch("/leads/distribuir/fila/equipes", {
    method: "POST",
    body: { equipeId },
  });
}

export function setFilaCampanhasMembro(id: string, campanhas: FilaCampanha[]) {
  return apiFetch(`/leads/distribuir/fila/membros/${id}/campanhas`, {
    method: "PUT",
    body: { campanhas },
  });
}
