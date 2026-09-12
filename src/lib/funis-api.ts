import { apiFetch } from "@/lib/api";

export type FunilEtapaPapel = "inicial" | "analise" | "venda" | "perdido";

export type FunilTipo = "comercial" | "captacao" | "venda_usados";

export const FUNIL_TIPO_LABEL: Record<FunilTipo, string> = {
  comercial: "Comercial",
  captacao: "Captação",
  venda_usados: "Venda de usados",
};

export const FUNIL_TIPOS: FunilTipo[] = [
  "comercial",
  "captacao",
  "venda_usados",
];

export function parseFunilTipo(tipo: unknown): FunilTipo | null {
  if (tipo === "comercial" || tipo === "captacao" || tipo === "venda_usados") {
    return tipo;
  }
  return null;
}

/** Tipo gravado; `null` = legado sem vínculo (API antiga ou campo ausente). */
export function funilTipoOf(funil: { tipo?: FunilTipo | null }): FunilTipo | null {
  return parseFunilTipo(funil.tipo);
}

export const FUNIL_PADRAO_ETAPAS_COUNT: Record<FunilTipo, number> = {
  comercial: 11,
  captacao: 8,
  venda_usados: 9,
};

export type FunilEtapa = {
  id: string;
  funilId: string;
  label: string;
  slug: string;
  color: string;
  sortOrder: number;
  active: boolean;
  papel: FunilEtapaPapel | null;
  prazoValor: number | null;
  prazoUnidade: "minutos" | "horas" | "dias";
  alertaAntecedenciaPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type Funil = {
  id: string;
  tenantId: string;
  name: string;
  tipo?: FunilTipo | null;
  ativo: boolean;
  inatividadeValor: number;
  inatividadeUnidade: "minutos" | "horas" | "dias";
  atrasoLiberacaoAtiva?: boolean;
  atrasoLiberacaoDestino?: "caca_lead" | "retrabalho";
  atrasoLiberacaoValor?: number;
  atrasoLiberacaoUnidade?: "minutos" | "horas" | "dias";
  createdAt: string;
  updatedAt: string;
  etapas: FunilEtapa[];
};

export type CreateFunilInput = {
  name: string;
  tipo?: FunilTipo;
  usarPadrao?: boolean;
  etapas?: Array<{
    label: string;
    color?: string;
    sortOrder?: number;
    papel?: FunilEtapaPapel | null;
  }>;
  ativar?: boolean;
};

export type CreateFunilEtapaInput = {
  label: string;
  color?: string;
  sortOrder?: number;
  papel?: FunilEtapaPapel | null;
  prazoValor?: number | null;
  prazoUnidade?: "minutos" | "horas" | "dias";
  alertaAntecedenciaPercent?: number;
};

export type UpdateFunilEtapaInput = {
  label?: string;
  color?: string;
  active?: boolean;
  papel?: FunilEtapaPapel | null;
  prazoValor?: number | null;
  prazoUnidade?: "minutos" | "horas" | "dias";
  alertaAntecedenciaPercent?: number;
};

function tipoQuery(tipo?: FunilTipo) {
  return tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
}

export async function fetchFunis(tipo?: FunilTipo): Promise<Funil[]> {
  return apiFetch<Funil[]>(`/funis${tipoQuery(tipo)}`);
}

export async function fetchFunilAtivo(
  tipo: FunilTipo = "comercial",
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/ativo${tipoQuery(tipo)}`);
}

export async function createFunil(input: CreateFunilInput): Promise<Funil> {
  return apiFetch<Funil>("/funis", { method: "POST", body: input });
}

export async function updateFunil(
  id: string,
  input: {
    name?: string;
    tipo?: FunilTipo;
    inatividadeValor?: number;
    inatividadeUnidade?: "minutos" | "horas" | "dias";
    atrasoLiberacaoAtiva?: boolean;
    atrasoLiberacaoDestino?: "caca_lead" | "retrabalho";
    atrasoLiberacaoValor?: number;
    atrasoLiberacaoUnidade?: "minutos" | "horas" | "dias";
  },
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${id}`, { method: "PATCH", body: input });
}

export async function ativarFunil(id: string): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${id}/ativar`, { method: "POST" });
}

export async function deleteFunil(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/funis/${id}`, { method: "DELETE" });
}

export async function addFunilEtapa(
  funilId: string,
  input: CreateFunilEtapaInput,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas`, {
    method: "POST",
    body: input,
  });
}

export async function updateFunilEtapa(
  funilId: string,
  etapaId: string,
  input: UpdateFunilEtapaInput,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas/${etapaId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function reorderFunilEtapas(
  funilId: string,
  orderedIds: string[],
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas/reorder`, {
    method: "PATCH",
    body: { orderedIds },
  });
}

export async function deleteFunilEtapa(
  funilId: string,
  etapaId: string,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas/${etapaId}`, {
    method: "DELETE",
  });
}

export async function installFunilEtapasPadrao(
  funilId: string,
): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/etapas-padrao`, { method: "POST" });
}

export async function recoverFunilEtapas(funilId: string): Promise<Funil> {
  return apiFetch<Funil>(`/funis/${funilId}/recuperar-etapas`, {
    method: "POST",
  });
}
