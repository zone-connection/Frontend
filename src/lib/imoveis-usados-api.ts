import { apiFetch, ApiError } from "@/lib/api";
import type { CaptacaoImovelTipo, Imovel } from "@/lib/captacao-api";
import { formatBrl } from "@/lib/captacao-api";
import type { LeadMonitoramento } from "@/lib/lead-monitoramento";

export type VendaUsadoStatus =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "indisponivel";

export type InteresseUsadoStatus =
  | "novo"
  | "em_contato"
  | "interessado"
  | "sem_interesse"
  | "descartado";

export const VENDA_STATUS_LABEL: Record<VendaUsadoStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  indisponivel: "Indisponível",
};

export const INTERESSE_STATUS_LABEL: Record<InteresseUsadoStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  descartado: "Descartado",
};

export type InteressadoUsado = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  tipoDesejado: CaptacaoImovelTipo | null;
  cidade: string;
  bairros: string;
  precoMin: number | null;
  precoMax: number | null;
  quartosMin: number | null;
  banheirosMin: number | null;
  vagasMin: number | null;
  areaMin: number | null;
};

export type VendaUsadoVinculo = {
  id: string;
  interesse: InteresseUsadoStatus;
  observacoes: string;
  interessado: InteressadoUsado;
};

export type UsadosResumo = {
  disponiveis: number;
  reservados: number;
  vendidos: number;
  interessados: number;
  visitasAgendadas: number;
  visitasRealizadas: number;
  propostasRecebidas: number;
  propostasEmNegociacao: number;
  propostasAceitas: number;
  fechamentosAndamento: number;
  documentacaoPendente: number;
  contratosAguardandoAssinatura: number;
  posVendasAndamento: number;
  posVendasPendentes: number;
  pendenciasAtrasadas: number;
  chavesRetiradas: number;
  chavesPerdidas: number;
  porEtapa: Array<{
    funilEtapaId: string;
    label: string;
    papel: string | null;
    color: string | null;
    total: number;
  }>;
};

export type VendaUsado = {
  id: string;
  status: VendaUsadoStatus;
  precoVenda: number | null;
  funilEtapaId: string;
  dataDisponibilizacao: string;
  observacoes: string;
  imovel: Imovel & { proprietario?: { id: string; nome: string } };
  responsavel: { id: string; name: string };
  funil: { id: string; name: string };
  funilEtapa: { id: string; label: string; color?: string };
  _count?: { vinculos: number };
  vinculos?: VendaUsadoVinculo[];
  historicos?: Array<{
    id: string;
    texto: string;
    createdAt: string;
    autor?: { name: string } | null;
  }>;
  monitoramento?: LeadMonitoramento | null;
};

function qs(params?: Record<string, string | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

export function fetchVendasUsado(params?: Record<string, string | undefined>) {
  return apiFetch<VendaUsado[]>(`/imoveis-usados${qs(params)}`);
}

export function fetchVendaUsado(id: string) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${id}`);
}

export function createVendaUsado(body: Record<string, unknown>) {
  return apiFetch<VendaUsado>("/imoveis-usados", { method: "POST", body });
}

export function updateVendaUsado(id: string, body: Record<string, unknown>) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${id}`, { method: "PATCH", body });
}

export function updateVendaUsadoImovel(
  id: string,
  body: Record<string, unknown>,
) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${id}/imovel`, {
    method: "PATCH",
    body,
  });
}

export function fetchUsadosResumo() {
  return apiFetch<UsadosResumo>("/imoveis-usados/resumo");
}

export function fetchUsadosResponsaveis() {
  return apiFetch<Array<{ id: string; name: string }>>(
    "/imoveis-usados/responsaveis",
  );
}

export function fetchImoveisCaptados() {
  return apiFetch<Array<Imovel & { precoSugerido: number | null }>>(
    "/imoveis-usados/imoveis-captados",
  );
}

export function fetchInteressadosUsado() {
  return apiFetch<InteressadoUsado[]>("/imoveis-usados/interessados");
}

export function createInteressadoUsado(body: Record<string, unknown>) {
  return apiFetch<InteressadoUsado>("/imoveis-usados/interessados", {
    method: "POST",
    body,
  });
}

export function fetchMatching(vendaId: string) {
  return apiFetch<InteressadoUsado[]>(`/imoveis-usados/${vendaId}/matching`);
}

export function fetchVinculos(vendaId: string) {
  return apiFetch<VendaUsadoVinculo[]>(
    `/imoveis-usados/${vendaId}/interessados`,
  );
}

export function vincularInteressado(
  vendaId: string,
  body: { interessadoId: string },
) {
  return apiFetch<VendaUsado>(`/imoveis-usados/${vendaId}/interessados`, {
    method: "POST",
    body,
  });
}

export function updateVinculo(
  vendaId: string,
  vinculoId: string,
  body: { interesse?: InteresseUsadoStatus; observacoes?: string },
) {
  return apiFetch<VendaUsado>(
    `/imoveis-usados/${vendaId}/interessados/${vinculoId}`,
    { method: "PATCH", body },
  );
}

export function removerVinculo(vendaId: string, vinculoId: string) {
  return apiFetch<VendaUsado>(
    `/imoveis-usados/${vendaId}/interessados/${vinculoId}`,
    { method: "DELETE" },
  );
}

export type VisitaUsadoStatus =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "nao_compareceu";

export type VisitaUsadoInteresse =
  | "muito_interessado"
  | "interessado"
  | "pouco_interessado"
  | "sem_interesse";

export type PropostaUsadoStatus =
  | "rascunho"
  | "enviada"
  | "em_analise"
  | "aceita"
  | "recusada"
  | "cancelada";

export type NegociacaoOrigem =
  | "interessado"
  | "proprietario"
  | "corretor"
  | "outro";

export const VISITA_STATUS_LABEL: Record<VisitaUsadoStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
};

export const VISITA_INTERESSE_LABEL: Record<VisitaUsadoInteresse, string> = {
  muito_interessado: "Muito interessado",
  interessado: "Interessado",
  pouco_interessado: "Pouco interessado",
  sem_interesse: "Sem interesse",
};

export const PROPOSTA_STATUS_LABEL: Record<PropostaUsadoStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_analise: "Em análise",
  aceita: "Aceita",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const NEGOCIACAO_ORIGEM_LABEL: Record<NegociacaoOrigem, string> = {
  interessado: "Interessado",
  proprietario: "Proprietário",
  corretor: "Corretor",
  outro: "Outro",
};

export type VisitaUsado = {
  id: string;
  dataHora: string;
  status: VisitaUsadoStatus;
  observacoes: string;
  feedbackAvaliacao: number | null;
  feedbackInteresse: VisitaUsadoInteresse | null;
  feedbackComentarios: string;
  feedbackObservacoes: string;
  feedbackAt: string | null;
  interessado: { id: string; nome: string };
  responsavel: { id: string; name: string };
};

export type NegociacaoMovimento = {
  id: string;
  valor: number;
  entrada: number | null;
  valorFinanciamento: number | null;
  observacoes: string;
  origem: NegociacaoOrigem;
  createdAt: string;
  responsavel?: { id: string; name: string } | null;
};

export type PropostaUsado = {
  id: string;
  valor: number;
  valorAtual: number | null;
  entrada: number | null;
  valorFinanciamento: number | null;
  observacoes: string;
  status: PropostaUsadoStatus;
  createdAt: string;
  interessado: { id: string; nome: string };
  responsavel: { id: string; name: string };
  negociacao: {
    id: string;
    status: string;
    movimentos: NegociacaoMovimento[];
  } | null;
};

export function fetchVisitasUsado(vendaId: string) {
  return apiFetch<VisitaUsado[]>(`/imoveis-usados/${vendaId}/visitas`);
}

export function fetchTodasVisitasUsado() {
  return apiFetch<
    Array<
      VisitaUsado & {
        vendaUsado?: {
          id: string;
          imovel: { titulo?: string; cidade?: string; bairro?: string; fotoUrl?: string | null; tipo?: string; id?: string; logradouro?: string; numero?: string };
        };
      }
    >
  >("/imoveis-usados/visitas");
}

export function createVisitaUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<VisitaUsado>(`/imoveis-usados/${vendaId}/visitas`, {
    method: "POST",
    body,
  });
}

export function updateVisitaUsado(
  vendaId: string,
  visitaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<VisitaUsado>(
    `/imoveis-usados/${vendaId}/visitas/${visitaId}`,
    { method: "PATCH", body },
  );
}

export function feedbackVisitaUsado(
  vendaId: string,
  visitaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<VisitaUsado>(
    `/imoveis-usados/${vendaId}/visitas/${visitaId}/feedback`,
    { method: "POST", body },
  );
}

export function fetchPropostasUsado(vendaId: string) {
  return apiFetch<PropostaUsado[]>(`/imoveis-usados/${vendaId}/propostas`);
}

export function fetchTodasPropostasUsado() {
  return apiFetch<
    Array<
      PropostaUsado & {
        vendaUsado?: {
          id: string;
          imovel: { titulo?: string; cidade?: string; fotoUrl?: string | null; tipo?: string; id?: string };
        };
      }
    >
  >("/imoveis-usados/propostas");
}

export function createPropostaUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<PropostaUsado>(`/imoveis-usados/${vendaId}/propostas`, {
    method: "POST",
    body,
  });
}

export function fetchPropostaUsado(vendaId: string, propostaId: string) {
  return apiFetch<PropostaUsado>(
    `/imoveis-usados/${vendaId}/propostas/${propostaId}`,
  );
}

export function updatePropostaUsado(
  vendaId: string,
  propostaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<PropostaUsado>(
    `/imoveis-usados/${vendaId}/propostas/${propostaId}`,
    { method: "PATCH", body },
  );
}

export function addNegociacaoMovimento(
  vendaId: string,
  propostaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<PropostaUsado>(
    `/imoveis-usados/${vendaId}/propostas/${propostaId}/negociacao`,
    { method: "POST", body },
  );
}

export type FechamentoUsadoStatus =
  | "iniciado"
  | "documentacao_pendente"
  | "documentacao_em_analise"
  | "contrato_em_elaboracao"
  | "contrato_enviado"
  | "aguardando_assinatura"
  | "concluido"
  | "cancelado";

export type DocumentoUsadoStatus =
  | "pendente"
  | "recebido"
  | "em_analise"
  | "aprovado"
  | "recusado";

export type DocumentoUsadoCategoria =
  | "comprador"
  | "proprietario"
  | "imovel"
  | "venda";

export type DocumentoUsadoFornecedor =
  | "comprador"
  | "proprietario"
  | "imobiliaria";

export type ContratoUsadoStatus =
  | "rascunho"
  | "em_elaboracao"
  | "enviado"
  | "aguardando_assinatura"
  | "assinado"
  | "cancelado";

export const FECHAMENTO_STATUS_LABEL: Record<FechamentoUsadoStatus, string> = {
  iniciado: "Iniciado",
  documentacao_pendente: "Documentação pendente",
  documentacao_em_analise: "Documentação em análise",
  contrato_em_elaboracao: "Contrato em elaboração",
  contrato_enviado: "Contrato enviado",
  aguardando_assinatura: "Aguardando assinatura",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const DOCUMENTO_STATUS_LABEL: Record<DocumentoUsadoStatus, string> = {
  pendente: "Pendente",
  recebido: "Recebido",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const DOCUMENTO_CATEGORIA_LABEL: Record<DocumentoUsadoCategoria, string> =
  {
    comprador: "Comprador",
    proprietario: "Proprietário",
    imovel: "Imóvel",
    venda: "Venda",
  };

export const DOCUMENTO_FORNECEDOR_LABEL: Record<
  DocumentoUsadoFornecedor,
  string
> = {
  comprador: "Comprador",
  proprietario: "Proprietário",
  imobiliaria: "Imobiliária",
};

export const CONTRATO_STATUS_LABEL: Record<ContratoUsadoStatus, string> = {
  rascunho: "Rascunho",
  em_elaboracao: "Em elaboração",
  enviado: "Enviado",
  aguardando_assinatura: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

export type DocumentoUsado = {
  id: string;
  categoria: DocumentoUsadoCategoria;
  tipo: string;
  nome: string;
  obrigatorio: boolean;
  fornecedor: DocumentoUsadoFornecedor;
  status: DocumentoUsadoStatus;
  observacao: string;
  dataSolicitacao: string;
  dataRecebimento: string | null;
  dataAnalise: string | null;
  analista?: { id: string; name: string } | null;
};

export type ContratoUsado = {
  id: string;
  numero: string;
  status: ContratoUsadoStatus;
  observacoes: string;
  dataCriacao: string;
  dataEnvio: string | null;
  dataAssinatura: string | null;
  assinadoPor?: { id: string; name: string } | null;
};

export type FechamentoUsado = {
  id: string;
  status: FechamentoUsadoStatus;
  observacoes: string;
  propostaId: string;
  interessado: { id: string; nome: string };
  responsavel: { id: string; name: string };
  proposta: { id: string; status: string; valor: number | null };
  documentos: DocumentoUsado[];
  contrato: ContratoUsado | null;
  documentacao: { aprovados: number; obrigatorios: number; total: number };
};

export async function fetchFechamentoUsado(vendaId: string) {
  try {
    return await apiFetch<FechamentoUsado>(
      `/imoveis-usados/${vendaId}/fechamento`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function iniciarFechamentoUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<FechamentoUsado>(`/imoveis-usados/${vendaId}/fechamento`, {
    method: "POST",
    body,
  });
}

export function updateFechamentoUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<FechamentoUsado>(`/imoveis-usados/${vendaId}/fechamento`, {
    method: "PATCH",
    body,
  });
}

export function concluirFechamentoUsado(vendaId: string) {
  return apiFetch<FechamentoUsado>(
    `/imoveis-usados/${vendaId}/fechamento/concluir`,
    { method: "POST" },
  );
}

export function createDocumentoUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<DocumentoUsado>(
    `/imoveis-usados/${vendaId}/fechamento/documentos`,
    { method: "POST", body },
  );
}

export function updateDocumentoUsado(
  vendaId: string,
  documentoId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<DocumentoUsado>(
    `/imoveis-usados/${vendaId}/fechamento/documentos/${documentoId}`,
    { method: "PATCH", body },
  );
}

export function createContratoUsado(
  vendaId: string,
  body: Record<string, unknown> = {},
) {
  return apiFetch<ContratoUsado>(
    `/imoveis-usados/${vendaId}/fechamento/contrato`,
    { method: "POST", body },
  );
}

export function updateContratoUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<ContratoUsado>(
    `/imoveis-usados/${vendaId}/fechamento/contrato`,
    { method: "PATCH", body },
  );
}

export type ImovelChaveStatus =
  | "disponivel"
  | "retirada"
  | "devolvida"
  | "perdida"
  | "inativa";

export type ImovelChaveLocalizacao =
  | "imobiliaria"
  | "corretor"
  | "proprietario"
  | "comprador"
  | "portaria"
  | "caixa"
  | "outro";

export const CHAVE_STATUS_LABEL: Record<ImovelChaveStatus, string> = {
  disponivel: "Disponível",
  retirada: "Retirada",
  devolvida: "Devolvida",
  perdida: "Perdida",
  inativa: "Inativa",
};

export const CHAVE_LOCALIZACAO_LABEL: Record<ImovelChaveLocalizacao, string> = {
  imobiliaria: "Imobiliária",
  corretor: "Corretor",
  proprietario: "Proprietário",
  comprador: "Comprador",
  portaria: "Portaria",
  caixa: "Caixa de chaves",
  outro: "Outro",
};

export type ImovelChave = {
  id: string;
  identificacao: string;
  quantidade: number;
  quantidadeRetirada: number;
  status: ImovelChaveStatus;
  localizacaoAtual: ImovelChaveLocalizacao;
  observacoes: string;
  responsavelAtual?: { id: string; name: string } | null;
};

export type ImovelChaveMovimento = {
  id: string;
  tipo: string;
  quantidade: number;
  motivo: string;
  observacao: string;
  createdAt: string;
  responsavel?: { id: string; name: string } | null;
};

export type PosVendaStatus =
  | "pendente"
  | "em_andamento"
  | "aguardando_pendencia"
  | "concluido"
  | "cancelado";

export type PosVendaPendenciaStatus =
  | "pendente"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export const POS_VENDA_STATUS_LABEL: Record<PosVendaStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_pendencia: "Aguardando pendência",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type PosVendaPendencia = {
  id: string;
  titulo: string;
  descricao: string;
  status: PosVendaPendenciaStatus;
  obrigatoria: boolean;
  prazo: string | null;
  observacao: string;
  atrasada: boolean;
  responsavel?: { id: string; name: string } | null;
};

export type PosVendaUsado = {
  id: string;
  status: PosVendaStatus;
  interessado: { id: string; nome: string };
  proprietario: { id: string; nome: string };
  responsavel: { id: string; name: string };
  pendencias: PosVendaPendencia[];
  resumo: { total: number; concluidas: number; abertas: number; atrasadas: number };
};

export function fetchChavesUsado(vendaId: string) {
  return apiFetch<ImovelChave[]>(`/imoveis-usados/${vendaId}/chaves`);
}

export function createChaveUsado(vendaId: string, body: Record<string, unknown>) {
  return apiFetch<ImovelChave>(`/imoveis-usados/${vendaId}/chaves`, {
    method: "POST",
    body,
  });
}

export function updateChaveUsado(
  vendaId: string,
  chaveId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<ImovelChave>(`/imoveis-usados/${vendaId}/chaves/${chaveId}`, {
    method: "PATCH",
    body,
  });
}

export function retirarChaveUsado(
  vendaId: string,
  chaveId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<ImovelChave>(
    `/imoveis-usados/${vendaId}/chaves/${chaveId}/retirar`,
    { method: "POST", body },
  );
}

export function devolverChaveUsado(
  vendaId: string,
  chaveId: string,
  body: Record<string, unknown> = {},
) {
  return apiFetch<ImovelChave>(
    `/imoveis-usados/${vendaId}/chaves/${chaveId}/devolver`,
    { method: "POST", body },
  );
}

export function perderChaveUsado(
  vendaId: string,
  chaveId: string,
  body: Record<string, unknown> = {},
) {
  return apiFetch<ImovelChave>(
    `/imoveis-usados/${vendaId}/chaves/${chaveId}/perder`,
    { method: "POST", body },
  );
}

export function entregarChaveComprador(
  vendaId: string,
  chaveId: string,
  body: Record<string, unknown> = {},
) {
  return apiFetch<ImovelChave>(
    `/imoveis-usados/${vendaId}/chaves/${chaveId}/entregar-comprador`,
    { method: "POST", body },
  );
}

export function fetchChaveHistorico(vendaId: string, chaveId: string) {
  return apiFetch<ImovelChaveMovimento[]>(
    `/imoveis-usados/${vendaId}/chaves/${chaveId}/historico`,
  );
}

export async function fetchPosVendaUsado(vendaId: string) {
  try {
    return await apiFetch<PosVendaUsado>(`/imoveis-usados/${vendaId}/pos-venda`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function iniciarPosVendaUsado(
  vendaId: string,
  body: Record<string, unknown> = {},
) {
  return apiFetch<PosVendaUsado>(`/imoveis-usados/${vendaId}/pos-venda`, {
    method: "POST",
    body,
  });
}

export function updatePosVendaUsado(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<PosVendaUsado>(`/imoveis-usados/${vendaId}/pos-venda`, {
    method: "PATCH",
    body,
  });
}

export function concluirPosVendaUsado(vendaId: string) {
  return apiFetch<PosVendaUsado>(`/imoveis-usados/${vendaId}/pos-venda/concluir`, {
    method: "POST",
  });
}

export function createPosVendaPendencia(
  vendaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<PosVendaPendencia>(
    `/imoveis-usados/${vendaId}/pos-venda/pendencias`,
    { method: "POST", body },
  );
}

export function updatePosVendaPendencia(
  vendaId: string,
  pendenciaId: string,
  body: Record<string, unknown>,
) {
  return apiFetch<PosVendaPendencia>(
    `/imoveis-usados/${vendaId}/pos-venda/pendencias/${pendenciaId}`,
    { method: "PATCH", body },
  );
}

export { formatBrl };
