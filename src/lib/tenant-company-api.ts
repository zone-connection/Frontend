import { apiFetch } from "@/lib/api";
import type { TenantBranding } from "@/lib/auth";

export type TenantCompanyProfile = Pick<
  TenantBranding,
  | "id"
  | "name"
  | "slug"
  | "documento"
  | "creci"
  | "email"
  | "telefone"
  | "endereco"
  | "cidade"
  | "logoUrl"
>;

export type UpdateTenantCompanyInput = {
  name?: string;
  documento?: string;
  creci?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
};

export async function fetchTenantCompany(): Promise<TenantCompanyProfile> {
  return apiFetch<TenantCompanyProfile>("/tenant/company");
}

export async function updateTenantCompany(
  input: UpdateTenantCompanyInput,
): Promise<TenantCompanyProfile> {
  return apiFetch<TenantCompanyProfile>("/tenant/company", {
    method: "PATCH",
    body: input,
  });
}

export async function uploadTenantCompanyLogo(
  file: File,
): Promise<TenantCompanyProfile> {
  const data = new FormData();
  data.append("file", file);
  return apiFetch<TenantCompanyProfile>("/tenant/company/logo", {
    method: "POST",
    body: data,
  });
}

export async function deleteTenantCompanyLogo(): Promise<TenantCompanyProfile> {
  return apiFetch<TenantCompanyProfile>("/tenant/company/logo", {
    method: "DELETE",
  });
}

export type TenantOperationModules = {
  comercial: boolean;
  captacao: boolean;
  imoveisUsados: boolean;
  locacao: boolean;
};

export type TenantModulesResponse = {
  modules: Record<string, boolean>;
  operations: TenantOperationModules;
  hideClientesNav: boolean;
  adminVerClientesCorretor: boolean;
  gerenteVerLeadsGerais: boolean;
};

export async function fetchTenantOperationModules(): Promise<TenantModulesResponse> {
  return apiFetch<TenantModulesResponse>("/tenant/modules");
}

export async function updateTenantOperationModules(input: {
  captacao?: boolean;
  imoveisUsados?: boolean;
  locacao?: boolean;
  hideClientesNav?: boolean;
  adminVerClientesCorretor?: boolean;
  gerenteVerLeadsGerais?: boolean;
}): Promise<TenantModulesResponse> {
  return apiFetch<TenantModulesResponse>("/tenant/modules", {
    method: "PATCH",
    body: input,
  });
}
