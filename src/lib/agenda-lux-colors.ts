import type { AgendamentoVisual } from "@/lib/agenda-api";

const CHIP = "bg-sidebar text-sidebar-foreground";
const BLOCK = "bg-sidebar border-sidebar text-sidebar-foreground";

export const AGENDA_LUX_BLOCK: Record<AgendamentoVisual, string> = {
  visita: BLOCK,
  ligacao: BLOCK,
  reuniao: BLOCK,
  tarefa: BLOCK,
  outro: BLOCK,
  bloqueio: `${BLOCK} border-dashed`,
  aniversario: BLOCK,
};

export const AGENDA_LUX_CHIP: Record<AgendamentoVisual, string> = {
  visita: CHIP,
  ligacao: CHIP,
  reuniao: CHIP,
  tarefa: CHIP,
  outro: CHIP,
  bloqueio: CHIP,
  aniversario: CHIP,
};
