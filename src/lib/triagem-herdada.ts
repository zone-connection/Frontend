export type TriagemOrigemHerdada = "caca_lead" | "retrabalho";

export function triagemHerdadaLabel(
  origem: TriagemOrigemHerdada | string | null | undefined,
): string | null {
  if (origem === "retrabalho") return "Retrabalho";
  if (origem === "caca_lead") return "Caça-lead";
  return null;
}

export function triagemHerdadaHint(
  origem: TriagemOrigemHerdada | string | null | undefined,
): string | null {
  if (origem === "retrabalho") {
    return "Este lead veio de retrabalho. A triagem do corretor anterior continua abaixo.";
  }
  if (origem === "caca_lead") {
    return "Este lead foi reatribuído (Caça-lead). A triagem anterior continua abaixo.";
  }
  return null;
}
