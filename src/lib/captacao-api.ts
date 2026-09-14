import { apiFetch } from "@/lib/api";
import type { LeadMonitoramento } from "@/lib/lead-monitoramento";

export type PessoaTipo = "fisica" | "juridica";

export const IMOVEL_MAX_FOTOS = 15;

export type CaptacaoImovelTipo =
  | "apartamento"
  | "casa"
  | "terreno"
  | "sala_comercial"
  | "loja"
  | "galpao"
  | "fazenda"
  | "chacara"
  | "outro";

export const CAPTACAO_IMOVEL_TIPOS: CaptacaoImovelTipo[] = [
  "apartamento",
  "casa",
  "terreno",
  "sala_comercial",
  "loja",
  "galpao",
  "fazenda",
  "chacara",
  "outro",
];

export const CAPTACAO_IMOVEL_TIPO_LABEL: Record<CaptacaoImovelTipo, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  terreno: "Terreno",
  sala_comercial: "Sala comercial",
  loja: "Loja",
  galpao: "Galpão",
  fazenda: "Fazenda",
  chacara: "Chácara",
  outro: "Outro",
};

export const IMOVEL_DETALHES_IMOVEL = [
  "Banheiro",
  "Cozinha",
  "Sala de estar",
  "Sala de jantar",
  "Sala para 2 ambientes",
  "Vestíbulo",
  "Terreno Marinha",
  "Varanda",
  "Área de serviço",
  "Closet",
  "Escritório",
  "DCE",
  "Rooftop",
  "Piscina privativa",
  "Mobiliado",
  "Ar-condicionado",
] as const;

export const IMOVEL_CARACTERISTICAS_DIFERENCIAIS = [
  "Academia",
  "Brinquedoteca",
  "Cinema",
  "Espaço gourmet",
  "Piscina",
  "Piscina adulto",
  "Piscina infantil",
  "Playground",
  "Salão de festas",
  "Salão de jogos",
  "Quadra",
  "Sauna",
  "Pet place",
  "Bicicletário",
] as const;

export const IMOVEL_LOCALIZACAO_INFRA = [
  "Câmeras de segurança",
  "Portão eletrônico",
  "Portaria 24h",
  "Elevador",
] as const;

export const IMOVEL_COMODIDADES_UNIDADE = IMOVEL_DETALHES_IMOVEL;

export const IMOVEL_COMODIDADES_CONDOMINIO = [
  ...IMOVEL_CARACTERISTICAS_DIFERENCIAIS,
  ...IMOVEL_LOCALIZACAO_INFRA,
] as const;

const INFRA_SET = new Set<string>(IMOVEL_LOCALIZACAO_INFRA);

export function splitComodidadesCondominio(items: string[] | null | undefined) {
  const list = items ?? [];
  return {
    diferenciais: list.filter((item) => !INFRA_SET.has(item)),
    infra: list.filter((item) => INFRA_SET.has(item)),
  };
}

export const CAPTACAO_ORIGENS_PADRAO = [
  "indicação",
  "site",
  "instagram",
  "facebook",
  "portal",
  "telefone",
  "whatsapp",
  "prospecção",
  "cliente existente",
  "outro",
];

export type Proprietario = {
  id: string;
  nome: string;
  tipoPessoa: PessoaTipo;
  cpfCnpj: string;
  telefone: string;
  email: string;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
  portalAcesso?: { ativo: boolean; lastLoginAt: string | null };
  _count?: { imoveis: number; captacoes: number };
  imoveis?: Imovel[];
};

export type Imovel = {
  id: string;
  proprietarioId: string;
  tipo: CaptacaoImovelTipo;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  area: number | null;
  areaConstruida: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  tipoEmpreendimento?: string;
  aptsPorAndar?: number | null;
  andares?: number | null;
  torres?: number | null;
  descricao?: string;
  fotoUrl?: string | null;
  fotos?: Array<{ id: string; url: string; sortOrder: number }>;
  comodidadesUnidade?: string[];
  comodidadesCondominio?: string[];
  observacoes: string;
  titulo: string;
  valor: number | null;
  captacao: { id: string; etapa: string | null } | null;
  proprietario?: { id: string; nome: string; telefone?: string; email?: string };
  captacoes?: Array<{
    id: string;
    funilEtapa?: { id: string; label: string };
    responsavel?: { id: string; name: string };
  }>;
};

export type CaptacaoHistorico = {
  id: string;
  tipo: string;
  texto: string;
  createdAt: string;
  autor?: { id: string; name: string } | null;
};

export type Captacao = {
  id: string;
  proprietarioId: string;
  imovelId: string;
  responsavelId: string;
  origem: string;
  sugestaoProprietario?: boolean;
  canceladoPeloProprietario?: boolean;
  motivoPerda?: string;
  exclusividade: boolean;
  valorPretendido: number | null;
  valorAvaliacao: number | null;
  funilId: string;
  funilEtapaId: string;
  createdAt: string;
  updatedAt: string;
  proprietario: { id: string; nome: string; telefone?: string; email?: string };
  imovel: Imovel;
  responsavel: { id: string; name: string; email?: string };
  funil: { id: string; name: string; tipo: string };
  funilEtapa: {
    id: string;
    label: string;
    slug: string;
    color: string;
    papel: string | null;
  };
  historicos?: CaptacaoHistorico[];
  monitoramento?: LeadMonitoramento | null;
};

export type CaptacaoResumo = {
  proprietarios: number;
  imoveis: number;
  captacoes: number;
  captacoesAtivas: number;
  imoveisCaptados: number;
  porEtapa: Array<{
    funilEtapaId: string;
    label: string;
    papel: string | null;
    color: string | null;
    total: number;
  }>;
};

export type CaptacaoResponsavel = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function qs(params?: Record<string, string | boolean | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

export function fetchProprietarios(params?: { search?: string }) {
  return apiFetch<Proprietario[]>(
    `/captacao/proprietarios${qs({ search: params?.search })}`,
  );
}

export function fetchProprietario(id: string) {
  return apiFetch<Proprietario>(`/captacao/proprietarios/${id}`);
}

export function createProprietario(body: {
  nome: string;
  tipoPessoa?: PessoaTipo;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}) {
  return apiFetch<Proprietario>("/captacao/proprietarios", {
    method: "POST",
    body,
  });
}

export function updateProprietario(
  id: string,
  body: Partial<{
    nome: string;
    tipoPessoa: PessoaTipo;
    cpfCnpj: string;
    telefone: string;
    email: string;
    observacoes: string;
  }>,
) {
  return apiFetch<Proprietario>(`/captacao/proprietarios/${id}`, {
    method: "PATCH",
    body,
  });
}

export function updateProprietarioPortal(
  id: string,
  body: { ativo: boolean; senha?: string; gerarSenhaTemporaria?: boolean },
) {
  return apiFetch<{
    ativo: boolean;
    lastLoginAt: string | null;
    senhaTemporaria?: string;
  }>(`/captacao/proprietarios/${id}/portal`, {
    method: "PATCH",
    body,
  });
}

export function fetchCaptacaoImoveis(params?: {
  proprietarioId?: string;
  tipo?: string;
  cidade?: string;
  search?: string;
}) {
  return apiFetch<Imovel[]>(`/captacao/imoveis${qs(params)}`);
}

export function fetchCaptacaoImovel(id: string) {
  return apiFetch<Imovel>(`/captacao/imoveis/${id}`);
}

export function createCaptacaoImovel(body: Record<string, unknown>) {
  return apiFetch<Imovel>("/captacao/imoveis", { method: "POST", body });
}

export function updateCaptacaoImovel(id: string, body: Record<string, unknown>) {
  return apiFetch<Imovel>(`/captacao/imoveis/${id}`, { method: "PATCH", body });
}

export function deleteCaptacaoImovel(id: string) {
  return apiFetch<void>(`/captacao/imoveis/${id}`, { method: "DELETE" });
}

export function uploadCaptacaoImovelFoto(id: string, file: File) {
  const data = new FormData();
  data.append("file", file);
  return apiFetch<Imovel>(`/captacao/imoveis/${id}/foto`, {
    method: "POST",
    body: data,
  });
}

export function deleteCaptacaoImovelFoto(id: string, fotoId?: string) {
  const suffix = fotoId ? `/${fotoId}` : "";
  return apiFetch<Imovel>(`/captacao/imoveis/${id}/foto${suffix}`, {
    method: "DELETE",
  });
}

export function imovelFotoItens(item: {
  fotos?: Array<{ id: string; url: string; sortOrder?: number }>;
  fotoUrl?: string | null;
}) {
  if (item.fotos?.length) return item.fotos;
  return item.fotoUrl ? [{ url: item.fotoUrl }] : [];
}

export function deleteProprietario(id: string) {
  return apiFetch<void>(`/captacao/proprietarios/${id}`, { method: "DELETE" });
}

export function fetchCaptacoes(params?: Record<string, string | boolean | undefined>) {
  return apiFetch<Captacao[]>(`/captacao${qs(params)}`);
}

export function fetchCaptacao(id: string) {
  return apiFetch<Captacao>(`/captacao/${id}`);
}

export function createCaptacao(body: Record<string, unknown>) {
  return apiFetch<Captacao>("/captacao", { method: "POST", body });
}

export function updateCaptacao(id: string, body: Record<string, unknown>) {
  return apiFetch<Captacao>(`/captacao/${id}`, { method: "PATCH", body });
}

export function deleteCaptacao(id: string) {
  return apiFetch<void>(`/captacao/${id}`, { method: "DELETE" });
}

export function fetchCaptacaoResumo() {
  return apiFetch<CaptacaoResumo>("/captacao/resumo");
}

export function fetchCaptacaoResponsaveis() {
  return apiFetch<CaptacaoResponsavel[]>("/captacao/responsaveis");
}

export function formatBrl(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
