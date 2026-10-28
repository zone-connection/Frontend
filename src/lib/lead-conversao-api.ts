import { apiFetch } from "@/lib/api";

export type ConversaoLeadResult = {
  alreadyConverted: boolean;
  tenantId: string;
  contratoId: string;
  temporaryPassword?: string;
  titulos: Array<{
    id: string;
    descricao: string;
    parcela: string;
    valor: number;
    vencimento: string;
    status: string;
  }>;
};

export type ConverterLeadInput = {
  plano: "solo" | "bronze" | "prata" | "ouro";
  valorAdesao: number;
  qtdParcelasAdesao?: number;
  valorMensalidade: number;
  qtdMensalidades: number;
  dataInicio: string;
  vencimento: string;
  observacao?: string;
};

export function converterLeadCliente(leadId: string, input: ConverterLeadInput) {
  return apiFetch<ConversaoLeadResult>(`/leads/${leadId}/converter-cliente`, {
    method: "POST",
    body: input,
  });
}
