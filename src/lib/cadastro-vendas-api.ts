import { apiFetch } from "@/lib/api";

export type CadastroVenda = {
  id: string;
  clienteNome: string;
  telefone: string | null;
  construtoraId: string | null;
  empreendimentoId: string | null;
  corretorId: string | null;
  dataVenda: string;
  vgv: number;
  obs: string | null;
  createdAt: string;
  updatedAt: string;
  construtora: { id: string; nome: string; cor: string | null } | null;
  empreendimento: { id: string; nome: string } | null;
  corretor: { id: string; name: string } | null;
  autor: { id: string; name: string };
};

export type CadastroVendaInput = {
  clienteNome: string;
  telefone?: string | null;
  construtoraId?: string | null;
  empreendimentoId?: string | null;
  corretorId?: string | null;
  dataVenda: string;
  vgv: number;
  obs?: string | null;
};

export function fetchCadastroVendas() {
  return apiFetch<CadastroVenda[]>("/cadastro-vendas");
}

export function createCadastroVenda(input: CadastroVendaInput) {
  return apiFetch<CadastroVenda>("/cadastro-vendas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCadastroVenda(id: string, input: Partial<CadastroVendaInput>) {
  return apiFetch<CadastroVenda>(`/cadastro-vendas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCadastroVenda(id: string) {
  return apiFetch<{ ok: boolean }>(`/cadastro-vendas/${id}`, {
    method: "DELETE",
  });
}
