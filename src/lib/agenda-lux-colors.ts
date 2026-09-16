import type { AgendamentoVisual } from "@/lib/agenda-api";

export const AGENDA_LUX_BLOCK: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] border-[#2563c9] text-white",
  ligacao: "bg-[#22a06b] border-[#1b8558] text-white",
  reuniao: "bg-[#7c5cbf] border-[#6849a8] text-white",
  tarefa: "bg-[#e0892a] border-[#c4731c] text-white",
  outro: "bg-[#2aa3a3] border-[#218686] text-white",
  bloqueio: "bg-[#d45c5c] border-[#b94a4a] text-white",
  aniversario: "bg-[#d46aa8] border-[#b85590] text-white",
};

export const AGENDA_LUX_CHIP: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] text-white",
  ligacao: "bg-[#22a06b] text-white",
  reuniao: "bg-[#7c5cbf] text-white",
  tarefa: "bg-[#e0892a] text-white",
  outro: "bg-[#2aa3a3] text-white",
  bloqueio: "bg-[#d45c5c] text-white",
  aniversario: "bg-[#d46aa8] text-white",
};
