import { apiFetch } from "@/lib/api";
import type { Role, UserStatus } from "@/lib/auth";
import type { UserPermissions } from "@/lib/user-permissions";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";

export const CRECI_PROCESSO_STATUS = [
  "nao_iniciado",
  "envio_documentacao",
  "pagamento_boleto",
  "aguardando_creci",
  "creci_recebido",
] as const;

export type CreciProcessoStatus = (typeof CRECI_PROCESSO_STATUS)[number];

export const CRECI_PROCESSO_ETAPAS = CRECI_PROCESSO_STATUS.filter(
  (status) => status !== "nao_iniciado",
);

export const CRECI_PROCESSO_LABEL: Record<CreciProcessoStatus, string> = {
  nao_iniciado: "Não iniciado",
  envio_documentacao: "Envio de documentação",
  pagamento_boleto: "Pagamento de boleto",
  aguardando_creci: "Aguardando CRECI",
  creci_recebido: "CRECI recebido",
};

export const CRECI_PROCESSO_SHORT: Record<CreciProcessoStatus, string> = {
  nao_iniciado: "—",
  envio_documentacao: "Envio docs",
  pagamento_boleto: "Boleto",
  aguardando_creci: "Aguardando",
  creci_recebido: "Recebido",
};

export const CRECI_PROCESSO_HINT: Record<CreciProcessoStatus, string> = {
  nao_iniciado: "O processo de obtenção do CRECI ainda não começou.",
  envio_documentacao: "Documentos enviados para o CRECI.",
  pagamento_boleto: "Boleto da taxa em pagamento.",
  aguardando_creci: "Aguardando a emissão do CRECI.",
  creci_recebido: "CRECI emitido. Informe o número no cadastro.",
};

export function creciProcessoBadgeClass(status: CreciProcessoStatus): string {
  const size = STATUS_CHIP_CLASS;
  if (status === "creci_recebido") {
    return `${size} bg-emerald-500/15 text-emerald-700 border-emerald-500/30`;
  }
  if (status === "aguardando_creci") {
    return `${size} bg-violet-500/15 text-violet-700 border-violet-500/30`;
  }
  if (status === "pagamento_boleto") {
    return `${size} bg-amber-500/15 text-amber-800 border-amber-500/30`;
  }
  if (status === "envio_documentacao") {
    return `${size} bg-sky-500/15 text-sky-700 border-sky-500/30`;
  }
  return `${size} text-muted-foreground`;
}

export function normalizeCreciStatus(
  value: string | null | undefined,
  creci?: string | null,
): CreciProcessoStatus {
  if (
    value &&
    (CRECI_PROCESSO_STATUS as readonly string[]).includes(value)
  ) {
    return value as CreciProcessoStatus;
  }
  return creci?.trim() ? "creci_recebido" : "nao_iniciado";
}

/** Quem pode informar o próprio CRECI (corretor/gerente ou processo já iniciado). */
export function userCanInformarCreci(user: {
  role?: string | null;
  creci?: string | null;
  creciStatus?: CreciProcessoStatus | string | null;
}) {
  if (!user.role || user.role === "super_admin") return false;
  if (
    user.role === "corretor" ||
    user.role === "treinee" ||
    user.role === "gerente" ||
    user.role === "admin"
  ) {
    return true;
  }
  if (user.creci?.trim()) return true;
  const status = normalizeCreciStatus(user.creciStatus, user.creci);
  return status !== "nao_iniciado";
}

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  dataNascimento: string | null;
  cargo: string | null;
  creci: string | null;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cep?: string | null;
  creciStatus?: CreciProcessoStatus | null;
  cor: string | null;
  role: Role;
  status: UserStatus;
  financeiroCanView?: boolean;
  financeiroCanCreate?: boolean;
  financeiroCanEdit?: boolean;
  financeiroCanDelete?: boolean;
  permissions?: UserPermissions | null;
  avatar: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedUsers = {
  data: ApiUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  whatsapp?: string;
  dataNascimento?: string | null;
  cargo?: string;
  creci?: string | null;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cep?: string | null;
  creciStatus?: CreciProcessoStatus;
  cor?: string | null;
  role: Role;
  status?: UserStatus;
  financeiroCanView?: boolean;
  financeiroCanCreate?: boolean;
  financeiroCanEdit?: boolean;
  financeiroCanDelete?: boolean;
  permissions?: UserPermissions;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  whatsapp?: string | null;
  dataNascimento?: string | null;
  cargo?: string | null;
  creci?: string | null;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cep?: string | null;
  creciStatus?: CreciProcessoStatus;
  cor?: string | null;
  role?: Role;
  status?: UserStatus;
  financeiroCanView?: boolean;
  financeiroCanCreate?: boolean;
  financeiroCanEdit?: boolean;
  financeiroCanDelete?: boolean;
  permissions?: UserPermissions;
};

export async function fetchUsers(params?: {
  search?: string;
  role?: Role;
  status?: UserStatus;
  comCreci?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.role) qs.set("role", params.role);
  if (params?.status) qs.set("status", params.status);
  if (params?.comCreci) qs.set("comCreci", "true");
  if (params?.sort) qs.set("sort", params.sort);
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 100));
  return apiFetch<PaginatedUsers>(`/users?${qs.toString()}`);
}

export type UsersQuota = {
  plano: "solo" | "bronze" | "prata" | "ouro";
  maxUsuarios: number;
  usuariosExtras: number;
  limite: number;
  usados: number;
  restantes: number;
  iaBotEnabled: boolean;
};

export async function fetchUsersQuota(): Promise<UsersQuota> {
  return apiFetch<UsersQuota>("/users/quota");
}

export type UserPresenceToday = {
  userId: string;
  secondsToday: number;
  online: boolean;
};

export async function fetchUsersPresenceToday(): Promise<UserPresenceToday[]> {
  const res = await apiFetch<{ data: UserPresenceToday[] }>(
    "/users/presence/today",
  );
  return res.data;
}

export type UserPresenceDay = {
  dateKey: string;
  seconds: number;
};

export type UserPresenceWeek = {
  userId: string;
  days: UserPresenceDay[];
  secondsWeek: number;
};

export async function fetchUserPresenceWeek(
  userId: string,
): Promise<UserPresenceWeek> {
  return apiFetch<UserPresenceWeek>(`/users/${userId}/presence/week`);
}

export async function createUser(input: CreateUserInput): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users", { method: "POST", body: input });
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`, { method: "PATCH", body: input });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function resetUserPassword(
  id: string,
  password?: string,
): Promise<{ user: ApiUser; temporaryPassword?: string }> {
  return apiFetch<{ user: ApiUser; temporaryPassword?: string }>(
    `/users/${id}/reset-password`,
    { method: "PATCH", body: password ? { password } : {} },
  );
}
