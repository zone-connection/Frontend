/**
 * Funil de clientes é só a carteira (tipo cliente, sem ficha de lançamento).
 * Lead nunca entra nessa carteira do corretor.
 */
export function leadEntraNoFunil(input: {
  tipo: string;
  tipoFiltro: string;
  isClientesFunil: boolean;
  fichaDeLancamento: boolean;
  adminVeClientesCorretor: boolean;
}): boolean {
  const ehLead = input.tipo === "lead" || input.fichaDeLancamento;
  if (input.isClientesFunil) {
    if (ehLead) return false;
    return input.tipo === "cliente";
  }
  if (ehLead) return true;
  if (input.adminVeClientesCorretor && input.tipo === "cliente") return true;
  return input.tipo === input.tipoFiltro;
}
