import { ApiError, getApiUrl } from "@/lib/api";

const CSRF_COOKIE = "crm_parceiro_csrf";
const CSRF_STORAGE_KEY = "crm_parceiro_csrf_token";
const CSRF_HEADER = "X-CSRF-Token";
const USER_KEY = "crm_parceiro_session";

const isBrowser = () => typeof window !== "undefined";

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
  return sessionStorage.getItem(CSRF_STORAGE_KEY);
}

export const parceiroSessionCache = {
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
    //
  }
  return `Erro ${response.status} ao comunicar com o servidor.`;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshParceiro(): Promise<boolean> {
  const response = await fetch(`${getApiUrl()}/portal-parceiros/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    parceiroSessionCache.clear();
    return false;
  }
  try {
    const body = (await response.json()) as { csrfToken?: string };
    storeCsrf(body.csrfToken);
  } catch {
    //
  }
  return true;
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; skipAuth?: boolean };

async function parceiroRequest(path: string, options: Options = {}) {
  const { body, skipAuth, headers, ...rest } = options;
  const send = async () => {
    const csrf = skipAuth ? null : readCsrf();
    return fetch(`${getApiUrl()}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };
  let response = await send();
  if (response.status === 401 && !skipAuth) {
    refreshInFlight ??= refreshParceiro().finally(() => {
      refreshInFlight = null;
    });
    if (await refreshInFlight) response = await send();
  }
  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      parceiroSessionCache.clear();
      if (isBrowser() && !window.location.pathname.startsWith("/parceiros/login")) {
        window.location.assign("/parceiros/login");
      }
    }
    throw new ApiError(await parseError(response), response.status);
  }
  return response;
}

export async function parceiroFetch<T>(path: string, options: Options = {}): Promise<T> {
  const response = await parceiroRequest(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function storeParceiroCsrf(token: string | null | undefined) {
  storeCsrf(token);
}

export type PortalParceiro = { id: string; nome: string; email: string };

export function parceiroLogin(email: string, password: string) {
  return parceiroFetch<{ parceiro: PortalParceiro; csrfToken: string }>(
    "/portal-parceiros/auth/login",
    { method: "POST", body: { email, password }, skipAuth: true },
  );
}

export function parceiroLogout() {
  return parceiroFetch<void>("/portal-parceiros/auth/logout", {
    method: "POST",
    skipAuth: true,
  });
}

export function fetchParceiroMe() {
  return parceiroFetch<PortalParceiro>("/portal-parceiros/me");
}

export function fetchMinhasParcerias() {
  return parceiroFetch<
    Array<{
      id: string;
      status: string;
      percentualParceiro: number;
      tenant: { id: string; name: string; slug: string };
    }>
  >("/portal-parceiros/parcerias");
}

export function aceitarParceria(id: string) {
  return parceiroFetch(`/portal-parceiros/parcerias/${id}/aceitar`, {
    method: "POST",
  });
}

export function fetchVitrineParceiro() {
  return parceiroFetch<
    Array<{
      id: string;
      imobiliaria: string;
      tipo: string;
      endereco: string;
      bairro: string;
      cidade: string;
      descricao: string;
      fotoUrl: string | null;
      valor: number | null;
    }>
  >("/portal-parceiros/imoveis");
}

export function registrarInteresseParceiro(imovelId: string, mensagem?: string) {
  return parceiroFetch("/portal-parceiros/interesses", {
    method: "POST",
    body: { imovelId, mensagem },
  });
}

export function fetchOportunidadesParceiro() {
  return parceiroFetch<
    Array<{
      id: string;
      status: string;
      expiresAt: string | null;
      imobiliaria: string;
      lead: {
        id: string;
        nome: string;
        cidade: string;
        bairro: string;
        stage: string;
        telefone: string | null;
        email: string | null;
      };
    }>
  >("/portal-parceiros/oportunidades");
}

export function aceitarOportunidadeParceiro(id: string) {
  return parceiroFetch(`/portal-parceiros/oportunidades/${id}/aceitar`, {
    method: "POST",
  });
}

export function indicarClienteParceiro(body: {
  nome: string;
  telefone: string;
  email?: string;
  imovelId?: string;
  notas?: string;
}) {
  return parceiroFetch("/portal-parceiros/indicar", { method: "POST", body });
}

export function fetchRepassesParceiro() {
  return parceiroFetch<
    Array<{
      id: string;
      descricao: string;
      valor: number;
      status: string;
      createdAt: string;
      parceria: { tenant: { name: string } };
    }>
  >("/portal-parceiros/repasses");
}

export { CSRF_COOKIE };
