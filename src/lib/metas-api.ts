import { apiFetch } from "@/lib/api";

export const META_TIPOS = ["vendas", "documentacoes", "vgv"] as const;
export type MetaTipo = (typeof META_TIPOS)[number];

export const META_PERIODOS = [
  "diaria",
  "semanal",
  "mensal",
  "trimestral",
  "semestral",
  "anual",
] as const;
export type MetaPeriodo = (typeof META_PERIODOS)[number];

export const META_ESCOPOS = ["corretor", "gerente", "imobiliaria"] as const;
export type MetaEscopo = (typeof META_ESCOPOS)[number];

export const META_TIPO_LABEL: Record<MetaTipo, string> = {
  vendas: "Vendas",
  documentacoes: "Documentações",
  vgv: "VGV",
};

export const META_PERIODO_LABEL: Record<MetaPeriodo, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export const META_ESCOPO_LABEL: Record<MetaEscopo, string> = {
  corretor: "Corretor",
  gerente: "Gerente / equipe",
  imobiliaria: "Imobiliária",
};

export type Meta = {
  id: string;
  escopo: MetaEscopo;
  origem: "pessoal" | "gerente" | "admin";
  tipo: MetaTipo;
  periodo: MetaPeriodo;
  valor: number;
  inicio: string;
  fim: string;
  atual: number;
  percentual: number;
  corretorId: string | null;
  gerenteId: string | null;
  criadorId: string;
  corretor: {
    id: string;
    name: string;
    equipeId: string | null;
    equipe: { id: string; name: string } | null;
  } | null;
  gerente: {
    id: string;
    name: string;
    equipeGerenciada: { id: string; name: string } | null;
  } | null;
  criador: { id: string; name: string };
  ciclo?: "atual" | "anterior";
  anterior?: {
    valor: number;
    atual: number;
    percentual: number;
    inicio: string;
    fim: string;
  } | null;
};

export type CreateMetaInput = {
  escopo?: MetaEscopo;
  corretorId?: string;
  gerenteId?: string;
  tipo: MetaTipo;
  periodo: MetaPeriodo;
  valor: number;
};

export function fetchMetas() {
  return apiFetch<Meta[]>("/metas");
}

export function createMeta(input: CreateMetaInput) {
  return apiFetch<Meta>("/metas", { method: "POST", body: input });
}

export function updateMeta(id: string, valor: number) {
  return apiFetch<Meta>(`/metas/${id}`, {
    method: "PATCH",
    body: { valor },
  });
}

export function deleteMeta(id: string) {
  return apiFetch<{ ok: true }>(`/metas/${id}`, { method: "DELETE" });
}
