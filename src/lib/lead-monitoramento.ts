export type PrazoUnidade = "minutos" | "horas" | "dias";

export type MonitoramentoFiltro =
  | "todos"
  | "sem_movimentacao"
  | "proximo_vencimento"
  | "em_atraso"
  | "dentro_prazo";

export type MonitoramentoVisual = "none" | "laranja" | "vermelho";

export type MonitoramentoNivel =
  "normal" | "proximo" | "atrasado" | "sem_movimentacao";

export type MotivoSemMovimentacao =
  "sem_status" | "sem_triagem" | "sem_atividade" | "sem_tarefa";

export type ProblemaMonitoramento = {
  tipo:
    | "prazo_ultrapassado"
    | "sem_movimentacao"
    | "prazo_proximo"
    | "tarefa_atrasada";
  titulo: string;
  detalhe: string;
  motivos?: MotivoSemMovimentacao[];
};

export type TarefaAtrasadaResumo = {
  id: string;
  titulo: string;
  prazo: string;
  funilStage: string | null;
};

export type LeadMonitoramento = {
  nivel: MonitoramentoNivel;
  visual: MonitoramentoVisual;
  problemas: ProblemaMonitoramento[];
  stageEnteredAt: string | null;
  prazoDueAt: string | null;
  prazoConfigurado: { valor: number; unidade: PrazoUnidade } | null;
  prazoAdiado: boolean;
  lastMovementAt: string | null;
  lastStageChangeAt: string | null;
  lastTriagemAt: string | null;
  lastTarefaAt: string | null;
  lastAtividadeAt: string | null;
  permanenciaMs: number;
  permanenciaLabel: string;
  tempoRestanteMs: number | null;
  tempoRestanteLabel: string | null;
  tempoAtrasoMs: number | null;
  tempoAtrasoLabel: string | null;
  tempoSemMovimentacaoMs: number;
  tempoSemMovimentacaoLabel: string;
  inatividadeThresholdMs: number;
  inatividadeConfig?: { valor: number; unidade: PrazoUnidade } | null;
  podeAdiar: boolean;
  tarefasAtrasadas?: TarefaAtrasadaResumo[];
};

export type LeadPrazoAdiamento = {
  id: string;
  autorNome: string;
  prazoAnteriorLabel: string;
  prazoNovoLabel: string;
  motivo: string | null;
  createdAt: string;
};

export type CorretorMonitoramentoLead = {
  id: string;
  nome: string;
  stage: string;
  problemas: ProblemaMonitoramento[];
  tarefasAtrasadas?: TarefaAtrasadaResumo[];
};

export type CorretorMonitoramento = {
  id: string;
  name: string;
  equipeId?: string | null;
  totalAtrasos: number;
  semMovimentacao: number;
  foraDoPrazo: number;
  tarefasAtrasadas?: number;
  leadsPerdidosReatribuicao?: number;
  leads: CorretorMonitoramentoLead[];
};

export type EquipeReatribuicaoResumo = {
  id: string;
  name: string;
  leadsPerdidosReatribuicao: number;
};

export type MonitoramentoAtrasos = {
  corretores: CorretorMonitoramento[];
  equipes: EquipeReatribuicaoResumo[];
};

export type AtrasosResumo = {
  corretores: number;
  leads: number;
  semMovimentacao: number;
  foraDoPrazo: number;
  tarefas: number;
  perdidosCorretores: number;
  perdidosEquipes: number;
};

/** Consolida os contadores de atraso de vários corretores. */
export function resumoAtrasos(
  rows: CorretorMonitoramento[],
  equipes: EquipeReatribuicaoResumo[] = [],
): AtrasosResumo {
  return rows.reduce<AtrasosResumo>(
    (acc, row) => ({
      corretores: acc.corretores + 1,
      leads: acc.leads + row.totalAtrasos,
      semMovimentacao: acc.semMovimentacao + row.semMovimentacao,
      foraDoPrazo: acc.foraDoPrazo + row.foraDoPrazo,
      tarefas: acc.tarefas + (row.tarefasAtrasadas ?? 0),
      perdidosCorretores:
        acc.perdidosCorretores + (row.leadsPerdidosReatribuicao ?? 0),
      perdidosEquipes: acc.perdidosEquipes,
    }),
    {
      corretores: 0,
      leads: 0,
      semMovimentacao: 0,
      foraDoPrazo: 0,
      tarefas: 0,
      perdidosCorretores: 0,
      perdidosEquipes: equipes.reduce(
        (sum, equipe) => sum + equipe.leadsPerdidosReatribuicao,
        0,
      ),
    },
  );
}

export const MOTIVO_SEM_MOVIMENTACAO_LABEL: Record<
  MotivoSemMovimentacao,
  string
> = {
  sem_status: "Sem alteração de status",
  sem_triagem: "Sem atualização na triagem",
  sem_atividade: "Sem atividade",
  sem_tarefa: "Sem tarefa",
};

export function matchesMonitoramentoFiltro(
  mon: LeadMonitoramento | null | undefined,
  filtro: MonitoramentoFiltro,
): boolean {
  if (filtro === "todos") return true;
  if (!mon) return false;
  if (filtro === "sem_movimentacao") {
    return mon.problemas.some((p) => p.tipo === "sem_movimentacao");
  }
  if (filtro === "em_atraso") {
    return mon.problemas.some(
      (p) => p.tipo === "prazo_ultrapassado" || p.tipo === "tarefa_atrasada",
    );
  }
  if (filtro === "proximo_vencimento") {
    return mon.problemas.some((p) => p.tipo === "prazo_proximo");
  }
  return (
    Boolean(mon.prazoDueAt) &&
    mon.visual === "none" &&
    !mon.problemas.some((p) => p.tipo === "prazo_ultrapassado")
  );
}

export const MONITORAMENTO_FILTRO_OPTIONS: Array<{
  value: MonitoramentoFiltro;
  label: string;
}> = [
  { value: "todos", label: "Todos" },
  { value: "sem_movimentacao", label: "Sem movimentação" },
  { value: "proximo_vencimento", label: "Próximos do vencimento" },
  { value: "em_atraso", label: "Em atraso" },
  { value: "dentro_prazo", label: "Dentro do prazo" },
];

export const PRAZO_UNIDADE_OPTIONS: Array<{
  value: PrazoUnidade;
  label: string;
}> = [
  { value: "minutos", label: "Minutos" },
  { value: "horas", label: "Horas" },
  { value: "dias", label: "Dias" },
];

export function formatPrazoUnidade(
  valor: number,
  unidade: PrazoUnidade,
): string {
  if (unidade === "minutos") return `${valor}min`;
  if (unidade === "horas") return `${valor}h`;
  return valor === 1 ? "1 dia" : `${valor} dias`;
}

export function formatDateTimePt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function inatividadeToMs(valor: number, unidade: PrazoUnidade): number {
  const n = Math.max(0, valor);
  if (unidade === "minutos") return n * 60_000;
  if (unidade === "dias") return n * 86_400_000;
  return n * 3_600_000;
}

function formatDurationPt(ms: number): string {
  const abs = Math.max(0, Math.round(ms));
  const totalMin = Math.floor(abs / 60_000);
  if (totalMin < 1) return "menos de 1min";
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}min`);
  if (parts.length === 0) return "menos de 1min";
  return parts.join(" ");
}

export type ApplyInatividadeExtras = {
  now?: number;
  prazo?: { valor: number; unidade: PrazoUnidade } | null;
  alertaPercent?: number;
};

/** Recalcula inatividade e prazo da etapa a partir da última movimentação. */
export function applyInatividadeThreshold(
  mon: LeadMonitoramento,
  valor: number,
  unidade: PrazoUnidade,
  extras?: ApplyInatividadeExtras,
): LeadMonitoramento {
  const now = extras?.now ?? Date.now();
  const thresholdMs = inatividadeToMs(valor, unidade);
  const last = latestMovementMs(mon);
  const idleMs = Number.isFinite(last)
    ? Math.max(0, now - last)
    : mon.tempoSemMovimentacaoMs;
  const isIdle = thresholdMs > 0 && idleMs >= thresholdMs;

  const problemas = mon.problemas.filter(
    (p) =>
      p.tipo !== "sem_movimentacao" &&
      p.tipo !== "prazo_ultrapassado" &&
      p.tipo !== "prazo_proximo",
  );

  let prazoDueAt = mon.prazoDueAt;
  let tempoRestanteMs = mon.tempoRestanteMs;
  let tempoRestanteLabel = mon.tempoRestanteLabel;
  let tempoAtrasoMs = mon.tempoAtrasoMs;
  let tempoAtrasoLabel = mon.tempoAtrasoLabel;

  const cfg =
    extras?.prazo !== undefined ? extras.prazo : mon.prazoConfigurado;
  if (cfg && Number.isFinite(last)) {
    const prazoMs = inatividadeToMs(cfg.valor, cfg.unidade);
    const due = last + prazoMs;
    prazoDueAt = new Date(due).toISOString();
    if (due > now) {
      tempoRestanteMs = due - now;
      tempoRestanteLabel = formatDurationPt(tempoRestanteMs);
      tempoAtrasoMs = null;
      tempoAtrasoLabel = null;
      const alertaPct = Math.min(90, Math.max(1, extras?.alertaPercent ?? 20));
      const nearAt = due - prazoMs * (alertaPct / 100);
      if (nearAt <= now) {
        problemas.push({
          tipo: "prazo_proximo",
          titulo: "Prazo próximo do vencimento",
          detalhe: `Restam ${tempoRestanteLabel} para o prazo da etapa.`,
        });
      }
    } else {
      tempoAtrasoMs = now - due;
      tempoAtrasoLabel = formatDurationPt(tempoAtrasoMs);
      tempoRestanteMs = null;
      tempoRestanteLabel = null;
      problemas.push({
        tipo: "prazo_ultrapassado",
        titulo: "Prazo da etapa ultrapassado",
        detalhe: `Atrasado há ${tempoAtrasoLabel}.`,
      });
    }
  } else {
    const overdue = mon.problemas.find((p) => p.tipo === "prazo_ultrapassado");
    const near = mon.problemas.find((p) => p.tipo === "prazo_proximo");
    if (overdue) problemas.push(overdue);
    if (near) problemas.push(near);
  }

  if (isIdle) {
    problemas.push({
      tipo: "sem_movimentacao",
      titulo: "Lead sem movimentação",
      detalhe: `Sem movimentação há ${formatDurationPt(idleMs)}.`,
      motivos: mon.problemas.find((p) => p.tipo === "sem_movimentacao")
        ?.motivos,
    });
  }

  const hasOverdue = problemas.some((p) => p.tipo === "prazo_ultrapassado");
  const hasIdle = problemas.some((p) => p.tipo === "sem_movimentacao");
  const hasNear = problemas.some((p) => p.tipo === "prazo_proximo");
  const hasTarefa = problemas.some((p) => p.tipo === "tarefa_atrasada");

  let nivel: LeadMonitoramento["nivel"] = "normal";
  let visual: LeadMonitoramento["visual"] = "none";
  if (hasOverdue || hasTarefa) {
    nivel = "atrasado";
    visual = "vermelho";
  } else if (hasIdle) {
    nivel = "sem_movimentacao";
    visual = "vermelho";
  } else if (hasNear) {
    nivel = "proximo";
    visual = "laranja";
  }

  return {
    ...mon,
    problemas,
    nivel,
    visual,
    prazoDueAt,
    tempoRestanteMs,
    tempoRestanteLabel,
    tempoAtrasoMs,
    tempoAtrasoLabel,
    tempoSemMovimentacaoMs: idleMs,
    tempoSemMovimentacaoLabel: formatDurationPt(idleMs),
    inatividadeThresholdMs: thresholdMs,
    inatividadeConfig: { valor, unidade },
    prazoConfigurado: cfg ?? mon.prazoConfigurado,
  };
}

export function applyOperacaoFunilThreshold<
  T extends {
    funilEtapaId?: string | null;
    monitoramento?: LeadMonitoramento | null;
  },
>(
  item: T,
  funil: {
    inatividadeValor: number;
    inatividadeUnidade: PrazoUnidade;
    etapas: Array<{
      id: string;
      papel: string | null;
      prazoValor: number | null;
      prazoUnidade: PrazoUnidade;
      alertaAntecedenciaPercent?: number;
    }>;
  },
): T {
  if (!item.monitoramento) return item;
  const etapa = funil.etapas.find((row) => row.id === item.funilEtapaId);
  const terminal = etapa?.papel === "venda" || etapa?.papel === "perdido";
  const prazo =
    !terminal && etapa?.prazoValor
      ? { valor: etapa.prazoValor, unidade: etapa.prazoUnidade }
      : null;
  return {
    ...item,
    monitoramento: applyInatividadeThreshold(
      item.monitoramento,
      funil.inatividadeValor,
      funil.inatividadeUnidade,
      {
        prazo,
        alertaPercent: etapa?.alertaAntecedenciaPercent,
      },
    ),
  };
}

function latestMovementMs(mon: LeadMonitoramento): number {
  const stamps = [
    mon.lastMovementAt,
    mon.lastTriagemAt,
    mon.lastAtividadeAt,
    mon.lastTarefaAt,
    mon.lastStageChangeAt,
    mon.stageEnteredAt,
  ];
  let latest = Number.NaN;
  for (const iso of stamps) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) continue;
    if (!Number.isFinite(latest) || t > latest) latest = t;
  }
  return latest;
}
