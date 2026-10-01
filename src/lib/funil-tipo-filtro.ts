/** Quem a documentação aprovou fica no funil de lançamentos, fora da carteira. */
export function leadEntraNoFunil(input: {
  tipo: string;
  tipoFiltro: string;
  isClientesFunil: boolean;
  aprovadoNaDocumentacao: boolean;
  adminVeClientesCorretor: boolean;
}): boolean {
  if (input.aprovadoNaDocumentacao) return !input.isClientesFunil;
  if (input.tipo === input.tipoFiltro) return true;
  if (
    !input.isClientesFunil &&
    input.adminVeClientesCorretor &&
    input.tipo === "cliente"
  ) {
    return true;
  }
  return false;
}
