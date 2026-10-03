import type { AgendamentoVisual } from "@/lib/agenda-api";

export const AGENDA_LUX_BLOCK: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] border-[#2563c9] text-white",
  ligacao: "bg-[#22a06b] border-[#1b8558] text-white",
  reuniao: "bg-[#7c5cbf] border-[#6849a8] text-white",
  tarefa: "bg-[#e0892a] border-[#c4731c] text-white",
  outro: "bg-[#2aa3a3] border-[#218686] text-white",
  bloqueio: "bg-[#d45c5c] border-[#b94a4a] text-white",
  retirada_chave: "bg-[#075a82] border-[#054a6b] text-white",
  aniversario: "bg-[#d46aa8] border-[#b85590] text-white",
};

export const AGENDA_LUX_CHIP: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] text-white",
  ligacao: "bg-[#22a06b] text-white",
  reuniao: "bg-[#7c5cbf] text-white",
  tarefa: "bg-[#e0892a] text-white",
  outro: "bg-[#2aa3a3] text-white",
  bloqueio: "bg-[#d45c5c] text-white",
  retirada_chave: "bg-[#075a82] text-white",
  aniversario: "bg-[#d46aa8] text-white",
};

/** Fundo suave da mesma paleta (cards não selecionados / faixa de horário). */
export const AGENDA_LUX_SOFT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8]/12 text-[#1d4fad] border-[#2f79e8]/30",
  ligacao: "bg-[#22a06b]/12 text-[#157a50] border-[#22a06b]/30",
  reuniao: "bg-[#7c5cbf]/12 text-[#5a3d99] border-[#7c5cbf]/30",
  tarefa: "bg-[#e0892a]/12 text-[#b56a16] border-[#e0892a]/30",
  outro: "bg-[#2aa3a3]/12 text-[#1c7a7a] border-[#2aa3a3]/30",
  bloqueio: "bg-[#d45c5c]/12 text-[#a63d3d] border-[#d45c5c]/30",
  retirada_chave: "bg-[#075a82]/12 text-[#075a82] border-[#075a82]/30",
  aniversario: "bg-[#d46aa8]/12 text-[#a34a80] border-[#d46aa8]/30",
};

export const AGENDA_LUX_WELL: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8] text-white",
  ligacao: "bg-[#22a06b] text-white",
  reuniao: "bg-[#7c5cbf] text-white",
  tarefa: "bg-[#e0892a] text-white",
  outro: "bg-[#2aa3a3] text-white",
  bloqueio: "bg-[#d45c5c] text-white",
  retirada_chave: "bg-[#075a82] text-white",
  aniversario: "bg-[#d46aa8] text-white",
};

export const AGENDA_LUX_DOT: Record<AgendamentoVisual, string> = {
  visita: "bg-[#2f79e8]",
  ligacao: "bg-[#22a06b]",
  reuniao: "bg-[#7c5cbf]",
  tarefa: "bg-[#e0892a]",
  outro: "bg-[#2aa3a3]",
  bloqueio: "bg-[#d45c5c]",
  retirada_chave: "bg-[#075a82]",
  aniversario: "bg-[#d46aa8]",
};
