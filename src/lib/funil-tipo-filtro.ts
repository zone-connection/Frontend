/**
 * Funil de clientes é a carteira (tipo cliente).
 * Funil de leads é a prospecção (tipo lead).
 * Quem a documentação ou a análise aprovou e ficou na entrada não entra no funil de leads.
 */
export function leadEntraNoFunil(input: {
  tipo: string;
  tipoFiltro: string;
  isClientesFunil: boolean;
  adminVeClientesCorretor: boolean;
  aprovadoNaEntrada?: boolean;
}): boolean {
  if (!input.isClientesFunil && input.aprovadoNaEntrada) return false;
  const ehLead = input.tipo === "lead";
  if (input.isClientesFunil) {
    if (ehLead) return false;
    return input.tipo === "cliente";
  }
  if (ehLead) return true;
  if (input.adminVeClientesCorretor && input.tipo === "cliente") return true;
  return input.tipo === input.tipoFiltro;
}
