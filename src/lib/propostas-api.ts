import { apiFetch } from "@/lib/api";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";

export type PropostaStatus =
  "rascunho" | "enviada" | "negociacao" | "aceita" | "recusada" | "expirada";

export const PROPOSTA_STATUS_LABEL: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export function propostaStatusClass(status: PropostaStatus) {
  const size = STATUS_CHIP_CLASS;
  switch (status) {
    case "aceita":
      return `${size} border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`;
    case "enviada":
      return `${size} border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300`;
    case "negociacao":
      return `${size} border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300`;
    case "rascunho":
      return `${size} border-transparent bg-muted text-muted-foreground`;
    case "recusada":
      return `${size} border-transparent bg-destructive/15 text-destructive`;
    case "expirada":
      return `${size} border-transparent bg-orange-500/15 text-orange-800 dark:text-orange-300`;
    default:
      return `${size} border-transparent bg-secondary text-secondary-foreground`;
  }
}

export type Proposta = {
  id: string;
  codigo: string;
  leadId: string | null;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteCpf: string | null;
  clienteRg: string | null;
  clienteRgOrgaoEmissor: string | null;
  clienteDataNascimento: string | null;
  clienteNacionalidade: string | null;
  clienteEstadoCivil: string | null;
  clienteRegimeBens: string | null;
  clienteDataCasamento: string | null;
  clienteNomePai: string | null;
  clienteNomeMae: string | null;
  clienteRenda: number | null;
  clienteTelefoneFixo: string | null;
  clienteEmail: string | null;
  clienteEnderecoResidencial: string | null;
  clienteBairroResidencial: string | null;
  clienteCidadeResidencial: string | null;
  clienteUfResidencial: string | null;
  clienteCepResidencial: string | null;
  clienteCobrancaResidencial: boolean | null;
  clienteEmpregador: string | null;
  clienteProfissao: string | null;
  clienteEnderecoComercial: string | null;
  clienteBairroComercial: string | null;
  clienteCidadeComercial: string | null;
  clienteUfComercial: string | null;
  clienteCepComercial: string | null;
  clienteCobrancaComercial: boolean | null;
  clienteSite: string | null;
  clienteTelefoneComercial1: string | null;
  clienteTelefoneComercial2: string | null;
  construtoraId: string | null;
  empreendimentoId: string | null;
  unidade: string | null;
  corretorId: string | null;
  autorId: string;
  valor: number;
  entrada: number | null;
  apartado: number | null;
  preChaves: number[];
  posChaves: number[];
  intercaladas: number[];
  fgts: number | null;
  moraBem: number | null;
  mcmv: number | null;
  parcelaCaixa: number | null;
  financiamento: number | null;
  /** Desconto do empreendimento (R$). */
  desconto: number | null;
  status: PropostaStatus;
  validade: string | null;
  enviadaEm: string | null;
  origemPublica?: boolean;
  aceitaEm?: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
  corretor: { id: string; name: string } | null;
  construtora: { id: string; nome: string; cor: string | null } | null;
  empreendimento: { id: string; nome: string; cidade: string | null } | null;
  lead: {
    id: string;
    tipo: string;
    nome: string;
    telefone: string | null;
    corretorId: string | null;
    equipe: { id: string; name: string } | null;
  } | null;
  vinculos?: PropostaVinculoResumo[];
};

export type PropostaVinculoResumo = {
  id: string;
  imovelId?: string | null;
  empreendimentoId?: string | null;
  proprietario?: { id: string; nome: string } | null;
  imovel: {
    id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
  } | null;
  empreendimento: { id: string; nome: string; cidade: string | null } | null;
};

export type PropostaVinculoNotificacao = {
  id: string;
  email: string;
  status: "enviado" | "falhou" | "sem_email" | string;
  detalhe: string;
  enviadoEm: string;
};

export type PropostaVinculo = PropostaVinculoResumo & {
  propostaId: string;
  proprietarioId: string | null;
  corretorId: string | null;
  corretorNome: string;
  vinculadoEm: string;
  removidoEm: string | null;
  removidoPorNome: string | null;
  proprietario: { id: string; nome: string; email: string } | null;
  imovel: {
    id: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    tipo: string;
    proprietario: { id: string; nome: string; email: string };
  } | null;
  notificacoes: PropostaVinculoNotificacao[];
};

export function rotuloPropostaVinculo(vinculo: PropostaVinculoResumo) {
  if (vinculo.imovel) {
    const endereco = [vinculo.imovel.logradouro, vinculo.imovel.numero]
      .filter(Boolean)
      .join(", ");
    const local = [vinculo.imovel.bairro, vinculo.imovel.cidade]
      .filter(Boolean)
      .join(" · ");
    return [endereco || "Imóvel", local].filter(Boolean).join(" — ");
  }
  if (vinculo.empreendimento) {
    return [vinculo.empreendimento.nome, vinculo.empreendimento.cidade]
      .filter(Boolean)
      .join(" · ");
  }
  return "Vínculo";
}

/** Rótulo curto para a lista: só o imóvel (rua e número). */
export function rotuloPropostaVinculoCurto(vinculo: PropostaVinculoResumo) {
  if (vinculo.imovel) {
    return (
      [vinculo.imovel.logradouro, vinculo.imovel.numero]
        .filter(Boolean)
        .join(", ") || "Imóvel"
    );
  }
  if (vinculo.empreendimento) {
    return vinculo.empreendimento.nome;
  }
  return "Vínculo";
}

/** Campos simples (um valor). */
export const PROPOSTA_SIMPLES_KEYS = [
  "entrada",
  "fgts",
  "moraBem",
  "mcmv",
  "parcelaCaixa",
  "financiamento",
] as const;

export type PropostaSimplesKey = (typeof PROPOSTA_SIMPLES_KEYS)[number];
/** Campos exibidos na composição financeira, mas fora do valor negociado. */
export const PROPOSTA_INFORMATIVA_KEYS = ["parcelaCaixa"] as const;

/** Campos com várias parcelas. */
export const PROPOSTA_LISTA_KEYS = [
  "preChaves",
  "posChaves",
  "intercaladas",
] as const;

export type PropostaListaKey = (typeof PROPOSTA_LISTA_KEYS)[number];

export const PROPOSTA_COMPOSICAO_LABEL: Record<
  PropostaSimplesKey | PropostaListaKey,
  string
> = {
  entrada: "Sinal",
  preChaves: "Pré-chaves",
  posChaves: "Pós-chaves",
  intercaladas: "Intercaladas",
  fgts: "FGTS",
  moraBem: "Mora Bem",
  mcmv: "MCMV",
  parcelaCaixa: "Parcela Caixa (informativo)",
  financiamento: "Financiamento",
};

function sumList(values: number[] | null | undefined): number {
  if (!values?.length) return 0;
  return values.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}

export function propostaComposicaoTotal(
  p: Pick<Proposta, PropostaSimplesKey | PropostaListaKey>,
): number {
  const simples = PROPOSTA_SIMPLES_KEYS.reduce(
    (sum, key) =>
      PROPOSTA_INFORMATIVA_KEYS.includes(
        key as (typeof PROPOSTA_INFORMATIVA_KEYS)[number],
      )
        ? sum
        : sum + (p[key] ?? 0),
    0,
  );
  const listas = PROPOSTA_LISTA_KEYS.reduce(
    (sum, key) => sum + sumList(p[key]),
    0,
  );
  return simples + listas;
}

/** Valor de venda menos desconto do empreendimento. */
export function propostaValorLiquido(
  p: Pick<Proposta, "valor" | "desconto">,
): number {
  return Math.max(0, p.valor - (p.desconto ?? 0));
}

export function propostaDiferenca(
  p: Pick<
    Proposta,
    "valor" | "desconto" | PropostaSimplesKey | PropostaListaKey
  >,
): number {
  return propostaValorLiquido(p) - propostaComposicaoTotal(p);
}

export type CreatePropostaInput = {
  leadId?: string | null;
  clienteNome: string;
  clienteTelefone?: string | null;
  clienteCpf?: string | null;
  clienteRg?: string | null;
  clienteRgOrgaoEmissor?: string | null;
  clienteDataNascimento?: string | null;
  clienteNacionalidade?: string | null;
  clienteEstadoCivil?: string | null;
  clienteRegimeBens?: string | null;
  clienteDataCasamento?: string | null;
  clienteNomePai?: string | null;
  clienteNomeMae?: string | null;
  clienteRenda?: number | null;
  clienteTelefoneFixo?: string | null;
  clienteEmail?: string | null;
  clienteEnderecoResidencial?: string | null;
  clienteBairroResidencial?: string | null;
  clienteCidadeResidencial?: string | null;
  clienteUfResidencial?: string | null;
  clienteCepResidencial?: string | null;
  clienteCobrancaResidencial?: boolean | null;
  clienteEmpregador?: string | null;
  clienteProfissao?: string | null;
  clienteEnderecoComercial?: string | null;
  clienteBairroComercial?: string | null;
  clienteCidadeComercial?: string | null;
  clienteUfComercial?: string | null;
  clienteCepComercial?: string | null;
  clienteCobrancaComercial?: boolean | null;
  clienteSite?: string | null;
  clienteTelefoneComercial1?: string | null;
  clienteTelefoneComercial2?: string | null;
  construtoraId?: string | null;
  empreendimentoId?: string | null;
  unidade?: string | null;
  corretorId?: string | null;
  valor: number;
  entrada?: number | null;
  apartado?: number | null;
  preChaves?: number[];
  posChaves?: number[];
  intercaladas?: number[];
  fgts?: number | null;
  moraBem?: number | null;
  mcmv?: number | null;
  parcelaCaixa?: number | null;
  financiamento?: number | null;
  desconto?: number | null;
  status?: PropostaStatus;
  validade?: string | null;
  observacao?: string | null;
};

export type UpdatePropostaInput = Partial<CreatePropostaInput>;

export type EnderecoCep = {
  cep: string;
  endereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export async function fetchEnderecoPorCep(cep: string): Promise<EnderecoCep> {
  const digits = cep.replace(/\D/g, "");
  return apiFetch<EnderecoCep>(`/propostas/cep/${digits}`);
}

export async function fetchPropostas(params?: {
  corretorId?: string;
  status?: PropostaStatus;
  sort?: string;
}): Promise<Proposta[]> {
  const qs = new URLSearchParams();
  if (params?.corretorId) qs.set("corretorId", params.corretorId);
  if (params?.status) qs.set("status", params.status);
  if (params?.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiFetch<Proposta[]>(`/propostas${query ? `?${query}` : ""}`);
}

export async function fetchProposta(id: string): Promise<Proposta> {
  return apiFetch<Proposta>(`/propostas/${id}`);
}

export async function createProposta(
  input: CreatePropostaInput,
): Promise<Proposta> {
  return apiFetch<Proposta>("/propostas", { method: "POST", body: input });
}

export async function updateProposta(
  id: string,
  input: UpdatePropostaInput,
): Promise<Proposta> {
  return apiFetch<Proposta>(`/propostas/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteProposta(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/propostas/${id}`, { method: "DELETE" });
}

export function fetchPropostasDoAlvo(params: {
  empreendimentoId?: string;
  imovelId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.empreendimentoId) qs.set("empreendimentoId", params.empreendimentoId);
  if (params.imovelId) qs.set("imovelId", params.imovelId);
  return apiFetch<Proposta[]>(`/propostas/vinculadas?${qs.toString()}`);
}

export function fetchPropostaVinculos(propostaId: string) {
  return apiFetch<PropostaVinculo[]>(`/propostas/${propostaId}/vinculos`);
}

export function vincularProposta(
  propostaId: string,
  body: { imovelId?: string; empreendimentoId?: string },
) {
  return apiFetch<PropostaVinculo>(`/propostas/${propostaId}/vinculos`, {
    method: "POST",
    body,
  });
}

export function removerPropostaVinculo(propostaId: string, vinculoId: string) {
  return apiFetch<PropostaVinculo>(
    `/propostas/${propostaId}/vinculos/${vinculoId}`,
    { method: "DELETE" },
  );
}

export function formatPropostaDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  return new Date(day + "T12:00:00").toLocaleDateString("pt-BR");
}
