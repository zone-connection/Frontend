import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  MoreHorizontal,
  Phone,
  Send,
  Share2,
  Trash2,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { DocumentacoesLeadPanel } from "@/components/documentacoes-lead-panel";
import { LeadWhatsappChat } from "@/components/lead-whatsapp-chat";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import {
  HistoryTimeline,
  MAX_TRIAGEM_TEXTO,
  formatTriagemWhen,
} from "@/components/triagem-history-timeline";
import type { ArquivoHistoricoItem } from "@/lib/arquivos-api";
import { brl, type Lead } from "@/lib/crm-types";
import { formatDateTimePt } from "@/lib/lead-monitoramento";
import { formatPhone } from "@/lib/phone";
import type { TriagemEvent } from "@/lib/triagem-api";
import { cn } from "@/lib/utils";

type FichaAction = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
};

const TABS = ["Dados", "Atividade", "Triagem", "WhatsApp", "Documentações"] as const;

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "relato", label: "Relatos da triagem" },
  { id: "envio", label: "Arquivos enviados" },
  { id: "visualizacao", label: "Visualizações" },
  { id: "download", label: "Downloads" },
  { id: "compartilhamento", label: "Compartilhamentos" },
  { id: "exclusao", label: "Exclusões" },
];

type HistoryKind = (typeof FILTERS)[number]["id"];

function fileKind(tipo: string): HistoryKind {
  if (tipo === "upload") return "envio";
  if (tipo === "visualizar") return "visualizacao";
  if (tipo === "download" || tipo === "download_zip") return "download";
  if (tipo === "excluir") return "exclusao";
  if (tipo === "compartilhar_email" || tipo.startsWith("share")) return "compartilhamento";
  return "envio";
}

function fileMeta(tipo: string): { title: string; icon: LucideIcon; tone: string } {
  switch (fileKind(tipo)) {
    case "visualizacao":
      return { title: "Arquivo visualizado", icon: Eye, tone: "bg-violet-500" };
    case "download":
      return { title: "Arquivo baixado", icon: Download, tone: "bg-cyan-600" };
    case "exclusao":
      return { title: "Arquivo excluído", icon: Trash2, tone: "bg-rose-500" };
    case "compartilhamento":
      return { title: "Arquivo compartilhado", icon: Share2, tone: "bg-indigo-500" };
    default:
      return { title: "Arquivo enviado", icon: Upload, tone: "bg-sky-500" };
  }
}

function fileDetail(ev: ArquivoHistoricoItem) {
  if (ev.nomes.length) return ev.nomes.join(", ");
  if (ev.arquivo) return ev.arquivo;
  if (ev.email) return ev.email;
  return "Arquivo";
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function basicStages(
  stages: { id: string; name: string; papel?: string | null }[],
  currentIndex: number,
) {
  const tagged = stages.map((stage, index) => ({ ...stage, index }));
  if (tagged.length <= 6) return tagged;
  const wanted = new Set<number>([0, tagged.length - 1]);
  if (currentIndex >= 0) wanted.add(currentIndex);
  for (let i = 0; i < 6; i++) {
    wanted.add(Math.round((i / 5) * (tagged.length - 1)));
  }
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

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

export function LeadFichaView({
  lead,
  stages,
  funnelName,
  email,
  temTelefone,
  showMeuLeadBadge,
  equipe,
  onBack,
  onCall,
  onWhatsApp,
  perdaAction,
  moreActions,
  primaryAction,
  triagemTexto,
  onTriagemTexto,
  onRegistrarTriagem,
  triagemSaving,
  podeTriagem,
  events,
  eventsLoading,
  stageLabel,
  onEventUpdated,
  fileEvents,
  onArquivosActivity,
  hasWhatsapp,
}: {
  lead: Lead;
  stages: { id: string; name: string; papel?: string | null }[];
  funnelName?: string | null;
  email: string;
  temTelefone: boolean;
  showMeuLeadBadge?: boolean;
  equipe?: string | null;
  onBack: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  perdaAction?: FichaAction;
  moreActions: FichaAction[];
  primaryAction?: ReactNode;
  triagemTexto: string;
  onTriagemTexto: (value: string) => void;
  onRegistrarTriagem: () => void;
  triagemSaving: boolean;
  podeTriagem: boolean;
  events: TriagemEvent[];
  eventsLoading: boolean;
  stageLabel: (slug: string | null) => string;
  onEventUpdated: (event: TriagemEvent) => void;
  fileEvents: ArquivoHistoricoItem[];
  onArquivosActivity: () => void;
  hasWhatsapp: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Dados");
  const [filter, setFilter] = useState<HistoryKind>("todos");
  const mon = lead.monitoramento;
  const principal = mon?.problemas[0];
  const atrasado = mon?.visual === "vermelho";
  const prazoProximo = mon?.visual === "laranja";
  const funnel = stages;
  const currentIndex = funnel.findIndex((s) => s.id === lead.stage);
  const basic = basicStages(funnel, currentIndex);
  const days = daysSince(mon?.stageEnteredAt);
  const created = formatDateTimePt(lead.createdAt);

  const rows = useMemo(() => {
    const triagem = events.map((event) => ({
      id: `t-${event.id}`,
      kind: "relato" as const,
      title: event.origem === "manual" ? "Relato da triagem" : "Movimentação da triagem",
      detail: event.texto,
      who: event.autor?.name ?? "—",
      when: formatTriagemWhen(event.createdAt),
      at: event.createdAt,
      icon: event.origem === "manual" ? ClipboardList : Phone,
      tone: event.origem === "manual" ? "bg-slate-400" : "bg-emerald-500",
    }));
    const files = fileEvents.map((event) => {
      const meta = fileMeta(event.tipo);
      return {
        id: `a-${event.id}`,
        kind: fileKind(event.tipo),
        title: meta.title,
        detail: fileDetail(event),
        who: event.autor?.name ?? "—",
        when: formatTriagemWhen(event.createdAt),
        at: event.createdAt,
        icon: meta.icon,
        tone: meta.tone,
      };
    });
    return [...triagem, ...files].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [events, fileEvents]);

  const visible = rows.filter((item) => filter === "todos" || item.kind === filter);
  const local = [lead.bairro, lead.cidade].filter(Boolean).join(", ");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background [scrollbar-width:thin]">
      <div className="flex items-center justify-between px-6 py-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        {created ? <span className="text-xs text-muted-foreground">Criado em: {created}</span> : null}
      </div>

      <div className="mx-6 rounded-2xl border border-border bg-card px-5 py-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#079ED4] text-lg font-semibold text-white">
              {initials(lead.nome) || "?"}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{lead.nome}</h1>
                {showMeuLeadBadge ? <MeuLeadBadge /> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {lead.tipo === "cliente" ? "Cliente" : "Lead"}
                </span>
                {lead.origem ? <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">{lead.origem}</span> : null}
                <span className={cn(
                  "rounded-full px-2 py-1 font-medium",
                  lead.prioridade === "Alta" && "bg-rose-50 text-rose-700",
                  lead.prioridade === "Média" && "bg-amber-50 text-amber-800",
                  lead.prioridade === "Baixa" && "bg-sky-50 text-sky-700",
                )}>
                  Prioridade {lead.prioridade}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {lead.origem ? <span>Origem: {lead.origem}</span> : null}
                {lead.atrasoLiberadoAt ? <span>Liberado em: {formatDateTimePt(lead.atrasoLiberadoAt)}</span> : null}
                {equipe || lead.equipe ? (
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Equipe: {equipe || lead.equipe}</span>
                ) : null}
                {lead.corretor ? (
                  <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> Corretor: {lead.corretor}</span>
                ) : null}
              </div>
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
              <Button type="button" variant="destructive" disabled={perdaAction.disabled} onClick={perdaAction.onClick}>
                <Trash2 /> {perdaAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-6 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-border bg-card px-5 py-4 text-card-foreground shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">{funnelName || "Funil de vendas"}</h2>
          <div className="mt-4 flex items-center">
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
                    {state === "current" && days != null ? <span className="mt-1 text-[10px] font-medium text-[#05749E]">{days} dias</span> : <span className="mt-1 h-4" />}
                    <span className={cn("max-w-[6.5rem] truncate text-xs", state === "current" ? "font-semibold text-[#05749E]" : "text-muted-foreground")}>{stage.name}</span>
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
        <Fact icon={Phone} label="Telefone" value={lead.telefone ? formatPhone(lead.telefone) : "—"} />
        <Fact icon={Mail} label="E-mail" value={email || "—"} />
        <Fact icon={Wallet} label="Renda" value={lead.renda != null ? brl(lead.renda) : "—"} />
        <Fact icon={FileText} label="Interesse" value={local || lead.interesse} />
        <Fact icon={Users} label="Origem" value={lead.origem || "—"} />
        <Fact icon={Clock} label="Cadastro" value={created || "—"} />
      </div>

      <div className="mx-6 mt-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
              tab === item ? "bg-[#079ED4] font-medium text-white" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {item}
            {item === "WhatsApp" && hasWhatsapp ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
          </button>
        ))}
      </div>

      <div className="mx-6 mb-8 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
          {tab === "Atividade" || tab === "Triagem" ? (
            <>
              <h2 className="text-sm font-semibold">{tab === "Triagem" ? "Triagem" : "Atividade"}</h2>
              {podeTriagem ? (
                <div className="mt-3 rounded-xl border border-border p-3">
                  <textarea
                    value={triagemTexto}
                    maxLength={MAX_TRIAGEM_TEXTO}
                    onChange={(event) => onTriagemTexto(event.target.value)}
                    placeholder="Registre uma atividade, ligação, retorno ou observação sobre o lead..."
                    className="h-16 w-full resize-none bg-transparent text-sm outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{triagemTexto.length}/{MAX_TRIAGEM_TEXTO}</span>
                    <Button type="button" size="sm" disabled={triagemSaving} onClick={onRegistrarTriagem}>
                      <Send /> {triagemSaving ? "Salvando..." : "Registrar atividade"}
                    </Button>
                  </div>
                </div>
              ) : null}
              {principal ? (
                <div className={cn("mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", atrasado ? "border-rose-200 bg-rose-50 text-rose-950" : "border-amber-200 bg-amber-50 text-amber-950")}>
                  <Clock className="h-4 w-4" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Atenção!</p>
                    <p className="text-xs">{principal.detalhe || principal.titulo}</p>
                  </div>
                  <p className="text-xs font-semibold">{mon?.tempoAtrasoLabel || mon?.tempoRestanteLabel}</p>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "Atividade" ? (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Histórico de atividades</h3>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", filter === item.id ? "bg-[#079ED4] text-white" : "bg-muted text-muted-foreground")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {eventsLoading && visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Carregando histórico...</p>
              ) : visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade neste filtro.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {visible.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white", item.tone)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs font-medium text-foreground">{item.who}</p>
                        <p className="text-[11px] text-muted-foreground">{item.when}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}

          {tab === "Triagem" ? (
            <div className="mt-4">
              <HistoryTimeline
                events={events}
                contactName={lead.nome}
                stageLabel={stageLabel}
                fallbackStage={lead.stage}
                loading={eventsLoading}
                leadId={lead.id}
                onEventUpdated={onEventUpdated}
              />
            </div>
          ) : null}

          {tab === "WhatsApp" ? (
            hasWhatsapp ? (
              <LeadWhatsappChat leadId={lead.id} active className="min-h-[420px]" />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <p>O chat do WhatsApp não está conectado nesta conta.</p>
                <Button type="button" disabled={!temTelefone} onClick={onWhatsApp} className="mt-4 bg-[#25D366] hover:bg-[#1ebe5d]">
                  <FaWhatsapp /> Abrir conversa
                </Button>
              </div>
            )
          ) : null}

          {tab === "Dados" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Data label="Nome" value={lead.nome} />
              <Data label="Telefone" value={lead.telefone ? formatPhone(lead.telefone) : "—"} />
              <Data label="E-mail" value={email || "—"} />
              <Data label="Origem" value={lead.origem || "—"} />
              <Data label="Prioridade" value={lead.prioridade} />
              <Data label="Cidade" value={lead.cidade || "—"} />
              <Data label="Bairro" value={lead.bairro || "—"} />
              <Data label="Renda" value={lead.renda != null ? brl(lead.renda) : "—"} />
              <Data label="Tipo de renda" value={lead.tipoRenda || "—"} />
              <Data label="Estado civil" value={lead.estadoCivil || "—"} />
              <Data label="Orçamento" value={lead.orcamentoMax != null ? brl(lead.orcamentoMax) : "—"} />
              <Data label="CPF" value={lead.cpf || "—"} />
              <Data label="Corretor" value={lead.corretor || "—"} />
              <Data label="Equipe" value={equipe || lead.equipe || "—"} />
              {lead.empreendimento?.nome ? <Data label="Empreendimento" value={lead.empreendimento.nome} /> : null}
              {lead.construtora?.nome ? <Data label="Construtora" value={lead.construtora.nome} /> : null}
            </div>
          ) : null}

          {tab === "Documentações" ? (
            <DocumentacoesLeadPanel leadId={lead.id} onActivity={onArquivosActivity} />
          ) : null}
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <h2 className="text-sm font-semibold">Ações rápidas</h2>
            {moreActions.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Nenhuma ação disponível.</p>
            ) : (
              <ul className="mt-2">
                {moreActions.map((action) => {
                  const Icon = action.icon ?? MoreHorizontal;
                  return (
                    <li key={action.label}>
                      <button type="button" disabled={action.disabled} onClick={action.onClick} className="flex w-full items-center gap-2 border-b border-border py-2.5 text-left text-sm text-foreground last:border-0 hover:text-[#05749E] disabled:opacity-40">
                        <Icon className="h-4 w-4 text-[#079ED4]" />
                        <span className="flex-1">{action.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <h2 className="text-sm font-semibold">Status do monitoramento</h2>
            <p className={cn("mt-3 inline-flex items-center gap-2 text-sm font-medium", atrasado ? "text-rose-700" : prazoProximo ? "text-amber-700" : "text-emerald-700")}>
              <span className={cn("h-2 w-2 rounded-full", atrasado ? "bg-rose-500" : prazoProximo ? "bg-amber-500" : "bg-emerald-500")} />
              {atrasado ? "Atrasado" : prazoProximo ? "Prazo próximo" : "Ativo"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {principal?.detalhe || "O lead está sendo acompanhado nesta etapa."}
            </p>
          </section>
          {primaryAction ? (
            <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
              <h2 className="text-sm font-semibold">Ação principal</h2>
              <div className="mt-3">{primaryAction}</div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2.5 text-card-foreground shadow-sm">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5 text-[#079ED4]" /> {label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
