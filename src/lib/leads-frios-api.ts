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

export async function fetchLeadsFrios(): Promise<Array<Lead & { baseFriaEm?: string | null }>> {
  const rows = await apiFetch<ApiLead[]>("/leads-frios");
  return rows.map((row) => ({
    ...mapApiLead(row),
    baseFriaEm: row.baseFriaEm ?? null,
  }));
}

export function importarLeadsFrios(rows: LeadFrioRow[]) {
  return apiFetch<{ created: number }>("/leads-frios/importar", {
    method: "POST",
    body: { rows },
  });
}

export function puxarLeadsFrios(ids: string[]) {
  return apiFetch<{ updated: number }>("/leads-frios/puxar", {
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
