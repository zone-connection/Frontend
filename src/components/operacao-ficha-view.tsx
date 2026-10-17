import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { formatDateTimePt, type LeadMonitoramento } from "@/lib/lead-monitoramento";
import { cn } from "@/lib/utils";

export type OperacaoFichaAction = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
};

type Stage = { id: string; label: string; papel?: string | null };

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function basicStages(stages: Stage[], currentIndex: number) {
  const tagged = stages.map((stage, index) => ({ ...stage, index }));
  if (tagged.length <= 6) return tagged;
  const wanted = new Set<number>([0, tagged.length - 1]);
  if (currentIndex >= 0) wanted.add(currentIndex);
  for (let i = 0; i < 6; i++) wanted.add(Math.round((i / 5) * (tagged.length - 1)));
  let indexes = [...wanted].sort((a, b) => a - b);
  while (indexes.length > 6) {
    const drop = indexes
      .filter((index) => index !== 0 && index !== tagged.length - 1 && index !== currentIndex)
      .sort((a, b) => Math.abs(b - currentIndex) - Math.abs(a - currentIndex))[0];
    if (drop == null) break;
    indexes = indexes.filter((index) => index !== drop);
  }
  return indexes.map((index) => tagged[index]);
}

export function OperacaoFichaView({
  name,
  kind,
  chips,
  corretor,
  createdAt,
  onBack,
  temTelefone,
  onCall,
  onWhatsApp,
  perdaAction,
  funnelName,
  stages,
  currentStageId,
  monitoramento,
  facts,
  tabs,
  children,
  actions,
  primary,
}: {
  name: string;
  kind: string;
  chips?: string[];
  corretor?: string;
  createdAt?: string | null;
  onBack: () => void;
  temTelefone: boolean;
  onCall: () => void;
  onWhatsApp: () => void;
  perdaAction?: { label: string; onClick: () => void };
  funnelName: string;
  stages: Stage[];
  currentStageId?: string | null;
  monitoramento?: LeadMonitoramento | null;
  facts: Array<{ icon: LucideIcon; label: string; value: string }>;
  tabs: string[];
  children: (tab: string) => ReactNode;
  actions?: OperacaoFichaAction[];
  primary?: ReactNode;
}) {
  const [tab, setTab] = useState(tabs[0] ?? "Dados");
  const currentIndex = stages.findIndex((stage) => stage.id === currentStageId);
  const basic = basicStages(stages, currentIndex);
  const mon = monitoramento;
  const atrasado = mon?.visual === "vermelho";
  const prazoProximo = mon?.visual === "laranja";
  const principal = mon?.problemas[0];
  const created = createdAt ? formatDateTimePt(createdAt) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background [scrollbar-width:thin]">
      <div className="flex items-center justify-between py-3 pl-6 pr-14">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        {created ? <span className="text-xs text-muted-foreground">Criado em: {created}</span> : null}
      </div>

      <div className="mx-6 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#079ED4] text-lg font-semibold text-white">
              {initials(name) || "?"}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {kind}
                </span>
                {chips?.map((chip) => (
                  <span key={chip} className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">{chip}</span>
                ))}
              </div>
              {corretor ? (
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" /> Responsável: {corretor}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={!temTelefone} onClick={onCall}>
              <Phone /> Ligar
            </Button>
            <Button type="button" disabled={!temTelefone} onClick={onWhatsApp} className="bg-[#25D366] hover:bg-[#1ebe5d]">
              <FaWhatsapp /> WhatsApp
            </Button>
            {perdaAction ? (
              <Button type="button" variant="destructive" onClick={perdaAction.onClick}>
                <Trash2 /> {perdaAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-6 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold">{funnelName}</h2>
          <div className="mt-4 flex items-center overflow-x-auto">
            {basic.map((stage, index) => {
              const state = currentIndex < 0 ? "next" : stage.index < currentIndex ? "done" : stage.index === currentIndex ? "current" : "next";
              return (
                <div key={stage.id} className="flex min-w-0 flex-1 items-center">
                  <div className="flex min-w-0 flex-col items-center">
                    <span className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs",
                      state === "done" && "border-emerald-500 bg-emerald-500 text-white",
                      state === "current" && "border-[#079ED4] bg-card text-[#079ED4]",
                      state === "next" && "border-border bg-card text-muted-foreground",
                    )}>
                      {state === "done" ? <Check className="h-4 w-4" /> : state === "current" ? <span className="h-2.5 w-2.5 rounded-full bg-[#079ED4]" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                    <span className="mt-1 h-4" />
                    <span className={cn("max-w-[6.5rem] truncate text-xs", state === "current" ? "font-semibold text-[#05749E]" : "text-muted-foreground")}>{stage.label}</span>
                  </div>
                  {index < basic.length - 1 ? <span className={cn("mb-5 h-0.5 flex-1", basic[index + 1].index <= currentIndex ? "bg-emerald-500" : "bg-border")} /> : null}
                </div>
              );
            })}
          </div>
        </section>
        {principal ? (
          <aside className={cn("flex items-center gap-3 rounded-2xl border px-4 py-4", atrasado ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
            <Clock className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{atrasado ? "Atrasado" : prazoProximo ? "Prazo próximo" : principal.titulo}</p>
              <p className="text-xs">{principal.detalhe || principal.titulo}</p>
              <p className="text-xs font-medium">{mon?.tempoAtrasoLabel || mon?.tempoRestanteLabel || mon?.permanenciaLabel}</p>
            </div>
          </aside>
        ) : (
          <aside className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
            <Clock className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Em dia</p>
              <p className="text-xs">Nenhum prazo em aberto nesta etapa.</p>
            </div>
          </aside>
        )}
      </div>

      <div className="mx-6 mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <fact.icon className="h-3.5 w-3.5 text-[#079ED4]" /> {fact.label}
            </p>
            <p className="mt-1 truncate text-sm font-medium">{fact.value}</p>
          </div>
        ))}
      </div>

      <div className="mx-6 mt-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm",
              tab === item ? "bg-[#079ED4] font-medium text-white" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mx-6 mb-8 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {children(tab)}
        </section>
        <aside className="space-y-3">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Ações rápidas</h2>
            {(actions ?? []).length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Nenhuma ação disponível.</p>
            ) : (
              <ul className="mt-2">
                {(actions ?? []).map((action) => {
                  const Icon = action.icon ?? MoreHorizontal;
                  const className = "flex w-full items-center gap-2 border-b border-border py-2.5 text-left text-sm last:border-0 hover:text-[#05749E]";
                  const inner = (
                    <>
                      <Icon className="h-4 w-4 text-[#079ED4]" />
                      <span className="flex-1">{action.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </>
                  );
                  return (
                    <li key={action.label}>
                      {action.href ? (
                        <Link to={action.href as never} className={className}>{inner}</Link>
                      ) : (
                        <button type="button" onClick={action.onClick} className={className}>{inner}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Status do monitoramento</h2>
            <p className={cn("mt-3 inline-flex items-center gap-2 text-sm font-medium", atrasado ? "text-rose-700" : prazoProximo ? "text-amber-700" : "text-emerald-700")}>
              <span className={cn("h-2 w-2 rounded-full", atrasado ? "bg-rose-500" : prazoProximo ? "bg-amber-500" : "bg-emerald-500")} />
              {atrasado ? "Atrasado" : prazoProximo ? "Prazo próximo" : "Ativo"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {principal?.detalhe || "O registro está sendo acompanhado nesta etapa."}
            </p>
          </section>
          {primary ? (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Etapa atual</h2>
              <div className="mt-3">{primary}</div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function FichaDado({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export const OPERACAO_FICHA_DIALOG =
  "!left-0 !right-0 !top-14 !bottom-0 !h-auto !max-h-none !w-auto !max-w-none !translate-x-0 !translate-y-0 md:!left-[var(--app-sidebar,15rem)] !flex !flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none";
