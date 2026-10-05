import { apiFetch } from "@/lib/api";

export type OruloConnection = {
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

export type OruloStatus = {
  connected: boolean;
  connection: OruloConnection | null;
  webhookUrl: string | null;
  oauthRedirectUri: string;
  buildingCount: number;
  endUserAuthorized?: boolean;
};

export type OruloComercial = {
  orulo: boolean;
  authorized?: boolean;
  stored?: boolean;
  oruloUrl: string | null;
  website?: string | null;
  buildingId?: number;
  commissionPct?: number | null;
  opportunity?: Record<string, unknown> | null;
  commercialContacts?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
};

export function fetchOruloStatus() {
  return apiFetch<OruloStatus>("/integrations/orulo/status");
}

export function connectOrulo(input: {
  clientId: string;
  clientSecret: string;
}) {
  return apiFetch<OruloConnection>("/integrations/orulo/connect", {
    method: "POST",
    body: input,
  });
}

export function disconnectOrulo() {
  return apiFetch<{ ok: boolean }>("/integrations/orulo/disconnect", {
    method: "POST",
  });
}

export function syncOrulo() {
  return apiFetch<{ ok: boolean; started: boolean }>("/integrations/orulo/sync", {
    method: "POST",
  });
}

export function fetchOruloOAuthUrl(returnTo?: string) {
  const query = returnTo
    ? `?returnTo=${encodeURIComponent(returnTo)}`
    : "";
  return apiFetch<{ url: string; redirectUri: string }>(
    `/integrations/orulo/oauth/url${query}`,
  );
}

export function startOruloEndUserOAuth(returnTo?: string) {
  return fetchOruloOAuthUrl(returnTo ?? window.location.pathname).then((res) => {
    window.location.assign(res.url);
  });
}

export function completeOruloOAuth(code: string, state?: string) {
  return apiFetch<{ connected: boolean; returnTo?: string }>(
    "/integrations/orulo/oauth/complete",
    {
      method: "POST",
      body: { code, state },
    },
  );
}

export function disconnectOruloEndUser() {
  return apiFetch<{ connected: boolean }>("/integrations/orulo/oauth/disconnect", {
    method: "POST",
  });
}

export function fetchOruloComercial(empreendimentoId: string) {
  return apiFetch<OruloComercial>(
    `/integrations/orulo/empreendimentos/${empreendimentoId}/comercial`,
  );
}

export function upsertTenantOruloConnection(
  tenantId: string,
  input: { clientId: string; clientSecret: string; ativo?: boolean },
) {
  return apiFetch<OruloConnection>(`/tenants/${tenantId}/orulo-connection`, {
    method: "POST",
    body: input,
  });
}

export function updateTenantOruloConnection(
  tenantId: string,
  input: { ativo: boolean },
) {
  return apiFetch<OruloConnection>(`/tenants/${tenantId}/orulo-connection`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteTenantOruloConnection(tenantId: string) {
  return apiFetch<{ ok: boolean }>(`/tenants/${tenantId}/orulo-connection`, {
    method: "DELETE",
  });
}
