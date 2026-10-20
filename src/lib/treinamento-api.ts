import { apiFetch } from "@/lib/api";

export type TreinamentoLink = {
  id: string;
  secaoId: string;
  titulo: string;
  url: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TreinamentoSecao = {
  id: string;
  parentId: string | null;
  titulo: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  links: TreinamentoLink[];
  children: TreinamentoSecao[];
};

export async function fetchTreinamento(): Promise<TreinamentoSecao[]> {
  return apiFetch<TreinamentoSecao[]>("/treinamento");
}

export async function createTreinamentoSecao(input: {
  titulo: string;
  parentId?: string | null;
}): Promise<TreinamentoSecao> {
  return apiFetch<TreinamentoSecao>("/treinamento/secoes", {
    method: "POST",
    body: input,
  });
}

export async function updateTreinamentoSecao(
  id: string,
  titulo: string,
): Promise<TreinamentoSecao> {
  return apiFetch<TreinamentoSecao>(`/treinamento/secoes/${id}`, {
    method: "PATCH",
    body: { titulo },
  });
}

export async function deleteTreinamentoSecao(
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/treinamento/secoes/${id}`, {
    method: "DELETE",
  });
}

export async function uploadTreinamentoArquivo(input: {
  secaoId: string;
  titulo: string;
  file: File;
}): Promise<TreinamentoLink> {
  const data = new FormData();
  data.set("secaoId", input.secaoId);
  data.set("titulo", input.titulo);
  data.set("file", input.file);
  return apiFetch<TreinamentoLink>("/treinamento/links/upload", {
    method: "POST",
    body: data,
  });
}

export async function createTreinamentoLink(input: {
  secaoId: string;
  titulo: string;
  url: string;
}): Promise<TreinamentoLink> {
  return apiFetch<TreinamentoLink>("/treinamento/links", {
    method: "POST",
    body: input,
  });
}

export async function updateTreinamentoLink(
  id: string,
  input: { titulo?: string; url?: string },
): Promise<TreinamentoLink> {
  return apiFetch<TreinamentoLink>(`/treinamento/links/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteTreinamentoLink(
  id: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/treinamento/links/${id}`, {
    method: "DELETE",
  });
}
