import { apiFetch } from "@/lib/api";
import type { UserStatus } from "@/lib/auth";

export type TenantAdminUser = {
  id: string;
  tenantId?: string | null;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  documento: string;
  status: UserStatus;
  logoUrl: string | null;
  primaryColor: string | null;
  sidebarStyle: string;
  density: string;
  homePath: string;
  modules: Record<string, boolean> | null;
  plano: "solo" | "bronze" | "prata" | "ouro";
  maxUsuarios: number;
  usuariosExtras: number;
  iaBotEnabled: boolean;
  isTest: boolean;
  hasMetaConnection?: boolean;
  hasOzapConnection?: boolean;
  hasOruloConnection?: boolean;
  admin: TenantAdminUser | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantDetail = Tenant & {
  userCount: number;
  metaConnections: TenantMetaConnection[];
  ozapConnections: TenantOzapConnection[];
  oruloConnections: TenantOruloConnection[];
};

export type TenantOruloConnection = {
  id: string;
  tenantId: string;
  clientId: string;
  ativo: boolean;
  lastFullSyncAt: string | null;
  lastReconcileAt: string | null;
  lastError: string | null;
  syncing: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantMetaConnection = {
  id: string;
  tenantId: string;
  pageId: string;
  pageAccessToken: string;
  pageName?: string | null;
  adAccountId?: string | null;
  adAccountName?: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantOzapConnection = {
  id: string;
  tenantId: string;
  instanceId: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantInput = {
  name: string;
  slug: string;
  documento?: string;
  status?: UserStatus;
  logoUrl?: string | null;
  modules?: Record<string, boolean> | null;
  plano?: "solo" | "bronze" | "prata" | "ouro";
  maxUsuarios?: number;
  usuariosExtras?: number;
  iaBotEnabled?: boolean;
  isTest?: boolean;
};

export type CreateTenantAdminInput = {
  name?: string;
  email?: string;
  password?: string;
};

export type CreateTenantResult = Tenant & {
  admin: TenantAdminUser;
  temporaryPassword: string;
};

export type CreateTenantAdminResult = {
  user: TenantAdminUser;
  temporaryPassword: string;
};

export type UpdateTenantInput = {
  name?: string;
  documento?: string;
  status?: UserStatus;
  logoUrl?: string | null;
  modules?: Record<string, boolean> | null;
  plano?: "solo" | "bronze" | "prata" | "ouro";
  maxUsuarios?: number;
  usuariosExtras?: number;
  iaBotEnabled?: boolean;
  isTest?: boolean;
};

export type CreateMetaConnectionInput = {
  pageId: string;
  pageAccessToken: string;
  ativo?: boolean;
};

export type UpdateMetaConnectionInput = {
  pageAccessToken?: string;
  ativo?: boolean;
};

export type CreateOzapConnectionInput = {
  instanceId: number;
  ativo?: boolean;
};

export type UpdateOzapConnectionInput = {
  ativo?: boolean;
};

export type DemoDataCounts = {
  usuarios: number;
  equipes: number;
  catalogItems: number;
  localidades: number;
  construtoras: number;
  empreendimentos: number;
  leads: number;
  triagens: number;
  documentacoes: number;
  propostas: number;
  analises: number;
  agendamentos: number;
  metas: number;
  notificacoes: number;
  treinamentos: number;
  financeiro: number;
  proprietarios: number;
  imoveis: number;
  captacoes: number;
  interessadosUsados: number;
  vendasUsados: number;
};

export type PopulateDemoDataResult = {
  tenantId: string;
  tenantName: string;
  slug: string;
  limpou: boolean;
  senhaPadrao: string;
  usuariosCriados: { name: string; email: string; role: string }[];
  usuariosExtrasLiberados: number;
  counts: DemoDataCounts;
  tenant: TenantDetail;
};

export type ResetTenantAdminPasswordResult = {
  user: TenantAdminUser;
  temporaryPassword: string;
};

export async function fetchTenants(): Promise<Tenant[]> {
  return apiFetch<Tenant[]>("/tenants");
}

export async function fetchTenant(id: string): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/tenants/${id}`);
}

export async function createTenant(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  return apiFetch<CreateTenantResult>("/tenants", {
    method: "POST",
    body: input,
  });
}

export async function createTenantInitialAdmin(
  tenantId: string,
  input: CreateTenantAdminInput = {},
): Promise<CreateTenantAdminResult> {
  return apiFetch<CreateTenantAdminResult>(`/tenants/${tenantId}/admin`, {
    method: "POST",
    body: input,
  });
}

export async function createTenantUser(
  tenantId: string,
  input: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    whatsapp?: string;
    cargo?: string;
    role: "admin" | "gerente" | "corretor" | "analista" | "treinee";
    status?: UserStatus;
  },
): Promise<{
  user: TenantAdminUser;
  temporaryPassword?: string;
  usuariosExtrasIncremented: boolean;
}> {
  return apiFetch(`/tenants/${tenantId}/users`, {
    method: "POST",
    body: input,
  });
}

export async function resetTenantAdminPassword(
  tenantId: string,
): Promise<ResetTenantAdminPasswordResult> {
  return apiFetch<ResetTenantAdminPasswordResult>(
    `/tenants/${tenantId}/admin/reset-password`,
    { method: "POST" },
  );
}

export async function updateTenant(
  id: string,
  input: UpdateTenantInput,
): Promise<Tenant> {
  return apiFetch<Tenant>(`/tenants/${id}`, { method: "PATCH", body: input });
}

export async function uploadTenantLogo(
  id: string,
  file: File,
): Promise<{ logoUrl: string | null }> {
  const data = new FormData();
  data.append("file", file);
  return apiFetch<{ logoUrl: string | null }>(`/tenants/${id}/logo`, {
    method: "POST",
    body: data,
  });
}

export async function deleteTenantLogo(
  id: string,
): Promise<{ logoUrl: string | null }> {
  return apiFetch<{ logoUrl: string | null }>(`/tenants/${id}/logo`, {
    method: "DELETE",
  });
}

export async function updateTenantAdmin(
  tenantId: string,
  input: { name?: string; email?: string },
): Promise<TenantAdminUser> {
  return apiFetch<TenantAdminUser>(`/tenants/${tenantId}/admin`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteTenant(
  id: string,
): Promise<{ id: string; name: string; slug: string }> {
  return apiFetch(`/tenants/${id}`, { method: "DELETE" });
}

/** Gera dados fictícios completos (leads, imóveis, agenda, financeiro…) no tenant. */
export async function populateTenantDemoData(
  id: string,
  input: { limparAntes?: boolean; volumeExtra?: boolean } = {},
): Promise<PopulateDemoDataResult> {
  return apiFetch<PopulateDemoDataResult>(`/tenants/${id}/demo-data`, {
    method: "POST",
    body: input,
  });
}

export async function createMetaConnection(
  tenantId: string,
  input: CreateMetaConnectionInput,
): Promise<TenantMetaConnection> {
  return apiFetch<TenantMetaConnection>(
    `/tenants/${tenantId}/meta-connections`,
    { method: "POST", body: input },
  );
}

export async function updateMetaConnection(
  tenantId: string,
  connectionId: string,
  input: UpdateMetaConnectionInput,
): Promise<TenantMetaConnection> {
  return apiFetch<TenantMetaConnection>(
    `/tenants/${tenantId}/meta-connections/${connectionId}`,
    { method: "PATCH", body: input },
  );
}

export async function deleteMetaConnection(
  tenantId: string,
  connectionId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/tenants/${tenantId}/meta-connections/${connectionId}`,
    { method: "DELETE" },
  );
}

export async function fetchOzapConnections(
  tenantId: string,
): Promise<TenantOzapConnection[]> {
  return apiFetch<TenantOzapConnection[]>(
    `/tenants/${tenantId}/ozap-connections`,
  );
}

export async function createOzapConnection(
  tenantId: string,
  input: CreateOzapConnectionInput,
): Promise<TenantOzapConnection> {
  return apiFetch<TenantOzapConnection>(
    `/tenants/${tenantId}/ozap-connections`,
    { method: "POST", body: input },
  );
}

export async function updateOzapConnection(
  tenantId: string,
  connectionId: string,
  input: UpdateOzapConnectionInput,
): Promise<TenantOzapConnection> {
  return apiFetch<TenantOzapConnection>(
    `/tenants/${tenantId}/ozap-connections/${connectionId}`,
    { method: "PATCH", body: input },
  );
}

export async function deleteOzapConnection(
  tenantId: string,
  connectionId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/tenants/${tenantId}/ozap-connections/${connectionId}`,
    { method: "DELETE" },
  );
}

/** Gera slug kebab-case a partir do nome da imobiliária. */
export function slugifyTenantName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tenant"
  );
}
