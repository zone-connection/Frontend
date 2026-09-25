import { apiFetch } from "@/lib/api";

export type GrupoZapBlocked = {
  imovelId: string;
  titulo: string;
  reasons: string[];
};

export type GrupoZapIssue = {
  imovelId: string;
  level: string;
  message: string;
  reportExternalId: string;
  createdAt: string;
};

export type GrupoZapStatus = {
  connected: boolean;
  secretConfigured: boolean;
  displayAddress: "All" | "Street" | "Neighborhood";
  anuncianteId: string | null;
  leadUrl: string | null;
  feedUrl: string | null;
  reportUrl: string | null;
  publishableCount: number;
  blocked: GrupoZapBlocked[];
  issues: GrupoZapIssue[];
};

export function fetchGrupoZapStatus() {
  return apiFetch<GrupoZapStatus>("/integrations/grupozap/status");
}

export function connectGrupoZap() {
  return apiFetch<GrupoZapStatus>("/integrations/grupozap/connect", {
    method: "POST",
  });
}

export function disconnectGrupoZap() {
  return apiFetch<GrupoZapStatus>("/integrations/grupozap/disconnect", {
    method: "POST",
  });
}

export function updateGrupoZapDisplayAddress(
  displayAddress: GrupoZapStatus["displayAddress"],
) {
  return apiFetch<GrupoZapStatus>("/integrations/grupozap", {
    method: "PATCH",
    body: { displayAddress },
  });
}
