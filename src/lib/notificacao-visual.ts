import {
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  FolderOpen,
  KeyRound,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { NotificacaoTipo } from "@/lib/notificacoes-api";

export type NotificacaoVisual = {
  icon: LucideIcon;
  wrap: string;
};

const ORANGE =
  "bg-[#FFF1E8] text-[#E06A1A] dark:bg-orange-500/15 dark:text-orange-300";
const SKY =
  "bg-[#E8F4FF] text-[#1D7AD6] dark:bg-sky-500/15 dark:text-sky-300";
const GREEN =
  "bg-[#E8F8EE] text-[#1F9A57] dark:bg-emerald-500/15 dark:text-emerald-300";
const VIOLET =
  "bg-[#F1EBFF] text-[#7A4FE0] dark:bg-violet-500/15 dark:text-violet-300";
const AMBER =
  "bg-[#FFF6D9] text-[#C48900] dark:bg-amber-500/15 dark:text-amber-300";
const RED =
  "bg-[#FDECEC] text-[#D63B3B] dark:bg-red-500/15 dark:text-red-300";
const TEAL =
  "bg-[#E6F7F4] text-[#0E8A7A] dark:bg-teal-500/15 dark:text-teal-300";

export function visualNotificacao(tipo: NotificacaoTipo): NotificacaoVisual {
  switch (tipo) {
    case "analise_resultado":
      return { icon: ClipboardCheck, wrap: ORANGE };
    case "agenda_solicitacao":
    case "agenda_resposta":
    case "agenda_atribuicao":
    case "agenda_lembrete_1d":
    case "agenda_lembrete_2h":
    case "agenda_lembrete_1h":
      return { icon: Calendar, wrap: SKY };
    case "lead_atribuido":
    case "lead_pool":
      return { icon: UserRound, wrap: GREEN };
    case "proposta_publica_recebida":
    case "proposta_publica_aceita":
    case "proposta_vencimento_proximo":
      return { icon: FileText, wrap: VIOLET };
    case "chave_retirada":
    case "chave_devolucao":
    case "chave_confirmacao":
      return { icon: KeyRound, wrap: AMBER };
    case "tarefa_atrasada":
    case "lead_prazo_ultrapassado":
    case "lead_sem_atendimento":
      return { icon: TriangleAlert, wrap: RED };
    case "lead_prazo_proximo":
      return { icon: TriangleAlert, wrap: ORANGE };
    case "imovel_compativel":
      return { icon: Building2, wrap: TEAL };
    case "processo_pendencia":
    case "processo_reenvio":
      return { icon: FolderOpen, wrap: ORANGE };
    default:
      return { icon: FileText, wrap: SKY };
  }
}
