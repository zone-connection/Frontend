import { apiFetch } from "@/lib/api";

export type MuralChaveStatus = "disponivel" | "em_uso";
export type MuralChaveLocal = "proprietario" | "imobiliaria" | "corretor" | "outro";

export type MuralChave = {
  id: string;
  identificador: string;
  status: MuralChaveStatus;
  statusLabel: string;
  local: MuralChaveLocal;
  localDescricao: string;
  comQuem: string;
  unidade: string;
  imovelLabel: string;
  empreendimento: { id: string; nome: string } | null;
  imovel: { id: string; label: string } | null;
  responsavelAtual: { id: string; name: string } | null;
  retiradoPor: { id: string; name: string } | null;
  retiradaRegistradaPor: { id: string; name: string } | null;
  retiradaEm: string | null;
  previsaoDevolucao: string | null;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
};

export type MuralChaveHistoricoItem = {
  id: string;
  tipo: string;
  tipoLabel: string;
  manual: boolean;
  identificador: string;
  identificadorAnterior: string | null;
  empreendimentoNome: string | null;
  imovelLabel: string;
  quemRetirouNome: string | null;
  quemRegistrouRetiradaNome: string | null;
  retiradaEm: string | null;
  previsaoDevolucao: string | null;
  quemDevolveuNome: string | null;
  quemRecebeuDevolucaoNome: string | null;
  devolucaoEm: string | null;
  confirmacaoPendente: boolean;
  confirmadoEm: string | null;
  confirmadoParaNome: string | null;
  autorId: string;
  autorNome: string;
  observacao: string;
  createdAt: string;
};

export type MuralChaveOpcoes = {
  empreendimentos: { id: string; nome: string }[];
  imoveis: { id: string; label: string }[];
  usuarios: { id: string; name: string; role: string }[];
};

export type MuralChavePendencia = {
  movimentoId: string;
  chaveId: string;
  identificador: string;
  empreendimentoNome: string | null;
  imovelLabel: string;
  devolucaoEm: string | null;
  recebidoPorId: string | null;
  recebidoPorNome: string;
};

export type MuralChaveInput = {
  identificador?: string;
  empreendimentoId?: string | null;
  imovelId?: string | null;
  unidade?: string;
  local?: MuralChaveLocal;
  localDescricao?: string;
  observacoes?: string;
};

const LOCAIS: { id: MuralChaveLocal; label: string }[] = [
  { id: "imobiliaria", label: "Na imobiliária" },
  { id: "proprietario", label: "Com o proprietário" },
  { id: "outro", label: "Outro local / responsável" },
];

export const MURAL_LOCAIS_CADASTRO = LOCAIS;

export function formatChaveQuando(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const data = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${data} às ${hora}`;
}

export function fetchMuralChaves(params?: {
  q?: string;
  status?: MuralChaveStatus | "";
  empreendimentoId?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.empreendimentoId) search.set("empreendimentoId", params.empreendimentoId);
  const qs = search.toString();
  return apiFetch<MuralChave[]>(`/mural-chaves${qs ? `?${qs}` : ""}`);
}

export function fetchMuralChaveOpcoes() {
  return apiFetch<MuralChaveOpcoes>("/mural-chaves/opcoes");
}

export function fetchMuralChavePendencias() {
  return apiFetch<MuralChavePendencia[]>("/mural-chaves/pendencias");
}

export function fetchMuralChaveHistorico(id: string) {
  return apiFetch<{
    identificadoresAnteriores: string[];
    itens: MuralChaveHistoricoItem[];
  }>(`/mural-chaves/${id}/historico`);
}

export function createMuralChave(body: MuralChaveInput) {
  return apiFetch<MuralChave>("/mural-chaves", { method: "POST", body });
}

export function updateMuralChave(id: string, body: MuralChaveInput) {
  return apiFetch<MuralChave>(`/mural-chaves/${id}`, { method: "PATCH", body });
}

export function retirarMuralChave(
  id: string,
  body: { previsaoDevolucao?: string; observacao?: string },
) {
  return apiFetch<MuralChave>(`/mural-chaves/${id}/retirada`, {
    method: "POST",
    body,
  });
}

export function retiradaManualMuralChave(
  id: string,
  body: {
    corretorId: string;
    retiradaEm?: string;
    previsaoDevolucao?: string;
    observacao?: string;
  },
) {
  return apiFetch<MuralChave>(`/mural-chaves/${id}/retirada-manual`, {
    method: "POST",
    body,
  });
}

export function devolverMuralChave(
  id: string,
  body: {
    local: MuralChaveLocal;
    localDescricao?: string;
    devolucaoEm?: string;
    observacao?: string;
  },
) {
  return apiFetch<MuralChave>(`/mural-chaves/${id}/devolucao`, {
    method: "POST",
    body,
  });
}

export function confirmarDevolucaoMuralChave(movimentoId: string, entregueParaId: string) {
  return apiFetch<{ ok: boolean }>(
    `/mural-chaves/movimentos/${movimentoId}/confirmar`,
    { method: "POST", body: { entregueParaId } },
  );
}
