import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AlarmClockOff,
  BarChart3,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Flag,
  Globe,
  Hourglass,
  Mail,
  Pencil,
  Phone,
  StickyNote,
  Timer,
  TriangleAlert,
  User,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { MeuLeadBadge } from "@/components/meu-lead-badge";
import { LeadOrigemLiberacaoBadge } from "@/components/lead-origem-liberacao-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HistoryTimeline,
  formatTriagemWhen,
  useTriagemHistory,
} from "@/components/triagem-history-timeline";
import {
  ANALISE_STATUS_LABEL,
  analiseBadgeClass,
  shouldShowAnaliseStatus,
} from "@/lib/analise-status";
import { ApiError } from "@/lib/api";
import { docStatus1BadgeClass } from "@/lib/documentacao-status";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { useCatalog } from "@/lib/catalog-store";
import { brl, type Lead } from "@/lib/crm-types";
import { displayEmail } from "@/lib/email";
import { getWhatsAppUrl } from "@/lib/env";
import {
  compactProspeccao,
  hasProspeccao,
  type LeadProspeccao,
} from "@/lib/lead-prospeccao";
import {
  formatDateTimePt,
  formatPrazoUnidade,
  MOTIVO_SEM_MOVIMENTACAO_LABEL,
  type ProblemaMonitoramento,
} from "@/lib/lead-monitoramento";
import { mapApiLead, updateLeadApi, type UpdateLeadInput } from "@/lib/leads-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { formatPhone, isValidPhone, phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

const PRIORIDADE_AVATAR: Record<Lead["prioridade"], string> = {
  Alta: "from-rose-400 to-rose-600 text-white",
  Média: "from-amber-300 to-amber-500 text-amber-950",
  Baixa: "from-sky-400 to-sky-600 text-white",
};

const PROBLEMA_ICON: Record<ProblemaMonitoramento["tipo"], LucideIcon> = {
  prazo_ultrapassado: AlarmClockOff,
  tarefa_atrasada: ClipboardCheck,
  sem_movimentacao: Timer,
  prazo_proximo: Hourglass,
};

const TIPO_RENDA_OPTIONS = [
  "CLT",
  "Autônomo",
  "Empresário",
  "Funcionário público",
  "Aposentado",
  "Renda mista",
  "Outros",
];

const ESTADO_CIVIL_OPTIONS = [
  "Solteiro",
  "Casado",
  "Divorciado",
  "Viúvo",
  "União estável",
];

const PRIORIDADE_OPTIONS: Lead["prioridade"][] = ["Alta", "Média", "Baixa"];

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type FieldKind = "text" | "phone" | "money" | "select";

function EditableValue({
  value,
  display,
  kind = "text",
  options,
  placeholder = "—",
  disabled,
  className,
  onSave,
}: {
  value: string;
  display?: ReactNode;
  kind?: FieldKind;
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit(next = draft) {
    const trimmed = next.trim();
    if (trimmed === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    }
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  if (disabled) {
    return (
      <span className={cn("text-sm", !value && "text-muted-foreground", className)}>
        {(display ?? value) || "—"}
      </span>
    );
  }

  if (editing) {
    if (kind === "select" && options) {
      return (
        <select
          ref={inputRef as RefObject<HTMLSelectElement>}
          className="h-8 w-full rounded-md border bg-background px-2 text-sm"
          value={draft}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            void commit(next);
          }}
          onBlur={() => {
            if (!saving) setEditing(false);
          }}
          onKeyDown={onKey}
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <Input
        ref={inputRef as RefObject<HTMLInputElement>}
        className="h-8 rounded-md px-2"
        value={draft}
        disabled={saving}
        onChange={(e) =>
          setDraft(
            kind === "phone"
              ? formatPhone(e.target.value)
              : kind === "money"
                ? maskMoneyInput(e.target.value)
                : e.target.value,
          )
        }
        onBlur={() => void commit()}
        onKeyDown={onKey}
      />
    );
  }

  const empty = !value;
  return (
    <button
      type="button"
      className={cn(
        "group/field -mx-1 flex w-full min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/70",
        empty && "text-muted-foreground",
      )}
      onClick={() => setEditing(true)}
    >
      <span className={cn("min-w-0 flex-1 truncate text-sm", !empty && "font-medium", className)}>
        {empty ? placeholder : (display ?? value)}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover/field:opacity-100" />
    </button>
  );
}

function MonitoramentoCard({
  lead,
  inatividadeFallback,
  onAddAtividade,
  children,
}: {
  lead: Lead;
  inatividadeFallback?: string;
  onAddAtividade?: () => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const mon = lead.monitoramento;
  if (!mon || mon.problemas.length === 0) return null;

  const isRed = mon.visual === "vermelho";
  const tempo = isRed
    ? (mon.tempoAtrasoLabel ?? mon.tempoSemMovimentacaoLabel)
    : (mon.tempoRestanteLabel ?? mon.permanenciaLabel);
  const principal = mon.problemas[0];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isRed ? "border-rose-200 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/10" : "border-amber-200 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/10",
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <TriangleAlert
          className={cn(
            "h-4 w-4 shrink-0",
            isRed ? "text-rose-600" : "text-amber-600",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isRed ? "Precisa de atenção" : "Prazo próximo"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {principal?.titulo}
            {tempo ? ` · ${tempo}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-black/5 px-3.5 py-3 dark:border-white/10">
          {mon.problemas.map((problema) => {
            const Icon = PROBLEMA_ICON[problema.tipo];
            return (
              <div key={problema.tipo} className="flex gap-2 text-xs">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{problema.titulo}</p>
                  <p className="text-muted-foreground">{problema.detalhe}</p>
                  {problema.motivos?.length ? (
                    <p className="mt-1 text-muted-foreground">
                      {problema.motivos
                        .map((motivo) => MOTIVO_SEM_MOVIMENTACAO_LABEL[motivo])
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          {mon.tarefasAtrasadas?.map((tarefa) => (
            <p key={tarefa.id} className="text-xs text-muted-foreground">
              Tarefa atrasada: {tarefa.titulo} · prazo {tarefa.prazo}
            </p>
          ))}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-xs">
            <div>
              <dt className="text-muted-foreground">Entrada na etapa</dt>
              <dd className="tabular-nums">{formatDateTimePt(mon.stageEnteredAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Última movimentação</dt>
              <dd className="tabular-nums">{formatDateTimePt(mon.lastMovementAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Prazo da etapa</dt>
              <dd>
                {mon.prazoConfigurado
                  ? formatPrazoUnidade(
                      mon.prazoConfigurado.valor,
                      mon.prazoConfigurado.unidade,
                    )
                  : "Sem prazo"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Alerta de inatividade</dt>
              <dd>
                {mon.inatividadeConfig
                  ? formatPrazoUnidade(
                      mon.inatividadeConfig.valor,
                      mon.inatividadeConfig.unidade,
                    )
                  : (inatividadeFallback ?? "—")}
              </dd>
            </div>
          </dl>
          {children}
          {onAddAtividade && isRed ? (
            <Button type="button" size="sm" variant="outline" onClick={onAddAtividade}>
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
              Adicionar atividade
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DataField({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </p>
      <div className="mt-0.5 pl-[22px] text-sm">{children}</div>
    </div>
  );
}

function ActionRow({ action }: { action: LeadDetalheAction }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={action.onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-background/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 disabled:opacity-50",
        action.destructive && "text-destructive",
      )}
    >
      {Icon ? (
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : null}
      <span className="min-w-0 flex-1 font-medium">{action.label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function FunilTrack({
  stages,
  currentId,
  onVerTriagem,
}: {
  stages: { id: string; name: string; papel?: string | null }[];
  currentId: string;
  onVerTriagem?: () => void;
}) {
  const list = stages.filter(
    (s) => s.papel !== "perdido" && s.papel !== "venda",
  );
  const track = list.length ? list : stages;
  const idx = Math.max(
    0,
    track.findIndex((s) => s.id === currentId),
  );

  return (
    <div className="rounded-xl border bg-background/30 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="h-4 w-4 text-primary" />
        Lead em andamento
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {track.map((s, i) => {
          const done = i < idx;
          const current = s.id === currentId;
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {s.name}
              </span>
              {i < track.length - 1 ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : null}
            </div>
          );
        })}
        {onVerTriagem ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline"
              onClick={onVerTriagem}
            >
              Ver triagem
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Ficha no layout de CRM: dados à esquerda, ações à direita.
 */
export type LeadDetalheAction = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
};

export function LeadDetalheDialog({
  lead,
  open,
  onOpenChange,
  onUpdated,
  showCorretor = true,
  showMeuLeadBadge = false,
  equipe,
  inatividadeFallback,
  monitoramentoSlot,
  footer,
  moreActions,
  stageControl,
  primaryAction,
  onAddAtividade,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (lead: Lead) => void;
  showCorretor?: boolean;
  showMeuLeadBadge?: boolean;
  equipe?: string | null;
  inatividadeFallback?: string;
  monitoramentoSlot?: ReactNode;
  footer?: ReactNode;
  moreActions?: LeadDetalheAction[];
  stageControl?: ReactNode;
  primaryAction?: ReactNode;
  onAddAtividade?: () => void;
}) {
  const { funnelStages, origens, colorByLabel } = useCatalog();
  const [tab, setTab] = useState("info");
  const hist = useTriagemHistory(open && lead ? lead.id : null);

  useEffect(() => {
    setTab("info");
  }, [lead?.id]);
  const stage = funnelStages.find((item) => item.id === lead?.stage);
  const telefoneDigits = lead ? phoneDigits(lead.telefone) : "";
  const temTelefone = telefoneDigits.length >= 10;
  const email = lead ? displayEmail(lead.email) : "";
  const isProspeccao = Boolean(lead && hasProspeccao(lead.prospeccao));

  async function patch(input: UpdateLeadInput) {
    if (!lead) return;
    const updated = mapApiLead(await updateLeadApi(lead.id, input));
    onUpdated?.(updated);
  }

  async function saveText(
    key: keyof UpdateLeadInput,
    raw: string,
    opts?: { required?: boolean; phone?: boolean; money?: boolean },
  ) {
    if (!lead) return;
    if (opts?.phone) {
      if (!raw) throw new Error("Informe o telefone.");
      if (!isValidPhone(raw)) throw new Error("Telefone inválido.");
      await patch({ telefone: formatPhone(raw) });
      return;
    }
    if (opts?.money) {
      const parsed = parseOptionalMoneyInput(raw);
      await patch({ [key]: parsed != null ? Math.round(parsed) : null });
      return;
    }
    if (key === "email") {
      const next = raw || `contato.${phoneDigits(lead.telefone)}@sem-email.local`;
      await patch({ email: next });
      return;
    }
    if (key === "nome") {
      if (!raw) throw new Error("Informe o nome.");
      await patch({ nome: raw });
      return;
    }
    if (opts?.required && !raw) throw new Error("Campo obrigatório.");
    await patch({ [key]: raw || null });
  }

  async function saveProspeccao(key: keyof LeadProspeccao, raw: string) {
    if (!lead) return;
    const next = compactProspeccao({
      ...(lead.prospeccao ?? {}),
      [key]: key === "fit" ? (raw ? Number(raw) : null) : raw,
    });
    await patch({ prospeccao: next ?? null });
  }

  function abrirWhatsApp() {
    if (!temTelefone) return;
    const e164 = telefoneDigits.startsWith("55")
      ? telefoneDigits
      : `55${telefoneDigits}`;
    window.open(getWhatsAppUrl(undefined, e164), "_blank", "noopener,noreferrer");
  }

  const origemOptions = origens.map((o) => ({ value: o, label: o }));
  if (lead?.origem && !origens.includes(lead.origem)) {
    origemOptions.unshift({ value: lead.origem, label: lead.origem });
  }

  const verTriagem = moreActions?.find((a) => a.label === "Ver triagem");
  const sidebarActions = moreActions?.filter((a) => !a.destructive) ?? [];
  const perdaAction = moreActions?.find((a) => a.destructive);
  const mon = lead?.monitoramento;
  const atrasado = mon?.visual === "vermelho";
  const statusLabel = atrasado
    ? "Atrasado"
    : mon?.visual === "laranja"
      ? "Prazo próximo"
      : "Em dia";

  function ligar() {
    if (!temTelefone) return;
    window.location.href = `tel:+55${telefoneDigits}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.25rem)] gap-0 overflow-hidden rounded-2xl border bg-card p-0 sm:max-w-5xl",
          "!flex !flex-col",
          "!top-[max(0.5rem,1.5dvh)] !translate-y-0",
          "max-h-[calc(100dvh-1rem)]",
        )}
      >
        {lead ? (
          <>
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold",
                    PRIORIDADE_AVATAR[lead.prioridade],
                  )}
                >
                  {initials(lead.nome)}
                </span>
                <div className="min-w-0">
                  <DialogTitle className="sr-only">{lead.nome}</DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalhes de {lead.nome}
                  </DialogDescription>
                  <EditableValue
                    value={lead.nome}
                    className="text-lg font-semibold tracking-tight"
                    onSave={(next) => saveText("nome", next, { required: true })}
                  />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lead.tipo === "cliente" ? "Cliente" : "Lead"}
                    {stage ? ` · ${stage.name}` : ""}
                    {showCorretor && lead.corretor && lead.corretor !== "—"
                      ? ` · ${lead.corretor}`
                      : ""}
                    {(equipe ?? lead.equipe)
                      ? ` · ${equipe ?? lead.equipe}`
                      : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {showMeuLeadBadge ? <MeuLeadBadge /> : null}
                    <LeadOrigemLiberacaoBadge lead={lead} />
                    {lead.documentacaoStatus1?.trim() ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          docStatus1BadgeClass(lead.documentacaoStatus1),
                          "h-5 rounded-full px-2 text-[10px]",
                        )}
                      >
                        {lead.documentacaoStatus1.trim()}
                      </Badge>
                    ) : null}
                    {lead.analise &&
                    shouldShowAnaliseStatus(lead.analise.status) ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          analiseBadgeClass(lead.analise.status),
                          "h-5 rounded-full px-2 text-[10px]",
                        )}
                      >
                        {ANALISE_STATUS_LABEL[lead.analise.status]}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              {mon && mon.problemas.length > 0 ? (
                <div
                  className={cn(
                    "flex max-w-sm items-start gap-2 rounded-xl px-3 py-2 text-xs",
                    atrasado
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
                      : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                  )}
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{statusLabel}</p>
                    <p className="text-[11px] opacity-90">
                      {mon.problemas[0]?.titulo}
                      {mon.tempoAtrasoLabel
                        ? ` · ${mon.tempoAtrasoLabel}`
                        : mon.tempoSemMovimentacaoLabel
                          ? ` · ${mon.tempoSemMovimentacaoLabel}`
                          : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </header>

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_17.5rem]">
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:thin]">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="mb-4 h-10 w-full justify-start gap-1 rounded-full bg-muted/60 p-1 sm:w-auto">
                    <TabsTrigger value="info" className="rounded-full px-3">
                      <UserRound className="mr-1.5 h-3.5 w-3.5" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="hist" className="rounded-full px-3">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      Histórico
                    </TabsTrigger>
                    <TabsTrigger value="obs" className="rounded-full px-3">
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      Observações
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-0 space-y-3">
                    <section className="rounded-xl border bg-background/30 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4 text-primary" />
                        Dados do lead
                      </h3>
                      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        <DataField icon={Phone} label="Telefone">
                          <div className="flex items-center gap-1">
                            <div className="min-w-0 flex-1">
                              <EditableValue
                                kind="phone"
                                value={lead.telefone}
                                onSave={(next) =>
                                  saveText("telefone", next, { phone: true })
                                }
                              />
                            </div>
                            {temTelefone ? (
                              <button
                                type="button"
                                className="shrink-0 p-0.5 text-[#25D366]"
                                aria-label="WhatsApp"
                                onClick={abrirWhatsApp}
                              >
                                <FaWhatsapp className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </DataField>
                        <DataField icon={Wallet} label="Renda mensal">
                          <EditableValue
                            kind="money"
                            value={
                              lead.renda != null
                                ? formatMoneyInput(lead.renda)
                                : ""
                            }
                            display={
                              lead.renda != null ? brl(lead.renda) : undefined
                            }
                            onSave={(next) =>
                              saveText("renda", next, { money: true })
                            }
                          />
                        </DataField>
                        <DataField icon={Mail} label="E-mail">
                          <EditableValue
                            value={email}
                            onSave={(next) => saveText("email", next)}
                          />
                        </DataField>
                        <DataField icon={Briefcase} label="Tipo de renda">
                          <EditableValue
                            kind="select"
                            value={lead.tipoRenda ?? ""}
                            options={TIPO_RENDA_OPTIONS.map((o) => ({
                              value: o,
                              label: o,
                            }))}
                            onSave={(next) => saveText("tipoRenda", next)}
                          />
                        </DataField>
                        <DataField icon={Globe} label="Origem">
                          <EditableValue
                            kind="select"
                            value={
                              lead.origem === "Não informado" ? "" : lead.origem
                            }
                            display={
                              lead.origem && lead.origem !== "Não informado" ? (
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2 py-0.5 text-xs",
                                    catalogColorBadgeClass(
                                      colorByLabel("origem", lead.origem),
                                    ),
                                  )}
                                  style={catalogColorBadgeStyle(
                                    colorByLabel("origem", lead.origem),
                                  )}
                                >
                                  {lead.origem}
                                </span>
                              ) : undefined
                            }
                            options={origemOptions}
                            onSave={(next) =>
                              saveText("origem", next || "Não informado")
                            }
                          />
                        </DataField>
                        <DataField icon={User} label="Estado civil">
                          <EditableValue
                            kind="select"
                            value={lead.estadoCivil ?? ""}
                            options={ESTADO_CIVIL_OPTIONS.map((o) => ({
                              value: o,
                              label: o,
                            }))}
                            onSave={(next) => saveText("estadoCivil", next)}
                          />
                        </DataField>
                        <DataField icon={Flag} label="Prioridade">
                          <EditableValue
                            kind="select"
                            value={lead.prioridade}
                            className={
                              lead.prioridade === "Alta"
                                ? "text-destructive"
                                : undefined
                            }
                            options={PRIORIDADE_OPTIONS.map((p) => ({
                              value: p,
                              label: p,
                            }))}
                            onSave={(next) => saveText("prioridade", next)}
                          />
                        </DataField>
                        <DataField icon={UserRound} label="Perfil">
                          <EditableValue
                            value={lead.interesse}
                            onSave={(next) => saveText("interesse", next)}
                          />
                        </DataField>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-3">
                        <DataField icon={StickyNote} label="CPF">
                          <EditableValue
                            value={lead.cpf ?? ""}
                            onSave={(next) => saveText("cpf", next)}
                          />
                        </DataField>
                        <DataField icon={StickyNote} label="RG">
                          <EditableValue
                            value={lead.rg ?? ""}
                            onSave={(next) => saveText("rg", next)}
                          />
                        </DataField>
                        <DataField icon={StickyNote} label="CEP">
                          <EditableValue
                            value={lead.cep ?? ""}
                            onSave={(next) => saveText("cep", next)}
                          />
                        </DataField>
                      </div>
                      <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        <DataField icon={Globe} label="Cidade">
                          <EditableValue
                            value={lead.cidade}
                            onSave={(next) => saveText("cidade", next)}
                          />
                        </DataField>
                        <DataField icon={Globe} label="Bairro">
                          <EditableValue
                            value={lead.bairro}
                            onSave={(next) => saveText("bairro", next)}
                          />
                        </DataField>
                        <DataField icon={StickyNote} label="Endereço">
                          <EditableValue
                            value={lead.endereco ?? ""}
                            onSave={(next) => saveText("endereco", next)}
                          />
                        </DataField>
                      </div>
                      {lead.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {lead.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className={cn(
                                catalogColorBadgeClass(colorByLabel("tag", tag)),
                                "h-6 rounded-full px-2.5 text-[11px]",
                              )}
                              style={catalogColorBadgeStyle(
                                colorByLabel("tag", tag),
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </section>

                    {isProspeccao ? (
                      <section className="rounded-xl border bg-background/30 p-4">
                        <h3 className="mb-3 text-sm font-medium">Prospecção</h3>
                        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                          {(
                            [
                              ["quemAbordar", "Quem abordar"],
                              ["endereco", "Endereço"],
                              ["site", "Site"],
                              ["instagram", "Instagram"],
                              ["linkedin", "LinkedIn"],
                            ] as const
                          ).map(([key, label]) => (
                            <DataField key={key} icon={Globe} label={label}>
                              <EditableValue
                                value={String(lead.prospeccao?.[key] ?? "")}
                                onSave={(next) => saveProspeccao(key, next)}
                              />
                            </DataField>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <FunilTrack
                      stages={funnelStages}
                      currentId={lead.stage}
                      onVerTriagem={verTriagem?.onClick}
                    />

                    <MonitoramentoCard
                      lead={lead}
                      inatividadeFallback={inatividadeFallback}
                      onAddAtividade={onAddAtividade}
                    >
                      {monitoramentoSlot}
                    </MonitoramentoCard>
                  </TabsContent>

                  <TabsContent value="hist" className="mt-0">
                    <HistoryTimeline
                      events={hist.events}
                      contactName={lead.nome}
                      stageLabel={(slug) =>
                        funnelStages.find((s) => s.id === slug)?.name ??
                        slug ??
                        ""
                      }
                      fallbackStage={lead.stage}
                      loading={hist.loading}
                      leadId={lead.id}
                      onEventUpdated={(ev) =>
                        hist.setEvents((cur) =>
                          cur.map((item) => (item.id === ev.id ? ev : item)),
                        )
                      }
                    />
                  </TabsContent>

                  <TabsContent value="obs" className="mt-0 space-y-3">
                    {lead.analise?.parecer &&
                    shouldShowAnaliseStatus(lead.analise.status) ? (
                      <div className="rounded-xl border p-3 text-sm whitespace-pre-wrap">
                        {lead.analise.parecer}
                      </div>
                    ) : null}
                    {hist.events.length === 0 && !hist.loading ? (
                      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Nenhuma observação registrada. Use Registrar histórico
                        para incluir um relato.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {hist.events.map((ev) => (
                          <li
                            key={ev.id}
                            className="rounded-xl border bg-background/40 p-3 text-sm"
                          >
                            <p className="text-[11px] text-muted-foreground">
                              {ev.autor.name} · {formatTriagemWhen(ev.createdAt)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{ev.texto}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t p-4 lg:border-t-0 lg:border-l">
                <div className="space-y-2">
                  {sidebarActions.map((action) => (
                    <ActionRow key={action.label} action={action} />
                  ))}
                </div>
                {stageControl ? (
                  <div className="rounded-xl border bg-background/40 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Etapa atual
                    </p>
                    {stageControl}
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                  <span className="text-sm">Status do lead</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      atrasado &&
                        "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-200",
                    )}
                  >
                    {atrasado ? (
                      <TriangleAlert className="mr-1 h-3 w-3" />
                    ) : null}
                    {statusLabel}
                  </Badge>
                </div>
                <div className="rounded-xl border bg-background/40 p-3 text-sm">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Resumo rápido
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Origem</dt>
                      <dd>{lead.origem || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Prioridade</dt>
                      <dd
                        className={
                          lead.prioridade === "Alta" ? "text-destructive" : ""
                        }
                      >
                        {lead.prioridade}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Renda mensal</dt>
                      <dd>
                        {lead.renda != null ? brl(lead.renda) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Criado em</dt>
                      <dd>
                        {lead.createdAt
                          ? formatDateTimePt(lead.createdAt)
                          : lead.updatedAt}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    className="h-10 bg-[#22c55e] text-white hover:bg-[#16a34a]"
                    disabled={!temTelefone}
                    onClick={abrirWhatsApp}
                  >
                    <FaWhatsapp className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={!temTelefone}
                    onClick={ligar}
                  >
                    <Phone className="mr-1.5 h-4 w-4" />
                    Ligar
                  </Button>
                </div>
                {primaryAction}
                {perdaAction ? (
                  <button
                    type="button"
                    className="text-center text-xs text-destructive hover:underline"
                    onClick={perdaAction.onClick}
                  >
                    {perdaAction.label}
                  </button>
                ) : null}
                {footer}
              </aside>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
