/**
 * Client HTTP do backend (NestJS).
 *
 * Autenticação via cookies httpOnly (JS não consegue ler o JWT — anti-XSS).
 * Mutações autenticadas enviam o header X-CSRF-Token (double-submit cookie).
 * credentials: "include" é obrigatório para o browser anexar os cookies.
 *
 * A URL da API no browser é SEMPRE same-origin `/api`:
 * - Dev: proxy do Vite → Nest
 * - Prod (Vercel): rewrite em vercel.json → Render
 * Apontar VITE_API_URL para o domínio do Render torna o cookie third-party
 * (Firefox/Chrome bloqueiam → 401 em /auth/me após login).
 */

function resolveApiUrl(): string {
  // No browser, SEMPRE same-origin `/api` (Vite proxy / Vercel rewrite).
  // URL absoluta quebra CSRF: cookie fica no domínio da API e o header
  // lê token antigo do frontend (ou sessionStorage desatualizado).
  if (typeof window !== "undefined") return "/api";

  const configured = (
    import.meta.env.VITE_API_URL as string | undefined
  )?.trim();
  if (!configured || configured === "/api") return "/api";
  return configured;
}

/** Resolve a cada chamada — evita URL absoluta “presa” de SSR/build. */
export function getApiUrl(): string {
  return resolveApiUrl();
}

/** @deprecated use getApiUrl() — mantido para imports existentes. */
export const API_URL = "/api";

const USER_KEY = "crm_session_user";
const CSRF_COOKIE = "crm_csrf";
const CSRF_STORAGE_KEY = "crm_csrf_token";
const CSRF_HEADER = "X-CSRF-Token";

/** Chaves antigas (JWT no localStorage) — removidas na migração anti-XSS. */
const LEGACY_TOKEN_KEYS = ["crm_access_token", "crm_refresh_token"] as const;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const isBrowser = () => typeof window !== "undefined";

function clearLegacyTokens() {
  if (!isBrowser()) return;
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

clearLegacyTokens();

/** Cache do perfil (não é segredo). Tokens JWT ficam só em cookies httpOnly. */
export const sessionCache = {
  getUser: <T>(): T | null => {
    if (!isBrowser()) return null;
    const raw =
      sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setUser: (user: unknown) => {
    if (!isBrowser()) return;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(USER_KEY);
  },
  clear: () => {
    if (!isBrowser()) return;
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
    clearLegacyTokens();
  },
};

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const parts = document.cookie
    .split("; ")
    .filter((row) => row.startsWith(`${name}=`));
  if (parts.length === 0) return null;
  const match = parts[parts.length - 1]!;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function expireReadableCsrfCookies() {
  if (!isBrowser()) return;
  const expire = `${CSRF_COOKIE}=; max-age=0`;
  for (const path of ["/", "/api"]) {
    document.cookie = `${expire}; path=${path}`;
    document.cookie = `${expire}; path=${path}; secure`;
  }
}

/**
 * Prefere sessionStorage (atualizado no login/refresh) e só cai no cookie
 * same-origin. Cookie legado de outro domínio/proxy antigo não pode ganhar
 * do token fresco — senão header ≠ cookie da API → 403 CSRF.
 */
function readCsrfToken(): string | null {
  if (!isBrowser()) return null;
  return (
    sessionStorage.getItem(CSRF_STORAGE_KEY) ?? readCookie(CSRF_COOKIE)
  );
}

export function storeCsrfToken(token: string | null | undefined) {
  if (!isBrowser()) return;
  if (!token) {
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(CSRF_STORAGE_KEY, token);
}

async function parseError(response: Response): Promise<string> {
  if (response.status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  }

  try {
    const body = await response.json();
    const message = body?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  } catch {
    // resposta sem corpo JSON
  }
  return `Erro ${response.status} ao comunicar com o servidor.`;
}

/** Garante que várias requisições em paralelo disparem um único refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    sessionCache.clear();
    return false;
  }
  try {
    const body = (await response.json()) as { csrfToken?: string };
    // Body é a fonte da verdade após refresh (evita cookie legado divergente).
    storeCsrfToken(body.csrfToken);
  } catch {
    const cookieToken = readCookie(CSRF_COOKIE);
    if (cookieToken) storeCsrfToken(cookieToken);
  }
  return true;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Rotas públicas não exigem CSRF (login, forgot-password...). */
  skipAuth?: boolean;
}

async function requestWithAuth(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { body, skipAuth, headers, ...rest } = options;
  const method = (rest.method ?? "GET").toString().toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const send = async (): Promise<Response> => {
    const csrf = skipAuth ? null : readCsrfToken();
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    return fetch(`${getApiUrl()}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
        ...headers,
      },
      ...(body !== undefined
        ? { body: isFormData ? body : JSON.stringify(body) }
        : {}),
    });
  };

  if (!skipAuth && isMutation && !readCsrfToken()) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    await refreshInFlight;
  }

  let response = await send();

  if (response.status === 401 && !skipAuth) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      response = await send();
    }
  }

  if (response.status === 403 && !skipAuth && isMutation) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      response = await send();
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      sessionCache.clear();
      if (
        isBrowser() &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/portal") &&
        !window.location.pathname.startsWith("/publico")
      ) {
        window.location.assign("/login");
      }
    }
    throw new ApiError(await parseError(response), response.status);
  }

  return response;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await requestWithAuth(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function apiFetchFile(
  path: string,
  options: RequestOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const response = await requestWithAuth(path, options);
  const blob = await response.blob();
  const header = response.headers.get("Content-Disposition") ?? "";
  const match = header.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
  const filename = match
    ? decodeURIComponent(match[1].replace(/"/g, "").trim())
    : "documento.pdf";
  return { blob, filename };
}
