import { ApiError, getApiUrl } from "@/lib/api";

const CSRF_COOKIE = "crm_portal_csrf";
const CSRF_STORAGE_KEY = "crm_portal_csrf_token";
const CSRF_HEADER = "X-CSRF-Token";
const USER_KEY = "crm_portal_session";

const isBrowser = () => typeof window !== "undefined";

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const parts = document.cookie
    .split("; ")
    .filter((row) => row.startsWith(`${name}=`));
  if (parts.length === 0) return null;
  const match = parts[parts.length - 1]!;
  return decodeURIComponent(match.slice(name.length + 1));
}

function storeCsrf(token: string | null | undefined) {
  if (!isBrowser()) return;
  if (!token) {
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(CSRF_STORAGE_KEY, token);
}

function readCsrf(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(CSRF_STORAGE_KEY) ?? readCookie(CSRF_COOKIE);
}

export const portalSessionCache = {
  get: <T>(): T | null => {
    if (!isBrowser()) return null;
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set: (value: unknown) => {
    if (!isBrowser()) return;
    sessionStorage.setItem(USER_KEY, JSON.stringify(value));
  },
  clear: () => {
    if (!isBrowser()) return;
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
  },
};

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const message = body?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  } catch {
    // sem JSON
  }
  return `Erro ${response.status} ao comunicar com o servidor.`;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshPortal(): Promise<boolean> {
  const response = await fetch(
    `${getApiUrl()}/portal-proprietario/auth/refresh`,
    { method: "POST", credentials: "include" },
  );
  if (!response.ok) {
    portalSessionCache.clear();
    return false;
  }
  try {
    const body = (await response.json()) as { csrfToken?: string };
    storeCsrf(body.csrfToken);
  } catch {
    const cookieToken = readCookie(CSRF_COOKIE);
    if (cookieToken) storeCsrf(cookieToken);
  }
  return true;
}

type Options = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

async function portalRequest(path: string, options: Options = {}) {
  const { body, skipAuth, headers, ...rest } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const send = async () => {
    const csrf = skipAuth ? null : readCsrf();
    return fetch(`${getApiUrl()}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
        ...headers,
      },
      ...(body !== undefined
        ? { body: isForm ? (body as FormData) : JSON.stringify(body) }
        : {}),
    });
  };

  let response = await send();
  if (response.status === 401 && !skipAuth) {
    refreshInFlight ??= refreshPortal().finally(() => {
      refreshInFlight = null;
    });
    if (await refreshInFlight) response = await send();
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      portalSessionCache.clear();
      if (isBrowser() && !window.location.pathname.startsWith("/portal/login")) {
        window.location.assign("/portal/login");
      }
    }
    throw new ApiError(await parseError(response), response.status);
  }
  return response;
}

export async function portalFetch<T>(
  path: string,
  options: Options = {},
): Promise<T> {
  const response = await portalRequest(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function storePortalCsrf(token: string | null | undefined) {
  storeCsrf(token);
}

export type PortalProprietario = {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
};

export type PortalSituacao =
  | "sem_operacao"
  | "captacao"
  | "disponivel"
  | "negociacao"
  | "vendido"
  | "indisponivel";

export const PORTAL_SITUACAO_LABEL: Record<PortalSituacao, string> = {
  sem_operacao: "Sem operação",
  captacao: "Em captação",
  disponivel: "Disponível",
  negociacao: "Em negociação",
  vendido: "Vendido",
  indisponivel: "Indisponível",
};

export type PortalImovelListItem = {
  id: string;
  identificacao: string;
  tipo: string;
  endereco: string;
  bairro: string;
  cidade: string;
  fotoUrl?: string | null;
  fotos?: Array<{ id: string; url: string; sortOrder: number }>;
  valor: number | null;
  situacao: PortalSituacao;
  proximoPasso?: string;
  temComercializacao?: boolean;
  contato?: PortalContato;
  statusOperacao: string | null;
  responsavel: string | null;
  dataCaptacao: string;
  interessados: number;
  visitas: number;
  propostas: number;
  canceladoPeloProprietario?: boolean;
};

export type PortalContato = {
  imobiliaria: { nome: string; telefone: string };
  corretor: {
    nome: string;
    telefone: string | null;
    whatsapp: string | null;
  } | null;
};

export type PortalNovidade = {
  id: string;
  imovelId: string;
  identificacao: string;
  origem: string;
  tipo: string;
  texto: string;
  createdAt: string;
  lida?: boolean;
};

export function countNovidadesNaoLidas(items: PortalNovidade[]) {
  return items.filter((item) => item.lida !== true).length;
}

export type PortalDashboard = {
  resumo: {
    total: number;
    disponiveis: number;
    negociacao: number;
    vendidos: number;
    captacao: number;
  };
  imoveis: PortalImovelListItem[];
  novidades?: PortalNovidade[];
};

export type PortalImovelDetalhe = {
  id: string;
  identificacao: string;
  tipo: string;
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
  proximoPasso?: string;
  contato?: PortalContato;
  comodidadesUnidade?: string[];
  comodidadesCondominio?: string[];
  valorPretendido: number | null;
  valorAvaliacao: number | null;
  precoVenda: number | null;
  dataCaptacao: string;
  situacao: PortalSituacao;
  captacao: {
    id: string;
    etapa: string;
    origem: string;
    exclusividade: boolean;
    responsavel: string;
    canceladoPeloProprietario?: boolean;
  } | null;
  acoes?: {
    vi_e_concordo: boolean;
    quero_falar: boolean;
  };
  comercializacao: {
    status: string;
    preco: number | null;
    responsavel: string;
    etapa: string;
    interessados: number;
    visitas: number;
    propostas: number;
    interessadosResumo: Record<string, number>;
  } | null;
};

export function portalLogin(email: string, password: string, tenantSlug?: string) {
  return portalFetch<{ proprietario: PortalProprietario; csrfToken: string }>(
    "/portal-proprietario/auth/login",
    { method: "POST", body: { email, password, tenantSlug }, skipAuth: true },
  );
}

export function portalLogout() {
  return portalFetch<void>("/portal-proprietario/auth/logout", {
    method: "POST",
    skipAuth: true,
  });
}

export function fetchPortalMe() {
  return portalFetch<PortalProprietario>("/portal-proprietario/me");
}

export function fetchPortalDashboard() {
  return portalFetch<PortalDashboard>("/portal-proprietario/imoveis");
}

export function createPortalImovel(body: {
  tipo: string;
  cep?: string;
  logradouro: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  valorPretendido?: number;
  descricao?: string;
}) {
  return portalFetch<PortalImovelDetalhe>("/portal-proprietario/imoveis", {
    method: "POST",
    body,
  });
}

export function fetchPortalImovel(id: string) {
  return portalFetch<PortalImovelDetalhe>(`/portal-proprietario/imoveis/${id}`);
}

export function updatePortalImovel(
  id: string,
  body: {
    tipo?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    valorPretendido?: number;
    descricao?: string;
    area?: number;
    quartos?: number;
    suites?: number;
    banheiros?: number;
    vagas?: number;
  },
) {
  return portalFetch<PortalImovelDetalhe>(`/portal-proprietario/imoveis/${id}`, {
    method: "PATCH",
    body,
  });
}

export function cancelarPortalCaptacao(id: string) {
  return portalFetch<PortalImovelDetalhe>(
    `/portal-proprietario/imoveis/${id}/cancelar-captacao`,
    { method: "POST" },
  );
}

export function uploadPortalImovelFoto(id: string, file: File) {
  const data = new FormData();
  data.append("file", file);
  return portalFetch<PortalImovelDetalhe>(
    `/portal-proprietario/imoveis/${id}/fotos`,
    { method: "POST", body: data },
  );
}

export function deletePortalImovelFoto(id: string, fotoId: string) {
  return portalFetch<PortalImovelDetalhe>(
    `/portal-proprietario/imoveis/${id}/fotos/${fotoId}`,
    { method: "DELETE" },
  );
}

export function fetchPortalHistorico(id: string) {
  return portalFetch<
    Array<{ id: string; origem: string; tipo: string; texto: string; createdAt: string }>
  >(`/portal-proprietario/imoveis/${id}/historico`);
}

export function fetchPortalVisitas(id: string) {
  return portalFetch<{
    proximas: Array<{
      id: string;
      dataHora: string;
      status: string;
      interessadoNome: string;
      feedback: { comentarios: string | null } | null;
    }>;
    realizadas: Array<{
      id: string;
      dataHora: string;
      status: string;
      interessadoNome: string;
      feedback: { comentarios: string | null } | null;
    }>;
    canceladas: Array<{
      id: string;
      dataHora: string;
      status: string;
      interessadoNome: string;
    }>;
  }>(`/portal-proprietario/imoveis/${id}/visitas`);
}

export type PortalProposta = {
  id: string;
  origem?: "crm" | "usado";
  numero: string;
  codigo?: string | null;
  valor: number | null;
  desconto?: number | null;
  status: string;
  data: string;
  interessadoNome: string;
  unidade?: string | null;
  empreendimentoNome?: string | null;
  observacao?: string | null;
  validade?: string | null;
  corretorNome?: string | null;
  composicao?: Array<{ label: string; valor: number }>;
  negociacao: {
    status: string;
    valorInicial: number | null;
    ultimaContraproposta: number | null;
  } | null;
};

export function fetchPortalPropostas(id: string) {
  return portalFetch<PortalProposta[]>(
    `/portal-proprietario/imoveis/${id}/propostas`,
  );
}

export function fetchPortalFechamento(id: string) {
  return portalFetch<{
    status: string;
    documentacao: { aprovados: number; total: number };
    contrato: {
      numero: string;
      status: string;
      data: string;
      assinado: boolean;
    } | null;
  } | null>(`/portal-proprietario/imoveis/${id}/fechamento`);
}

export function fetchPortalDocumentacao(id: string) {
  return portalFetch<
    Array<{
      id: string;
      nome: string;
      status: string;
      updatedAt: string;
    }>
  >(`/portal-proprietario/imoveis/${id}/documentacao`);
}

export function fetchPortalContrato(id: string) {
  return portalFetch<{
    numero: string;
    status: string;
    data: string;
    assinado: boolean;
  } | null>(`/portal-proprietario/imoveis/${id}/contrato`);
}

export function fetchPortalChaves(id: string) {
  return portalFetch<{
    resumo: {
      total: number;
      disponivel: number;
      retirada: number;
      entregue: number;
    };
    itens: Array<{
      id: string;
      identificacao: string;
      status: string;
      historico: Array<{
        id: string;
        tipo: string;
        createdAt: string;
        responsavel: string | null;
      }>;
    }>;
  }>(`/portal-proprietario/imoveis/${id}/chaves`);
}

export function changePortalPassword(senhaAtual: string, senhaNova: string) {
  return portalFetch<void>("/portal-proprietario/me/senha", {
    method: "PATCH",
    body: { senhaAtual, senhaNova },
  });
}

export function fetchPortalNovidades() {
  return portalFetch<PortalNovidade[]>("/portal-proprietario/novidades");
}

export function marcarPortalNovidadesLidas() {
  return portalFetch<PortalNovidade[]>("/portal-proprietario/novidades/lidas", {
    method: "POST",
  });
}

export function registrarPortalAcao(
  id: string,
  tipo: "vi_e_concordo" | "quero_falar",
) {
  return portalFetch<{ ok: boolean; texto: string; jaRegistrado?: boolean }>(
    `/portal-proprietario/imoveis/${id}/acoes`,
    { method: "POST", body: { tipo } },
  );
}

export async function fetchPortalVisitasCarteira() {
  const dash = await fetchPortalDashboard();
  const rows = await Promise.all(
    dash.imoveis.map(async (imovel) => {
      if (!imovel.temComercializacao) {
        return { imovel, visitas: { proximas: [], realizadas: [], canceladas: [] } };
      }
      const visitas = await fetchPortalVisitas(imovel.id);
      return { imovel, visitas };
    }),
  );
  return rows;
}

export function fetchPortalPropostasCarteira() {
  return portalFetch<
    Array<{
      imovel: { id: string; identificacao: string };
      propostas: PortalProposta[];
    }>
  >("/portal-proprietario/propostas");
}

export async function fetchPortalDocumentosCarteira() {
  const dash = await fetchPortalDashboard();
  const rows = await Promise.all(
    dash.imoveis.map(async (imovel) => {
      if (!imovel.temComercializacao) return { imovel, docs: [] };
      const docs = await fetchPortalDocumentacao(imovel.id);
      return { imovel, docs };
    }),
  );
  return rows;
}

export function fetchPortalPosVenda(id: string) {
  return portalFetch<{
    status: string;
    pendencias: Array<{ id: string; titulo: string; status: string }>;
  } | null>(`/portal-proprietario/imoveis/${id}/pos-venda`);
}
