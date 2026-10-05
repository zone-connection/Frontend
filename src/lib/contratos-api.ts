import { apiFetch, apiFetchFile } from "@/lib/api";
import type { ContratoTemplateId } from "@/lib/contratos-templates";

export type ContratoDocumentoStatus = "rascunho" | "baixado";

export type ContratoDocumento = {
  id: string;
  templateId: ContratoTemplateId | string;
  titulo: string;
  values: Record<string, string>;
  status: ContratoDocumentoStatus;
  baixadoAt: string | null;
  createdAt: string;
  updatedAt: string;
  autor: { id: string; name: string };
};

export type UpsertContratoDocumentoInput = {
  templateId: string;
  values: Record<string, string>;
  status?: ContratoDocumentoStatus;
  titulo?: string;
};

export async function fetchContratoDocumentos() {
  return apiFetch<ContratoDocumento[]>("/contratos/documentos");
}

export async function saveContratoDocumento(
  input: UpsertContratoDocumentoInput,
  id?: string,
) {
  if (id) {
    return apiFetch<ContratoDocumento>(`/contratos/documentos/${id}`, {
      method: "PATCH",
      body: input,
    });
  }
  return apiFetch<ContratoDocumento>("/contratos/documentos", {
    method: "POST",
    body: input,
  });
}

export async function deleteContratoDocumento(id: string) {
  return apiFetch<{ ok: true }>(`/contratos/documentos/${id}`, {
    method: "DELETE",
  });
}

export type IntermediacaoAnaliseField = {
  key: string;
  value: string;
  confidence: "alta" | "media" | "baixa";
  snippet: string;
  warning?: string;
};

export type IntermediacaoAnalise = {
  intencao: "extrair" | "modelo";
  kind: "docx" | "pdf";
  textPreview: string;
  fields: IntermediacaoAnaliseField[];
  values: Record<string, string>;
  avisos: string[];
  fonte: "regras" | "ia+regras";
};

export async function analisarIntermediacaoArquivo(
  file: File,
  intencao: "extrair" | "modelo" = "extrair",
) {
  const data = new FormData();
  data.append("file", file);
  data.append("intencao", intencao);
  return apiFetch<IntermediacaoAnalise>("/contratos/intermediacao/analisar", {
    method: "POST",
    body: data,
  });
}

export async function confirmarModeloIntermediacao(
  file: File,
  mappings: { key: string; snippet: string }[],
) {
  const data = new FormData();
  data.append("file", file);
  data.append("mappings", JSON.stringify(mappings));
  return apiFetch<{
    intermediacaoModeloUrl: string | null;
    intermediacaoModeloNome: string;
    intermediacaoTemplateUrl: string | null;
  }>("/contratos/intermediacao/confirmar-modelo", {
    method: "POST",
    body: data,
  });
}

export async function downloadIntermediacaoModeloDocx(
  values: Record<string, string>,
) {
  const { blob, filename } = await apiFetchFile("/contratos/intermediacao/docx", {
    method: "POST",
    body: { templateId: "intermediacao", values },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "contrato-intermediacao.docx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadIntermediacaoModeloPdf(
  values: Record<string, string>,
) {
  const { blob, filename } = await apiFetchFile("/contratos/intermediacao/pdf", {
    method: "POST",
    body: { templateId: "intermediacao", values },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "contrato-intermediacao.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadContratoApiPdf(
  templateId: string,
  values: Record<string, string>,
) {
  const { blob, filename } = await apiFetchFile("/contratos/pdf", {
    method: "POST",
    body: { templateId, values },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "contrato.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
