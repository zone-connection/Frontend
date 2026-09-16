import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlarmClockOff,
  ArrowRight,
  Clock,
  ListChecks,
  PauseCircle,
  UserRoundMinus,
  Users,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { useCatalog } from "@/lib/catalog-store";
import { resumoAtrasos } from "@/lib/lead-monitoramento";
import type {
  AtrasosResumo,
  CorretorMonitoramento,
  CorretorMonitoramentoLead,
  EquipeReatribuicaoResumo,
  ProblemaMonitoramento,
} from "@/lib/lead-monitoramento";
import { cn } from "@/lib/utils";

type ProblemaTipo = ProblemaMonitoramento["tipo"];

const PROBLEMA_STYLE: Record<
  ProblemaTipo,
  {
    label: string;
    icon: LucideIcon;
    dot: string;
    pill: string;
    wash: string;
  }
> = {
  prazo_ultrapassado: {
    label: "Fora do prazo",
    icon: AlarmClockOff,
    dot: "bg-rose-500",
    pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    wash: "border-rose-100 bg-rose-50/90 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20",
  },
  tarefa_atrasada: {
    label: "Tarefa atrasada",
    icon: ListChecks,
    dot: "bg-red-500",
    pill: "bg-red-500/10 text-red-700 dark:text-red-300",
    wash: "border-red-100 bg-red-50/80 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
  },
  sem_movimentacao: {
    label: "Sem movimentação",
    icon: PauseCircle,
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    wash: "border-amber-100 bg-amber-50/90 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
  },
  prazo_proximo: {
    label: "Prazo próximo",
    icon: Clock,
    dot: "bg-orange-400",
    pill: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    wash: "border-orange-100 bg-orange-50/90 hover:bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20",
  },
};

/** Ordem de gravidade usada para destacar o problema principal do lead. */
const PROBLEMA_PRIORIDADE: ProblemaTipo[] = [
  "prazo_ultrapassado",
  "tarefa_atrasada",
  "sem_movimentacao",
  "prazo_proximo",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function problemaPrincipal(lead: CorretorMonitoramentoLead): ProblemaTipo {
  if (lead.tarefasAtrasadas && lead.tarefasAtrasadas.length > 0) {
    return "tarefa_atrasada";
  }
  for (const tipo of PROBLEMA_PRIORIDADE) {
    if (lead.problemas.some((p) => p.tipo === tipo)) return tipo;
  }
  return "sem_movimentacao";
}

function ResumoChip({
  icon: Icon,
  valor,
  label,
  className,
}: {
  icon: LucideIcon;
  valor: number;
  label: string;
  className: string;
}) {
  if (valor <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold tabular-nums">{valor}</span>
      {label}
    </span>
  );
}

/** Chips agregados (sem movimentação / fora do prazo / tarefas). */
function AtrasosResumoChips({
  resumo,
  className,
}: {
  resumo: AtrasosResumo;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <ResumoChip
        icon={PauseCircle}
        valor={resumo.semMovimentacao}
        label="sem movimentação"
        className={PROBLEMA_STYLE.sem_movimentacao.pill}
      />
      <ResumoChip
        icon={AlarmClockOff}
        valor={resumo.foraDoPrazo}
        label="fora do prazo"
        className={PROBLEMA_STYLE.prazo_ultrapassado.pill}
      />
      <ResumoChip
        icon={ListChecks}
        valor={resumo.tarefas}
        label="tarefas"
        className={PROBLEMA_STYLE.tarefa_atrasada.pill}
      />
    </div>
  );
}

/** Aviso enxuto para telas que só sinalizam o problema (ex.: Ranking). */
export function AtrasosResumoBanner({
  rows,
  className,
}: {
  rows: CorretorMonitoramento[];
  className?: string;
}) {
  const resumo = useMemo(() => resumoAtrasos(rows), [rows]);
  if (resumo.corretores === 0) return null;

  return (
    <Card
      className={cn(
        "flex flex-wrap items-center gap-3 bg-linear-to-r from-card to-rose-500/5 p-3 sm:p-4",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
        <TriangleAlert className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {resumo.leads} lead{resumo.leads === 1 ? "" : "s"} em atraso com{" "}
          {resumo.corretores} corretor{resumo.corretores === 1 ? "" : "es"}
        </p>
        <p className="text-xs text-muted-foreground">
          Leads parados, fora do prazo da etapa ou com tarefa atrasada.
        </p>
      </div>
      <AtrasosResumoChips resumo={resumo} className="hidden lg:flex" />
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link to="/atrasos">
          Ver atrasos
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </Card>
  );
}

function CorretorAtrasoCard({
  row,
  stageName,
  stageColor,
  leadsVisiveis,
}: {
  row: CorretorMonitoramento;
  stageName: (slug: string) => string;
  stageColor: (slug: string) => string | null | undefined;
  leadsVisiveis: number;
}) {
  const [aberto, setAberto] = useState(false);
  const leads = aberto ? row.leads : row.leads.slice(0, leadsVisiveis);
  const restantes = row.leads.length - leads.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold text-white",
              lostLeadAvatarClass(row.name),
            )}
          >
            {initials(row.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{row.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <ResumoChip
              icon={PauseCircle}
              valor={row.semMovimentacao}
              label="parados"
              className={PROBLEMA_STYLE.sem_movimentacao.pill}
            />
            <ResumoChip
              icon={AlarmClockOff}
              valor={row.foraDoPrazo}
              label="fora do prazo"
              className={PROBLEMA_STYLE.prazo_ultrapassado.pill}
            />
            <ResumoChip
              icon={ListChecks}
              valor={row.tarefasAtrasadas ?? 0}
              label="tarefas"
              className={PROBLEMA_STYLE.tarefa_atrasada.pill}
            />
            <ResumoChip
              icon={UserRoundMinus}
              valor={row.leadsPerdidosReatribuicao ?? 0}
              label="perdidos na reatribuição"
              className="bg-slate-500/10 text-slate-600 dark:text-slate-300"
            />
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50">
          {row.totalAtrasos} {row.totalAtrasos === 1 ? "atraso" : "atrasos"}
        </span>
      </div>

      {row.leads.length > 0 ? (
        <ul className="space-y-2 bg-muted/20 p-3">
          {leads.map((lead) => {
            const tipo = problemaPrincipal(lead);
            const principal = PROBLEMA_STYLE[tipo];
            const tarefas = lead.tarefasAtrasadas ?? [];
            const color = stageColor(lead.stage);
            const tipos = new Set(
              lead.problemas.map((p) => p.tipo as ProblemaTipo),
            );
            if (tarefas.length > 0) tipos.add("tarefa_atrasada");
            return (
              <li key={lead.id}>
                <Link
                  to="/funil"
                  search={{ lead: lead.id }}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl border px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
                    principal.wash,
                  )}
                >
                  <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-[11px] font-semibold text-white",
                        lostLeadAvatarClass(lead.nome),
                      )}
                    >
                      {initials(lead.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {lead.nome}
                      </p>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium",
                          catalogColorBadgeClass(color),
                        )}
                        style={catalogColorBadgeStyle(color)}
                      >
                        {stageName(lead.stage)}
                      </span>
                      {[...tipos].map((item) => {
                        const estilo = PROBLEMA_STYLE[item];
                        const Icon = estilo.icon;
                        return (
                          <span
                            key={item}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              estilo.pill,
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {estilo.label}
                          </span>
                        );
                      })}
                    </div>
                    {tarefas.length > 0 ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-700 dark:text-red-300">
                        <ListChecks className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {tarefas[0].titulo} · prazo {tarefas[0].prazo}
                          {tarefas.length > 1
                            ? ` · +${tarefas.length - 1}`
                            : ""}
                        </span>
                      </p>
                    ) : lead.problemas[0]?.detalhe ? (
                      <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                        {lead.problemas[0].detalhe}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {row.leads.length > leadsVisiveis && (
        <button
          type="button"
          onClick={() => setAberto((prev) => !prev)}
          className="w-full border-t border-black/5 px-3 py-2 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {aberto
            ? "Mostrar menos"
            : `Ver mais ${restantes} lead${restantes === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}

/** Cards por corretor, do maior número de atrasos para o menor. */
export function CorretoresAtrasosGrid({
  rows,
  leadsVisiveis = 4,
  className,
}: {
  rows: CorretorMonitoramento[];
  leadsVisiveis?: number;
  className?: string;
}) {
  const { funnelStages } = useCatalog();

  const stageName = useMemo(() => {
    const map = new Map(funnelStages.map((stage) => [stage.id, stage.name]));
    return (slug: string) => map.get(slug) ?? slug;
  }, [funnelStages]);

  const stageColor = useMemo(() => {
    const map = new Map(funnelStages.map((stage) => [stage.id, stage.color]));
    return (slug: string) => map.get(slug);
  }, [funnelStages]);

  const ordenados = useMemo(
    () => [...rows].sort((a, b) => b.totalAtrasos - a.totalAtrasos),
    [rows],
  );

  return (
    <div className={cn("grid gap-3 xl:grid-cols-2", className)}>
      {ordenados.map((row) => (
        <CorretorAtrasoCard
          key={row.id}
          row={row}
          stageName={stageName}
          stageColor={stageColor}
          leadsVisiveis={leadsVisiveis}
        />
      ))}
    </div>
  );
}

export function EquipesReatribuicaoGrid({
  equipes,
  className,
}: {
  equipes: EquipeReatribuicaoResumo[];
  className?: string;
}) {
  if (equipes.length === 0) return null;
  return (
    <div className={cn("grid gap-3 xl:grid-cols-2 2xl:grid-cols-3", className)}>
      {equipes.map((equipe) => (
        <div key={equipe.id} className="rounded-2xl border border-black/5 bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{equipe.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Leads que saíram da equipe na reatribuição
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
              {equipe.leadsPerdidosReatribuicao}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
