/**
 * Lead sem funil gravado continua no funil em uso.
 * Lead de outro funil não entra neste quadro.
 */
export function leadVisivelNoFunilEmUso(
  leadFunilId: string | null | undefined,
  funilEmUsoId: string,
): boolean {
  return !leadFunilId || leadFunilId === funilEmUsoId;
}
