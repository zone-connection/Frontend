import { apiFetch } from "@/lib/api";

export type ParceriaStatus = "convite" | "ativa" | "suspensa" | "encerrada";

export type ParceriaListItem = {
  id: string;
  status: ParceriaStatus;
  percentualParceiro: number;
  slaDias: number;
  podeVerEstoque: boolean;
  podeReceberLead: boolean;
  podeIndicar: boolean;
  aceitoAt: string | null;
  parceiro: {
    id: string;
    nome: string;
    email: string;
    creci: string;
    telefone: string;
    imobiliariaOrigem: string;
    lastLoginAt: string | null;
  };
  _count: { interesses: number; participacoes: number; repasses: number };
};

export function fetchParcerias() {
  return apiFetch<ParceriaListItem[]>("/parcerias");
}

export function fetchParceria(id: string) {
  return apiFetch<ParceriaListItem & {
    interesses: Array<{
      id: string;
      mensagem: string;
      createdAt: string;
      imovel: { id: string; tipo: string; logradouro: string; bairro: string; cidade: string };
    }>;
    participacoes: Array<{
      id: string;
      status: string;
      expiresAt: string | null;
      lead: { id: string; nome: string; telefone: string; stage: string; cidade: string };
    }>;
    repasses: Array<{
      id: string;
      descricao: string;
      valor: number;
      status: string;
      pagoAt: string | null;
      createdAt: string;
    }>;
    eventos: Array<{ id: string; tipo: string; texto: string; createdAt: string }>;
  }>(`/parcerias/${id}`);
}

export function convidarParceiro(body: {
  email: string;
  nome: string;
  creci?: string;
  telefone?: string;
  imobiliariaOrigem?: string;
  percentualParceiro?: number;
  slaDias?: number;
}) {
  return apiFetch<ParceriaListItem & { senhaTemporaria?: string }>("/parcerias", {
    method: "POST",
    body,
  });
}

export function updateParceria(
  id: string,
  body: {
    status?: ParceriaStatus;
    percentualParceiro?: number;
    slaDias?: number;
    podeVerEstoque?: boolean;
    podeReceberLead?: boolean;
    podeIndicar?: boolean;
  },
) {
  return apiFetch<ParceriaListItem>(`/parcerias/${id}`, {
    method: "PATCH",
    body,
  });
}

export function fetchParceriaImoveis() {
  return apiFetch<
    Array<{
      id: string;
      tipo: string;
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      fotoUrl: string | null;
      liberadoParaParceria: boolean;
      _count: { interessesParceria: number };
    }>
  >("/parcerias/imoveis");
}

export function setImovelParceria(id: string, liberado: boolean) {
  return apiFetch<{ id: string; liberadoParaParceria: boolean }>(
    `/parcerias/imoveis/${id}`,
    { method: "PATCH", body: { liberado } },
  );
}

export function compartilharLeadParceria(parceriaId: string, leadId: string) {
  return apiFetch(`/parcerias/${parceriaId}/leads`, {
    method: "POST",
    body: { leadId },
  });
}

export function criarRepasseParceria(
  parceriaId: string,
  body: { descricao: string; valor: number; status?: string },
) {
  return apiFetch(`/parcerias/${parceriaId}/repasses`, {
    method: "POST",
    body,
  });
}
