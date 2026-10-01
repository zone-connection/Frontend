/**
 * Funil de clientes é a carteira (tipo cliente).
 * Funil de leads é a prospecção (tipo lead).
 * Ter ficha de documentação não muda de funil.
 */
export function leadEntraNoFunil(input: {
  tipo: string;
  tipoFiltro: string;
  isClientesFunil: boolean;
  adminVeClientesCorretor: boolean;
}): boolean {
  const ehLead = input.tipo === "lead";
  if (input.isClientesFunil) {
    if (ehLead) return false;
    return input.tipo === "cliente";
  }
  if (ehLead) return true;
  if (input.adminVeClientesCorretor && input.tipo === "cliente") return true;
  return input.tipo === input.tipoFiltro;
}
