import { apiFetch } from "@/lib/api";

export type ListaDocumentoItem = {
  id: string;
  titulo: string;
  descricao: string;
  sortOrder: number;
};

export type ListaDocumento = {
  id: string;
  nome: string;
  chave: string | null;
  intro: string;
  aviso: string;
  sortOrder: number;
  itens: ListaDocumentoItem[];
};

export type ListaDocumentoItemDraft = {
  id?: string;
  titulo: string;
  descricao: string;
};

export function fetchListasDocumento() {
  return apiFetch<ListaDocumento[]>("/listas-documentos");
}

export function createListaDocumento(body: {
  nome: string;
  intro?: string;
  aviso?: string;
  itens: ListaDocumentoItemDraft[];
}) {
  return apiFetch<ListaDocumento>("/listas-documentos", {
    method: "POST",
    body,
  });
}

export function updateListaDocumento(
  id: string,
  body: {
    nome?: string;
    intro?: string;
    aviso?: string;
    itens?: ListaDocumentoItemDraft[];
  },
) {
  return apiFetch<ListaDocumento>(`/listas-documentos/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteListaDocumento(id: string) {
  return apiFetch<void>(`/listas-documentos/${id}`, { method: "DELETE" });
}

export const DOCUMENTOS_IDENTIFICACAO: ListaDocumentoItemDraft[] = [
  {
    titulo: "RG ou CNH",
    descricao: "Documento de identificação do titular.",
  },
  {
    titulo: "CPF",
    descricao: "Cadastro de Pessoa Física do titular.",
  },
  {
    titulo: "Comprovante de residência",
    descricao:
      "Pode ser conta de água, luz, telefone ou outro documento oficial em nome do titular.",
  },
  {
    titulo: "Certidão de estado civil",
    descricao:
      "Certidão de nascimento, casamento, casamento com averbação (divorciado) ou óbito, conforme o caso.",
  },
];
