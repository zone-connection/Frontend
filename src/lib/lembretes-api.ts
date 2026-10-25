import { apiFetch } from "@/lib/api";

export type LembreteRecorrencia =
  | "sempre"
  | "diaria"
  | "semanal"
  | "mensal"
  | "uma_vez";

export type LembretePessoal = {
  id: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
  recorrencia: LembreteRecorrencia;
  reconhecidoEm: string | null;
  createdAt: string;
  updatedAt: string;
};

export const LEMBRETE_RECORRENCIA_LABEL: Record<LembreteRecorrencia, string> = {
  sempre: "Toda vez que entrar",
  diaria: "Uma vez por dia",
  semanal: "Uma vez por semana",
  mensal: "Uma vez por mês",
  uma_vez: "Só na próxima entrada",
};

export const LEMBRETE_RECORRENCIAS: LembreteRecorrencia[] = [
  "sempre",
  "diaria",
  "semanal",
  "mensal",
  "uma_vez",
];

export const LOGIN_LEMBRETES_FLAG = "crm_show_login_lembretes";

export function fetchLembretes() {
  return apiFetch<LembretePessoal[]>("/lembretes");
}

export function fetchLembretesPendentes() {
  return apiFetch<LembretePessoal[]>("/lembretes/pendentes");
}

export function createLembrete(input: {
  titulo: string;
  descricao?: string;
  recorrencia?: LembreteRecorrencia;
}) {
  return apiFetch<LembretePessoal>("/lembretes", { method: "POST", body: input });
}

export function updateLembrete(
  id: string,
  input: {
    titulo?: string;
    descricao?: string;
    recorrencia?: LembreteRecorrencia;
    ativo?: boolean;
  },
) {
  return apiFetch<LembretePessoal>(`/lembretes/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteLembrete(id: string) {
  return apiFetch<{ ok: boolean }>(`/lembretes/${id}`, { method: "DELETE" });
}

export function reconhecerLembretesPendentes() {
  return apiFetch<{ ok: boolean; count: number }>("/lembretes/reconhecer", {
    method: "POST",
  });
}
