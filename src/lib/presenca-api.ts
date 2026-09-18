import { apiFetch } from "@/lib/api";

export type PresencaNatureza =
  | "presente"
  | "meio_periodo"
  | "falta"
  | "falta_justificada";

export type PresencaTipo = {
  id: string;
  nome: string;
  sigla: string;
  natureza: PresencaNatureza;
  cor: string;
  sortOrder: number;
  ativo: boolean;
  padrao: boolean;
  roles: string[];
};

export type PresencaCelula = {
  id: string;
  tipoId: string;
  sigla: string;
  nome: string;
  cor: string;
  natureza: PresencaNatureza;
  observacao: string;
};

export type PresencaUsuario = {
  userId: string;
  nome: string;
  role: string;
  equipe: string | null;
  dias: Record<string, PresencaCelula | null>;
};

export type PresencaResumoDia = {
  data: string;
  vieram: number;
  equivalente: number;
  faltas: number;
  justificadas: number;
};

export type PresencaResumo = {
  porDia: PresencaResumoDia[];
  mediaVieram: number;
  mediaEquivalente: number;
  totalVieramDia: number;
};

export type PresencaMes = {
  ano: number;
  mes: number;
  dias: string[];
  tipos: PresencaTipo[];
  podeEditar: boolean;
  podeTipos: boolean;
  usuarios: PresencaUsuario[];
  resumo: PresencaResumo;
  resumoAnterior: PresencaResumo & { ano: number; mes: number };
};

export function fetchPresencaMes(ano: number, mes: number) {
  return apiFetch<PresencaMes>(`/presenca?ano=${ano}&mes=${mes}`);
}

export function fetchPresencaTipos() {
  return apiFetch<PresencaTipo[]>("/presenca/tipos");
}

export function createPresencaTipo(body: {
  nome: string;
  sigla: string;
  natureza: PresencaNatureza;
  cor?: string;
  sortOrder?: number;
  roles?: string[];
}) {
  return apiFetch<PresencaTipo>("/presenca/tipos", {
    method: "POST",
    body,
  });
}

export function updatePresencaTipo(
  id: string,
  body: Partial<{
    nome: string;
    sigla: string;
    natureza: PresencaNatureza;
    cor: string;
    sortOrder: number;
    ativo: boolean;
    roles: string[];
  }>,
) {
  return apiFetch<PresencaTipo>(`/presenca/tipos/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deletePresencaTipo(id: string) {
  return apiFetch<{ ok: boolean }>(`/presenca/tipos/${id}`, {
    method: "DELETE",
  });
}

export function upsertPresencaLancamento(body: {
  userId: string;
  data: string;
  tipoId?: string | null;
  observacao?: string;
}) {
  return apiFetch("/presenca/lancamento", { method: "PUT", body });
}
