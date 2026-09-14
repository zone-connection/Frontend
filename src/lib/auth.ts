import { apiFetch, expireReadableCsrfCookies, sessionCache, storeCsrfToken } from "@/lib/api";

export type Role =
  | "super_admin"
  | "admin"
  | "gerente"
  | "corretor"
  | "analista"
  | "treinee"
  | "financeiro"
  | "assistente";
export type UserStatus = "ativo" | "inativo";

export type TenantBranding = {
  id: string;
  name: string;
  slug: string;
  documento?: string | null;
  creci?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  sidebarStyle: "default" | "dark" | "compact" | string;
  density: "comfortable" | "compact" | string;
  homePath: string;
  modules: Record<string, boolean> | null;
  plano?: "solo" | "bronze" | "prata" | "ouro";
  maxUsuarios?: number;
  usuariosExtras?: number;
  iaBotEnabled?: boolean;
};

export interface AuthUser {
  id: string;
  tenantId?: string | null;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  financeiroCanView?: boolean;
  financeiroCanCreate?: boolean;
  financeiroCanEdit?: boolean;
  financeiroCanDelete?: boolean;
  permissions?: {
    modules: Record<string, boolean>;
    actions: Record<string, boolean>;
  } | null;
  phone?: string | null;
  cargo?: string | null;
  creci?: string | null;
  notifyEmail?: string | null;
  creciStatus?: string | null;
  avatar?: string | null;
  lastLoginAt?: string | null;
  tenant?: TenantBranding | null;
}

interface LoginResponse {
  user: AuthUser;
  csrfToken?: string;
}

/** Intervalo entre revalidações em background de /auth/me. */
const SESSION_MAX_AGE_MS = 2 * 60_000;
const VALIDATED_AT_KEY = "crm_session_validated_at";

function readValidatedAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = sessionStorage.getItem(VALIDATED_AT_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeValidatedAt(ts: number) {
  if (typeof window === "undefined") return;
  if (ts <= 0) sessionStorage.removeItem(VALIDATED_AT_KEY);
  else sessionStorage.setItem(VALIDATED_AT_KEY, String(ts));
}

let lastValidatedAt = 0;
let revalidateInFlight: Promise<AuthUser | null> | null = null;
/** Uma validação obrigatória por carregamento da página (evita cache morto). */
let validatedThisDocument = false;

/**
 * Sessão em cache (sessionStorage), preenchida no login.
 * Continua síncrona para as telas que leem o usuário durante a renderização;
 * a validação real contra o backend acontece em `ensureSession`.
 * Tokens JWT NÃO ficam aqui — só em cookies httpOnly no browser.
 */
export function getSession(): AuthUser | null {
  return sessionCache.getUser<AuthUser>();
}

export async function signIn(
  email: string,
  password: string,
  tenantSlug?: string,
): Promise<AuthUser> {
  expireReadableCsrfCookies();
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    skipAuth: true,
    body: {
      email,
      password,
      ...(tenantSlug ? { tenantSlug } : {}),
    },
  });

  sessionCache.setUser(data.user);
  storeCsrfToken(data.csrfToken);
  lastValidatedAt = Date.now();
  writeValidatedAt(lastValidatedAt);
  validatedThisDocument = true;
  return data.user;
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } catch {
    // Mesmo se o backend estiver fora, a sessão local precisa ser encerrada.
  } finally {
    sessionCache.clear();
    lastValidatedAt = 0;
    writeValidatedAt(0);
    validatedThisDocument = false;
  }
}

/** Sinaliza atividade no CRM para medir tempo logado no dia. */
export async function sendHeartbeat(): Promise<void> {
  await apiFetch<void>("/auth/heartbeat", { method: "POST" });
}

/** Busca o usuário atual no backend e atualiza o cache local. */
function notifySessionUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("crm-session-updated"));
}

/** Atualiza `tenant.modules` na sessão sem esperar outro /auth/me. */
export function patchSessionTenantModules(modules: Record<string, boolean>) {
  const current = getSession();
  if (!current?.tenant) return;
  sessionCache.setUser({
    ...current,
    tenant: { ...current.tenant, modules },
  });
  notifySessionUpdated();
}

export async function fetchMe(): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>("/auth/me");
  sessionCache.setUser(user);
  lastValidatedAt = Date.now();
  writeValidatedAt(lastValidatedAt);
  notifySessionUpdated();
  return user;
}

/** Revalida /auth/me sem bloquear a navegação. Se a sessão morreu, manda para o login. */
function revalidateSessionInBackground(): void {
  if (revalidateInFlight) return;
  revalidateInFlight = fetchMe()
    .catch(() => {
      sessionCache.clear();
      lastValidatedAt = 0;
      writeValidatedAt(0);
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/portal")
      ) {
        window.location.assign("/login");
      }
      return null;
    })
    .finally(() => {
      revalidateInFlight = null;
    });
}

/**
 * Valida a sessão para o beforeLoad das rotas autenticadas.
 *
 * No primeiro acesso da página (ou com force), confirma cookies via /auth/me.
 * Nas navegações seguintes, usa o cache e revalida em background se estiver velho.
 */
export function isSessionReady(): boolean {
  return validatedThisDocument && !!getSession();
}

export async function ensureSession(options?: {
  force?: boolean;
}): Promise<AuthUser | null> {
  if (!lastValidatedAt) lastValidatedAt = readValidatedAt();

  const cached = getSession();
  const mustValidate = options?.force || !validatedThisDocument;

  if (mustValidate) {
    try {
      const user = await fetchMe();
      validatedThisDocument = true;
      return user;
    } catch {
      sessionCache.clear();
      lastValidatedAt = 0;
      writeValidatedAt(0);
      validatedThisDocument = false;
      return null;
    }
  }

  if (cached) {
    if (Date.now() - lastValidatedAt >= SESSION_MAX_AGE_MS) {
      revalidateSessionInBackground();
    }
    return cached;
  }

  try {
    const user = await fetchMe();
    validatedThisDocument = true;
    return user;
  } catch {
    sessionCache.clear();
    lastValidatedAt = 0;
    writeValidatedAt(0);
    return null;
  }
}

export async function updateMe(input: {
  creci?: string | null;
  notifyEmail?: string | null;
  corAside?: string | null;
  corPrincipal?: string | null;
  corModulo?: string | null;
}): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>("/auth/me", {
    method: "PATCH",
    body: input,
  });
  sessionCache.setUser(user);
  lastValidatedAt = Date.now();
  writeValidatedAt(lastValidatedAt);
  notifySessionUpdated();
  return user;
}

export async function uploadMyAvatar(file: File): Promise<AuthUser> {
  const data = new FormData();
  data.append("file", file);
  const user = await apiFetch<AuthUser>("/auth/me/avatar", {
    method: "POST",
    body: data,
  });
  sessionCache.setUser(user);
  lastValidatedAt = Date.now();
  writeValidatedAt(lastValidatedAt);
  notifySessionUpdated();
  return user;
}

export async function removeMyAvatar(): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>("/auth/me/avatar", {
    method: "DELETE",
  });
  sessionCache.setUser(user);
  lastValidatedAt = Date.now();
  writeValidatedAt(lastValidatedAt);
  notifySessionUpdated();
  return user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<void>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function forgotPassword(
  email: string,
): Promise<{ resetToken?: string }> {
  return apiFetch<{ resetToken?: string }>("/auth/forgot-password", {
    method: "POST",
    skipAuth: true,
    body: { email },
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await apiFetch<void>("/auth/reset-password", {
    method: "POST",
    skipAuth: true,
    body: { token, password },
  });
}
