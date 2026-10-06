import { apiFetch } from "@/lib/api";

export type PropostaPublicaResumo = {
  token: string;
  imovel: {
    id: string;
    tipo: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    area: number | string | null;
    quartos: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    descricao: string;
    fotos: string[];
    rotulo: string;
  };
  corretor: { nome: string; telefone: string | null };
  tenant: {
    nome: string;
    slug: string;
    logoUrl: string | null;
    cor: string | null;
    telefone: string;
  };
};

export type PropostaPublicaRecibo = {
  codigo: string;
  status: string;
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
  desconto: number | null;
  validade: string | null;
  observacao: string | null;
  clienteNome: string;
  aceitaEm: string | null;
  enviadaEm: string | null;
  createdAt: string;
  tenant: { name: string; logoUrl: string | null; primaryColor: string | null };
  corretorNome: string | null;
  imovel: { rotulo: string; fotoUrl: string | null } | null;
};

export type PropostaPublicaEnvio = {
  clienteNome: string;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  clienteCpf?: string | null;
  clienteRg?: string | null;
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
  validade?: string | null;
  observacao?: string | null;
};

export function fetchPropostaPublica(token: string) {
  return apiFetch<PropostaPublicaResumo>(
    `/publico/propostas/${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}

export function enviarPropostaPublica(token: string, body: PropostaPublicaEnvio) {
  return apiFetch<{ reciboUrl: string; codigo: string }>(
    `/publico/propostas/${encodeURIComponent(token)}`,
    { method: "POST", body, skipAuth: true },
  );
}

export function fetchPropostaPublicaRecibo(compradorToken: string) {
  return apiFetch<PropostaPublicaRecibo>(
    `/publico/propostas/recibo/${encodeURIComponent(compradorToken)}`,
    { skipAuth: true },
  );
}

export function criarLinkPropostaPublica(imovelId: string) {
  return apiFetch<{ token: string; url: string }>("/propostas/link-publico", {
    method: "POST",
    body: { imovelId },
  });
}

export type PropostaHistoricoEvento = {
  id: string;
  tipo: string;
  payload: unknown;
  atorTipo: string;
  atorId: string | null;
  atorNome: string | null;
  createdAt: string;
};

export function fetchPropostaHistorico(propostaId: string) {
  return apiFetch<PropostaHistoricoEvento[]>(
    `/propostas/${propostaId}/historico`,
  );
}

export function publicSiteOrigin() {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") {
    return window.location.origin;
  }
  return "https://www.zoneconnection.com.br";
}

export function publicPropostaUrl(token: string) {
  return `${publicSiteOrigin()}/publico/proposta/${token}`;
}

export async function copiarLinkPropostaPublica(imovelId: string) {
  const { token, url } = await criarLinkPropostaPublica(imovelId);
  const path = url.includes("/publico/")
    ? url.slice(url.indexOf("/publico/"))
    : `/publico/proposta/${token}`;
  const absolute = `${publicSiteOrigin()}${path}`;
  await navigator.clipboard.writeText(absolute);
  return absolute;
}
