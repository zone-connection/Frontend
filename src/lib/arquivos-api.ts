import { apiFetch, apiFetchFile } from "@/lib/api";

export type ArquivoVinculoTipo =
  | "lead"
  | "imovel"
  | "empreendimento"
  | "proprietario"
  | "venda_usado"
  | "documentacao"
  | "tarefa"
  | "proposta"
  | "processo";

export type ArquivoCategoria = "ficha" | "proposta" | "outro";

export type DocumentoTag = {
  id: string;
  nome: string;
  slug: string;
  active: boolean;
  createdAt: string;
  _count?: { arquivos: number };
};

export type ArquivoDocumento = {
  id: string;
  nome: string;
  nomeOriginal: string;
  categoria: ArquivoCategoria;
  mime?: string;
  bytes: number;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
  tags: { id: string; nome: string; active: boolean }[];
  vinculos: {
    entityType: ArquivoVinculoTipo;
    entityId: string;
    origem: string;
  }[];
};

export function fetchDocumentoTags(all = false, q?: string) {
  const qs = new URLSearchParams();
  if (all) qs.set("all", "1");
  if (q?.trim()) qs.set("q", q.trim());
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<DocumentoTag[]>(`/arquivos/tags${suffix}`);
}

export function createDocumentoTag(nome: string) {
  return apiFetch<DocumentoTag>("/arquivos/tags", {
    method: "POST",
    body: { nome },
  });
}

export function updateDocumentoTag(
  id: string,
  data: { nome?: string; active?: boolean },
) {
  return apiFetch<DocumentoTag>(`/arquivos/tags/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export type ArquivoHistoricoItem = {
  id: string;
  tipo: string;
  createdAt: string;
  autor: { id: string; name: string } | null;
  arquivo: string | null;
  email: string | null;
  count: number | null;
  nomes: string[];
  resultado: string | null;
};

export function fetchArquivoHistorico(params: {
  entityType: ArquivoVinculoTipo;
  entityId: string;
}) {
  const qs = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
  });
  return apiFetch<ArquivoHistoricoItem[]>(`/arquivos/historico?${qs}`);
}

export function fetchArquivos(params: {
  entityType: ArquivoVinculoTipo;
  entityId: string;
  categoria?: ArquivoCategoria;
}) {
  const qs = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
  });
  if (params.categoria) qs.set("categoria", params.categoria);
  return apiFetch<ArquivoDocumento[]>(`/arquivos?${qs}`);
}

export async function uploadArquivo(params: {
  file: File;
  entityType: ArquivoVinculoTipo;
  entityId: string;
  nome: string;
  categoria: ArquivoCategoria;
  tagIds: string[];
  extraEntityType?: ArquivoVinculoTipo;
  extraEntityId?: string;
}) {
  const data = new FormData();
  data.append("file", params.file);
  data.append("entityType", params.entityType);
  data.append("entityId", params.entityId);
  data.append("nome", params.nome);
  data.append("categoria", params.categoria);
  data.append("tagIds", JSON.stringify(params.tagIds));
  if (params.extraEntityType && params.extraEntityId) {
    data.append("extraEntityType", params.extraEntityType);
    data.append("extraEntityId", params.extraEntityId);
  }
  return apiFetch<ArquivoDocumento>("/arquivos/upload", {
    method: "POST",
    body: data,
  });
}

export function updateArquivo(
  id: string,
  data: { nomeExibicao?: string; tagIds?: string[] },
) {
  return apiFetch<ArquivoDocumento>(`/arquivos/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteArquivo(
  id: string,
  entityType: ArquivoVinculoTipo,
  entityId: string,
) {
  const qs = new URLSearchParams({ entityType, entityId });
  return apiFetch<{ ok: boolean }>(`/arquivos/${id}?${qs}`, {
    method: "DELETE",
  });
}

export function previewArquivo(id: string) {
  return apiFetch<{ url: string }>(`/arquivos/${id}/preview`);
}

export async function downloadArquivoFile(id: string) {
  return apiFetchFile(`/arquivos/${id}/download`);
}

export async function downloadArquivosZip(body: {
  entityType: ArquivoVinculoTipo;
  entityId: string;
  ids?: string[];
}) {
  return apiFetchFile("/arquivos/zip", { method: "POST", body });
}

export function shareArquivos(body: {
  entityType: ArquivoVinculoTipo;
  entityId: string;
  email: string;
  ids?: string[];
  all?: boolean;
}) {
  return apiFetch<{ ok: boolean; method: string }>("/arquivos/share", {
    method: "POST",
    body,
  });
}

export function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
