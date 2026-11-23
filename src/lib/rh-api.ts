import { apiFetch, apiFetchFile } from "@/lib/api";

export type RhEtapa =
  | "novo"
  | "em_contato"
  | "entrevista"
  | "aprovado"
  | "integracao"
  | "ativo"
  | "desistente"
  | "reprovado";

export const ETAPAS: { id: RhEtapa; label: string }[] = [
  { id: "novo", label: "Novo candidato" },
  { id: "em_contato", label: "Em contato" },
  { id: "entrevista", label: "Entrevista" },
  { id: "aprovado", label: "Aprovado" },
  { id: "integracao", label: "Integração" },
  { id: "ativo", label: "Ativo" },
];

export const ETAPA_LABEL: Record<RhEtapa, string> = {
  novo: "Novo candidato",
  em_contato: "Em contato",
  entrevista: "Entrevista",
  aprovado: "Aprovado",
  integracao: "Integração",
  ativo: "Ativo",
  desistente: "Desistente",
  reprovado: "Reprovado",
};

export type Candidato = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  creci: string | null;
  experiencia: string;
  observacoes: string;
  entradaEm: string;
  etapa: RhEtapa;
  userId: string | null;
  contratadoEm: string | null;
  motivoEncerramento: string;
  encerradoEm: string | null;
  responsavel: { id: string; name: string } | null;
  user: { id: string; name: string; status: string; avatar: string | null } | null;
};

export function painel(de: string, ate: string) {
  return apiFetch<Painel>(`/rh/painel?de=${de}&ate=${ate}`);
}

export type Painel = {
  indicadores: {
    emProcesso: number;
    entrevistas: number;
    contratacoes: number;
    corretoresAtivos: number;
    encerrados: number;
    vendas: number;
  };
  proximos: {
    id: string;
    titulo: string;
    startsAt: string;
    rhTipo: string | null;
    rhCandidato: { id: string; nome: string } | null;
    rhUser: { id: string; name: string } | null;
  }[];
  parados: { id: string; nome: string; etapa: RhEtapa; updatedAt: string }[];
  contratacoesRecentes: {
    id: string;
    nome: string;
    contratadoEm: string | null;
  }[];
  desempenho: { userId: string; nome: string; vendas: number }[];
};

export const listCandidatos = () => apiFetch<Candidato[]>("/rh/candidatos");
export const getCandidato = (id: string) =>
  apiFetch<Candidato & { historico: Hist[]; documentos: Doc[]; treinamentos: Treino[]; agenda: AgendaItem[] }>(
    `/rh/candidatos/${id}`,
  );
export const criarCandidato = (body: Record<string, string>) =>
  apiFetch<Candidato>("/rh/candidatos", { method: "POST", body });
export const moverCandidato = (id: string, etapa: RhEtapa, motivo?: string) =>
  apiFetch<Candidato>(`/rh/candidatos/${id}/mover`, {
    method: "POST",
    body: { etapa, motivo },
  });
export const converterCandidato = (id: string, password: string, email?: string) =>
  apiFetch<{ candidato: Candidato; usuarioCriado: boolean }>(
    `/rh/candidatos/${id}/converter`,
    { method: "POST", body: { password, email } },
  );

export type Corretor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  creci: string | null;
  avatar: string | null;
  status: string;
  contratadoEm: string;
  vendasNoMes: number;
  desligadoEm: string | null;
  desligamentoMotivo: string | null;
};

export const listEquipe = (situacao?: "desligados") =>
  apiFetch<Corretor[]>(`/rh/equipe${situacao ? `?situacao=${situacao}` : ""}`);

export const getFicha = (id: string) => apiFetch<Ficha>(`/rh/equipe/${id}`);

export type Ficha = {
  corretor: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    creci: string | null;
    status: string;
    createdAt: string;
    desligadoEm: string | null;
    desligamentoMotivo: string | null;
    desligadoPor: { name: string } | null;
  };
  candidato: Candidato | null;
  documentos: Doc[];
  treinamentos: Treino[];
  agenda: AgendaItem[];
  vendas: {
    avulsas: { id: string; clienteNome: string; dataVenda: string; vgv: number }[];
    propostas: { id: string; codigo: string; clienteNome: string; status: string }[];
    fechamentos: { id: string; status: string; concluidoAt: string | null }[];
  };
  historico: Hist[];
};

export type Doc = {
  id: string;
  nome: string;
  nomeArquivo: string;
  createdAt: string;
  autor: { name: string } | null;
};
export type Treino = { id: string; titulo: string; data: string; observacoes: string };
export type AgendaItem = {
  id: string;
  titulo: string;
  startsAt: string;
  status: string;
  rhTipo: string | null;
  observacoes?: string | null;
  rhCandidato?: { nome: string } | null;
  rhUser?: { name: string } | null;
};
export type Hist = {
  id: string;
  deEtapa: RhEtapa | null;
  paraEtapa: RhEtapa;
  motivo: string;
  createdAt: string;
  autor: { name: string } | null;
};

export const desligar = (id: string, motivo: string) =>
  apiFetch(`/rh/equipe/${id}/desligar`, { method: "POST", body: { motivo } });

export const encerrados = () =>
  apiFetch<{ desistentes: Candidato[]; reprovados: Candidato[]; desligados: Corretor[] }>(
    "/rh/encerrados",
  );

export const agenda = () => apiFetch<AgendaItem[]>("/rh/agenda");
export const criarCompromisso = (body: Record<string, string>) =>
  apiFetch("/rh/agenda", { method: "POST", body });
export const criarTreinamento = (body: Record<string, string>) =>
  apiFetch("/rh/treinamentos", { method: "POST", body });

export const modelos = () =>
  apiFetch<{ id: string; tipo: string; nome: string; nomeArquivo: string }[]>("/rh/modelos");

export function enviarArquivo(path: string, arquivo: File, fields: Record<string, string>) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  return apiFetch(path, { method: "POST", body });
}

export const baixar = (path: string) => apiFetchFile(path);
