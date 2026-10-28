import { apiFetch } from "@/lib/api";

export type OnboardingEtapa = {
  id: string;
  ordem: number;
  titulo: string;
  obrigatoria: boolean;
  status: "pendente" | "concluida";
  pendencia: string;
  observacao: string;
  concluidaEm: string | null;
};

export type OnboardingItem = {
  id: string;
  tenantId: string;
  tenantNome: string;
  tenantPlano: string;
  contratoCodigo: string | null;
  contratoStatus: string | null;
  responsavelNome: string | null;
  inicio: string;
  prazoPrevisto: string;
  status: string;
  observacao: string;
  progresso: number;
  atrasado: boolean;
  etapas: OnboardingEtapa[];
};

export type OnboardingDetalhe = OnboardingItem & {
  historico: Array<{
    id: string;
    acao: string;
    detalhe: string;
    createdAt: string;
    autor: { name: string } | null;
  }>;
};

export function fetchOnboardings(situacao = "abertas") {
  return apiFetch<OnboardingItem[]>(`/onboarding?situacao=${situacao}`);
}

export function fetchOnboarding(id: string) {
  return apiFetch<OnboardingDetalhe>(`/onboarding/${id}`);
}

export function createOnboarding(input: {
  tenantId: string;
  inicio: string;
  prazoPrevisto: string;
  observacao?: string;
  justificativa?: string;
  platformContratoId?: string;
}) {
  return apiFetch<OnboardingItem>("/onboarding", { method: "POST", body: input });
}

export function updateOnboarding(
  id: string,
  input: { status?: string; prazoPrevisto?: string; observacao?: string },
) {
  return apiFetch<OnboardingItem>(`/onboarding/${id}`, { method: "PATCH", body: input });
}

export function updateOnboardingEtapa(
  id: string,
  etapaId: string,
  input: { status?: "pendente" | "concluida"; pendencia?: string; observacao?: string },
) {
  return apiFetch<OnboardingDetalhe>(`/onboarding/${id}/etapas/${etapaId}`, {
    method: "PATCH",
    body: input,
  });
}
