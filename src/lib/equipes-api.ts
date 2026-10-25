import { apiFetch } from "@/lib/api";
import type { Role, UserStatus } from "@/lib/auth";

export type EquipeMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
};

export type EquipeFunilResumo = {
  id: string;
  name: string;
  tipo: "comercial" | "captacao" | "venda_usados" | "pos_venda";
  ativo: boolean;
};

export type EquipeFunisMap = {
  comercial: EquipeFunilResumo | null;
  captacao: EquipeFunilResumo | null;
  venda_usados: EquipeFunilResumo | null;
  pos_venda: EquipeFunilResumo | null;
};

export type Equipe = {
  id: string;
  name: string;
  status: UserStatus;
  gerenteId: string;
  createdAt: string;
  updatedAt: string;
  gerente: EquipeMember;
  membros: EquipeMember[];
  funis?: EquipeFunisMap;
  /** Leads da equipe (pool + atribuídos aos corretores). */
  leadsCount?: number;
  /** Leads no pool aguardando distribuição aos corretores. */
  leadsPool?: number;
};

export type EquipeOptionUser = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  equipeId?: string | null;
};

export type CreateEquipeInput = {
  name: string;
  gerenteId: string;
  membroIds?: string[];
  status?: UserStatus;
};

export type UpdateEquipeInput = {
  name?: string;
  gerenteId?: string;
  membroIds?: string[];
  status?: UserStatus;
};

export async function fetchEquipes(): Promise<Equipe[]> {
  return apiFetch<Equipe[]>("/equipes");
}

export async function fetchEquipe(id: string): Promise<Equipe> {
  return apiFetch<Equipe>(`/equipes/${id}`);
}

export async function fetchEquipeGerentes(
  equipeId?: string,
): Promise<EquipeOptionUser[]> {
  const qs = new URLSearchParams();
  if (equipeId) qs.set("equipeId", equipeId);
  const query = qs.toString();
  return apiFetch<EquipeOptionUser[]>(
    `/equipes/opcoes/gerentes${query ? `?${query}` : ""}`,
  );
}

export async function fetchEquipeCorretores(
  equipeId?: string,
): Promise<EquipeOptionUser[]> {
  const qs = new URLSearchParams();
  if (equipeId) qs.set("equipeId", equipeId);
  const query = qs.toString();
  return apiFetch<EquipeOptionUser[]>(
    `/equipes/opcoes/corretores${query ? `?${query}` : ""}`,
  );
}

export async function createEquipe(input: CreateEquipeInput): Promise<Equipe> {
  return apiFetch<Equipe>("/equipes", { method: "POST", body: input });
}

export async function updateEquipe(
  id: string,
  input: UpdateEquipeInput,
): Promise<Equipe> {
  return apiFetch<Equipe>(`/equipes/${id}`, { method: "PATCH", body: input });
}

export async function deleteEquipe(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/equipes/${id}`, { method: "DELETE" });
}

export async function putEquipeFunis(
  id: string,
  body: {
    comercial: string | null;
    captacao: string | null;
    venda_usados: string | null;
    pos_venda: string | null;
  },
): Promise<EquipeFunisMap> {
  return apiFetch<EquipeFunisMap>(`/equipes/${id}/funis`, {
    method: "PUT",
    body,
  });
}
