import { apiFetch } from "@/lib/api";

export type ProcessoStatus = "rascunho" | "enviado" | "aprovado" | "reprovado";

export type ProcessoEtapa =
  | "nova_avaliacao"
  | "retrabalho"
  | "analise"
  | "bacen"
  | "spc_serasa"
  | "pendencia_documentacional"
  | "aguardando_qv"
  | "reprovado"
  | "condicionado"
  | "aprovado"
  | "em_reserva";

export const PROCESSOS_ETAPAS: {
  id: ProcessoEtapa;
  label: string;
  color: string;
}[] = [
  { id: "nova_avaliacao", label: "Nova Avaliação", color: "bg-cyan-500 text-white" },
  { id: "retrabalho", label: "Retrabalho", color: "bg-amber-500 text-amber-950" },
  { id: "analise", label: "Análise", color: "bg-blue-500 text-white" },
  { id: "bacen", label: "BACEN", color: "bg-indigo-500 text-white" },
  { id: "spc_serasa", label: "SPC/SERASA", color: "bg-violet-500 text-white" },
  {
    id: "pendencia_documentacional",
    label: "Pendência Documentacional",
    color: "bg-orange-500 text-white",
  },
  { id: "aguardando_qv", label: "Aguardando QV", color: "bg-sky-500 text-white" },
  { id: "reprovado", label: "Reprovado", color: "bg-rose-500 text-white" },
  { id: "condicionado", label: "Condicionado", color: "bg-yellow-400 text-yellow-950" },
  { id: "aprovado", label: "Aprovado", color: "bg-emerald-500 text-white" },
  { id: "em_reserva", label: "Em Reserva", color: "bg-teal-500 text-white" },
];

export const PROCESSO_ETAPA_LABEL: Record<ProcessoEtapa, string> =
  Object.fromEntries(
    PROCESSOS_ETAPAS.map((e) => [e.id, e.label]),
  ) as Record<ProcessoEtapa, string>;

export type ProcessoPendenciaStatus = "aberta" | "reenviada" | "encerrada";

export type ProcessoPendencia = {
  id: string;
  titulo: string;
  descricao: string;
  textoComplementar: string;
  arquivoIds: string[];
  status: ProcessoPendenciaStatus;
  createdAt: string;
  autor: { id: string; name: string };
  correcoes: {
    id: string;
    comentario: string;
    arquivoIds: string[];
    createdAt: string;
    autor: { id: string; name: string };
  }[];
};

export type ProcessoMovimento = {
  id: string;
  deEtapa: ProcessoEtapa | null;
  paraEtapa: ProcessoEtapa;
  observacao: string;
  createdAt: string;
  autor: { id: string; name: string };
};

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
  etapa: ProcessoEtapa;
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
  pendencias?: ProcessoPendencia[];
  movimentos?: ProcessoMovimento[];
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

export function reenviarProcesso(id: string) {
  return apiFetch<Processo>(`/processos/${id}/reenviar`, { method: "POST" });
}

export function moverProcessoEtapa(
  id: string,
  body: { etapa: ProcessoEtapa; observacao?: string },
) {
  return apiFetch<Processo>(`/processos/${id}/etapa`, {
    method: "PATCH",
    body,
  });
}

export function criarPendenciaProcesso(
  id: string,
  body: {
    titulo: string;
    descricao?: string;
    textoComplementar?: string;
    arquivoIds?: string[];
  },
) {
  return apiFetch<Processo>(`/processos/${id}/pendencias`, {
    method: "POST",
    body,
  });
}

export function criarCorrecaoPendencia(
  processoId: string,
  pendenciaId: string,
  body: { comentario?: string; arquivoIds?: string[] },
) {
  return apiFetch<Processo>(
    `/processos/${processoId}/pendencias/${pendenciaId}/correcoes`,
    { method: "POST", body },
  );
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
