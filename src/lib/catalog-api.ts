import { apiFetch } from "@/lib/api";

export type CatalogType =
  | "funil_etapa"
  | "origem"
  | "motivo_perda"
  | "tag"
  | "documentacao_fonte"
  | "documentacao_status1"
  | "documentacao_status2"
  | "cca"
  | "empreendimento_tipo"
  | "empreendimento_status"
  | "empreendimento_tag";

export type FunilEtapaPapel =
  | "inicial"
  | "analise"
  | "venda"
  | "captado"
  | "perdido"
  | "concluido"
  | "aprovado"
  | "reprovado";

export interface CatalogItem {
  id: string;
  type: CatalogType;
  label: string;
  slug: string | null;
  color: string | null;
  sortOrder: number;
  active: boolean;
  /** Presente em etapas do funil (via funil ativo). */
  papel?: FunilEtapaPapel | null;
  createdAt: string;
  updatedAt: string;
}

export type GroupedCatalog = Record<CatalogType, CatalogItem[]>;

export interface CreateCatalogInput {
  type: CatalogType;
  label: string;
  /** Classes Tailwind da badge (etapas, origens, tags, motivos). */
  color?: string;
}

export interface UpdateCatalogInput {
  label?: string;
  color?: string;
  active?: boolean;
}

const emptyGrouped = (): GroupedCatalog => ({
  funil_etapa: [],
  origem: [],
  motivo_perda: [],
  tag: [],
  documentacao_fonte: [],
  documentacao_status1: [],
  documentacao_status2: [],
  cca: [],
  empreendimento_tipo: [],
  empreendimento_status: [],
  empreendimento_tag: [],
});

/** Busca todos os tipos agrupados. `activeOnly` filtra itens desativados. */
export async function fetchCatalog(activeOnly = true): Promise<GroupedCatalog> {
  const qs = new URLSearchParams();
  qs.set("activeOnly", String(activeOnly));
  const data = await apiFetch<GroupedCatalog>(`/catalog?${qs.toString()}`);
  return { ...emptyGrouped(), ...data };
}

export async function fetchCatalogByType(
  type: CatalogType,
  activeOnly = true,
): Promise<CatalogItem[]> {
  const qs = new URLSearchParams();
  qs.set("type", type);
  qs.set("activeOnly", String(activeOnly));
  return apiFetch<CatalogItem[]>(`/catalog?${qs.toString()}`);
}

export async function createCatalogItem(
  input: CreateCatalogInput,
): Promise<CatalogItem> {
  return apiFetch<CatalogItem>("/catalog", { method: "POST", body: input });
}

export async function updateCatalogItem(
  id: string,
  input: UpdateCatalogInput,
): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/catalog/${id}`, {
    method: "PATCH",
    body: input,
  });
}

/** Soft-delete: o backend marca `active: false`. */
export async function deleteCatalogItem(id: string): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/catalog/${id}`, { method: "DELETE" });
}

export async function reorderCatalog(
  type: CatalogType,
  orderedIds: string[],
): Promise<CatalogItem[]> {
  return apiFetch<CatalogItem[]>("/catalog/reorder", {
    method: "PATCH",
    body: { type, orderedIds },
  });
}

/** Instala/restaura as etapas padrão do funil no banco (admin/gerente). */
export async function installDefaultFunnelStages(): Promise<CatalogItem[]> {
  return apiFetch<CatalogItem[]>("/catalog/defaults/funil", {
    method: "POST",
  });
}
