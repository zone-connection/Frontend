import { apiFetch } from "@/lib/api";

export type ProcessoStatus = "rascunho" | "enviado" | "aprovado" | "reprovado";

export type Processo = {
  id: string;
  leadId: string;
  nome: string;
  fonte: string;
  telefone: string;
  email: string;
  estadoCivil: string;
  tipoRenda: string;
  cotista: boolean;
  dependente: boolean;
  empreendimentoId: string | null;
  corretorId: string | null;
  gerenteId: string | null;
  status: ProcessoStatus;
  enviadoAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: { id: string; nome: string; tipo: string };
  autor?: { id: string; name: string };
  corretor?: { id: string; name: string } | null;
  gerente?: { id: string; name: string } | null;
  empreendimento?: { id: string; nome: string } | null;
  retornos?: {
    id: string;
    resultado: "aprovado" | "reprovado";
    texto: string;
    arquivoId: string | null;
    createdAt: string;
    autor: { id: string; name: string };
  }[];
};

export type ProcessoInput = {
  leadId: string;
  nome?: string;
  fonte?: string;
  telefone?: string;
  email?: string;
  estadoCivil?: string;
  tipoRenda?: string;
  cotista?: boolean;
  dependente?: boolean;
  empreendimentoId?: string | null;
  corretorId?: string | null;
  gerenteId?: string | null;
};

export function fetchProcessos(status?: ProcessoStatus) {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<Processo[]>(`/processos${qs}`);
}

export function fetchProcesso(id: string) {
  return apiFetch<Processo>(`/processos/${id}`);
}

export function createProcesso(body: ProcessoInput) {
  return apiFetch<Processo>("/processos", { method: "POST", body });
}

export function updateProcesso(id: string, body: Omit<ProcessoInput, "leadId">) {
  return apiFetch<Processo>(`/processos/${id}`, { method: "PATCH", body });
}

export function enviarProcesso(id: string) {
  return apiFetch<Processo>(`/processos/${id}/enviar`, { method: "POST" });
}

export function deleteProcesso(id: string) {
  return apiFetch<void>(`/processos/${id}`, { method: "DELETE" });
}

export function retornarProcesso(
  id: string,
  body: {
    resultado: "aprovado" | "reprovado";
    texto?: string;
    arquivoId?: string | null;
  },
) {
  return apiFetch<Processo>(`/processos/${id}/retorno`, {
    method: "POST",
    body,
  });
}
