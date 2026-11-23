import { apiFetch } from "@/lib/api";

export type CadenciaEtapa = {
  id: string;
  ordem: number;
  dia: number;
  acao: string;
  descricao: string;
};

export type ChecklistItem = {
  id: string;
  ordem: number;
  texto: string;
  obrigatorio: boolean;
  feito?: boolean;
};

export type ChecklistModelo = {
  id: string;
  nome: string;
  funilId: string | null;
  funilNome?: string | null;
  ordem: number;
  itens: ChecklistItem[];
};

export type AtendimentoConfig = {
  cadenciaAtiva: boolean;
  checklistAtivo: boolean;
  etapas: CadenciaEtapa[];
  modelos: ChecklistModelo[];
  funis: { id: string; name: string }[];
};

export type AtendimentoPainel = {
  cadenciaAtiva: boolean;
  checklistAtivo: boolean;
  cadencia: {
    etapas: Array<CadenciaEtapa & { status: "pendente" | "atrasada" | "concluida"; previstaPara: string; concluidaEm: string | null }>;
    historico: { id: string; dia: number; acao: string; descricao: string; concluidaEm: string }[];
  } | null;
  checklist: {
    completo: boolean;
    modelos: ChecklistModelo[];
  } | null;
};

export type SlaResumo = {
  dentroDoPrazo: number;
  slaVencido: number;
  redistribuicoes: number;
  porCorretor: { corretorId: string; nome: string; leads: number; tempoMedioHoras: number }[];
};

export function fetchAtendimentoConfig() {
  return apiFetch<AtendimentoConfig>("/atendimento/config");
}

export function salvarFlagsAtendimento(body: { cadenciaAtiva?: boolean; checklistAtivo?: boolean }) {
  return apiFetch("/atendimento/config", { method: "PATCH", body });
}

export function criarEtapaCadencia(body: { dia: number; acao: string; descricao?: string }) {
  return apiFetch<CadenciaEtapa>("/atendimento/cadencia/etapas", { method: "POST", body });
}

export function editarEtapaCadencia(id: string, body: { dia?: number; acao?: string; descricao?: string }) {
  return apiFetch<CadenciaEtapa>(`/atendimento/cadencia/etapas/${id}`, { method: "PATCH", body });
}

export function excluirEtapaCadencia(id: string) {
  return apiFetch(`/atendimento/cadencia/etapas/${id}`, { method: "DELETE" });
}

export function ordenarEtapasCadencia(ids: string[]) {
  return apiFetch("/atendimento/cadencia/etapas/ordem", { method: "PATCH", body: { ids } });
}

export function criarChecklist(body: { nome: string; funilId?: string | null }) {
  return apiFetch<ChecklistModelo>("/atendimento/checklist/modelos", { method: "POST", body });
}

export function excluirChecklist(id: string) {
  return apiFetch(`/atendimento/checklist/modelos/${id}`, { method: "DELETE" });
}

export function criarItemChecklist(modeloId: string, body: { texto: string; obrigatorio?: boolean }) {
  return apiFetch<ChecklistItem>(`/atendimento/checklist/modelos/${modeloId}/itens`, { method: "POST", body });
}

export function editarItemChecklist(id: string, body: { texto?: string; obrigatorio?: boolean }) {
  return apiFetch(`/atendimento/checklist/itens/${id}`, { method: "PATCH", body });
}

export function excluirItemChecklist(id: string) {
  return apiFetch(`/atendimento/checklist/itens/${id}`, { method: "DELETE" });
}

export function fetchSlaResumo() {
  return apiFetch<SlaResumo>("/atendimento/sla");
}

export function fetchChecklistCompletos() {
  return apiFetch<{ ativo: boolean; leadIds: string[] }>("/atendimento/checklist/completos");
}

export function fetchAtendimentoLead(leadId: string) {
  return apiFetch<AtendimentoPainel>(`/atendimento/leads/${leadId}`);
}

export function concluirCadencia(leadId: string, etapaId: string) {
  return apiFetch<AtendimentoPainel>(`/atendimento/leads/${leadId}/cadencia/${etapaId}`, { method: "POST" });
}

export function desfazerCadencia(leadId: string, etapaId: string) {
  return apiFetch<AtendimentoPainel>(`/atendimento/leads/${leadId}/cadencia/${etapaId}`, { method: "DELETE" });
}

export function marcarChecklist(leadId: string, itemId: string, feito: boolean) {
  return apiFetch<AtendimentoPainel>(`/atendimento/leads/${leadId}/checklist/${itemId}`, {
    method: "POST",
    body: { feito },
  });
}
