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

const INFO =
  "bg-accent text-info dark:bg-info/15 dark:text-info";
const SUCCESS =
  "bg-success/10 text-success";
const BRAND =
  "bg-secondary text-brand-accent";
const MUTED =
  "bg-muted text-muted-foreground";

export function visualNotificacao(tipo: NotificacaoTipo): NotificacaoVisual {
  switch (tipo) {
    case "analise_resultado":
      return { icon: ClipboardCheck, wrap: SUCCESS };
    case "agenda_solicitacao":
    case "agenda_resposta":
    case "agenda_atribuicao":
    case "agenda_lembrete_1d":
    case "agenda_lembrete_2h":
    case "agenda_lembrete_1h":
      return { icon: Calendar, wrap: INFO };
    case "lead_atribuido":
    case "lead_pool":
      return { icon: UserRound, wrap: BRAND };
    case "proposta_publica_recebida":
    case "proposta_publica_aceita":
    case "proposta_vencimento_proximo":
      return { icon: FileText, wrap: MUTED };
    case "chave_retirada":
    case "chave_devolucao":
    case "chave_confirmacao":
      return { icon: KeyRound, wrap: SUCCESS };
    case "tarefa_atrasada":
    case "lead_prazo_ultrapassado":
    case "lead_sem_atendimento":
    case "lead_prazo_proximo":
      return { icon: TriangleAlert, wrap: INFO };
    case "imovel_compativel":
      return { icon: Building2, wrap: BRAND };
    case "processo_pendencia":
    case "processo_reenvio":
      return { icon: FolderOpen, wrap: MUTED };
    default:
      return { icon: FileText, wrap: INFO };
  }
}
