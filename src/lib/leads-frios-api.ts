import { apiFetch } from "@/lib/api";
import { mapApiLead, type ApiLead } from "@/lib/leads-api";
import type { Lead } from "@/lib/crm-types";

export type LeadFrioRow = {
  nome: string;
  telefone: string;
  email?: string;
  cidade?: string;
  bairro?: string;
  origem?: string;
  renda?: number | null;
  tipoRenda?: string;
  estadoCivil?: string;
  empreendimento?: string;
};

export type LeadsFriosPage = {
  items: Array<Lead & { baseFriaEm?: string | null }>;
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchLeadsFrios(params: {
  page: number;
  pageSize: 20 | 50;
  q?: string;
}): Promise<LeadsFriosPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  const q = params.q?.trim();
  if (q) search.set("q", q);
  const data = await apiFetch<{
    items: ApiLead[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/leads-frios?${search.toString()}`);
  return {
    items: data.items.map((row) => ({
      ...mapApiLead(row),
      baseFriaEm: row.baseFriaEm ?? null,
    })),
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
  };
}

export async function fetchLeadsFriosIds(q?: string) {
  const search = new URLSearchParams();
  const termo = q?.trim();
  if (termo) search.set("q", termo);
  const suffix = search.size ? `?${search.toString()}` : "";
  const data = await apiFetch<{ ids: string[] }>(`/leads-frios/ids${suffix}`);
  return data.ids;
}

export function importarLeadsFrios(rows: LeadFrioRow[]) {
  return apiFetch<{ created: number }>("/leads-frios/importar", {
    method: "POST",
    body: { rows },
  });
}

export function distribuirLeadsFrios(input: {
  ids: string[];
  alocacoes: Array<{ corretorId: string; quantidade: number }>;
}) {
  return apiFetch<{ updated: number }>("/leads-frios/distribuir", {
    method: "POST",
    body: input,
  });
}

export function puxarLeadsFrios(ids: string[]) {
  return apiFetch<{ updated: number }>("/leads-frios/puxar", {
    method: "POST",
    body: { ids },
  });
}

export type EnvioFrioLinha = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  existente?: string;
};

export function conferirEnvioLeadsFrios(ids: string[]) {
  return apiFetch<{
    prontos: EnvioFrioLinha[];
    jaNoBolsao: EnvioFrioLinha[];
    prontosCount: number;
    repetidosCount: number;
  }>("/leads-frios/enviar/conferir", {
    method: "POST",
    body: { ids },
  });
}

export function enviarLeadsFrios(ids: string[]) {
  return apiFetch<{ updated: number; skipped: number }>("/leads-frios/enviar", {
    method: "POST",
    body: { ids },
  });
}

export function devolverLeadFrio(id: string) {
  return apiFetch<ApiLead>(`/leads-frios/${id}/devolver`, { method: "POST" });
}

export function apagarLeadsFrios(ids: string[]) {
  return apiFetch<{ deleted: number }>("/leads-frios/apagar", {
    method: "POST",
    body: { ids },
  });
}

export function tempoNaBaseFria(iso?: string | null) {
  if (!iso) return "—";
  const dias = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
  if (dias < 7) return dias === 1 ? "1 dia" : `${dias} dias`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return semanas === 1 ? "1 semana" : `${semanas} semanas`;
  }
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return meses === 1 ? "1 mês" : `${meses} meses`;
  }
  const anos = Math.floor(dias / 365);
  return anos === 1 ? "1 ano" : `${anos} anos`;
}
