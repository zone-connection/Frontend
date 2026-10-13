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
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
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
import { DocStatusFunilTags } from "@/components/doc-status1-funil-tag";
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
import { EmpreendimentosInteressePanel } from "@/components/empreendimentos-interesse-panel";
import { LeadWhatsappChat } from "@/components/lead-whatsapp-chat";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { formatPhone, isValidPhone, phoneDigits } from "@/lib/phone";
import { getSession } from "@/lib/auth";
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
              Follow-up atrasado: {tarefa.titulo} · prazo {tarefa.prazo}
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

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function FunilTrack({
  stages,
  currentId,
  enteredAt,
}: {
  stages: { id: string; name: string; papel?: string | null }[];
  currentId: string;
  enteredAt?: string | null;
}) {
  const list = stages.filter(
    (s) => s.papel !== "perdido" && s.papel !== "venda",
  );
  const track = list.length ? list : stages;
  const idx = Math.max(
    0,
    track.findIndex((s) => s.id === currentId),
  );
  const days = daysSince(enteredAt);

  return (
    <div className="mt-3 flex overflow-x-auto pb-1 [scrollbar-width:thin]">
      {track.map((s, i) => {
        const reached = i <= idx;
        const current = s.id === currentId;
        return (
          <span
            key={s.id}
            title={s.name}
            className={cn(
              "relative shrink-0 py-1.5 pr-4 text-[11px] font-medium whitespace-nowrap",
              i > 0 && "-ml-1.5",
              reached
                ? "bg-[#1f9d55] text-white"
                : "bg-[#e6ebf0] text-[#5c6b76] dark:bg-[#1c2430] dark:text-[#94a3b8]",
            )}
            style={{
              zIndex: track.length - i,
              paddingLeft: i === 0 ? 12 : 18,
              clipPath:
                i === track.length - 1
                  ? i === 0
                    ? "none"
                    : "polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)"
                  : i === 0
                    ? "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)"
                    : "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)",
            }}
          >
            {current && days != null ? `${days} ${days === 1 ? "dia" : "dias"} · ` : ""}
            {s.name}
          </span>
        );
      })}
    </div>
  );
}

function SideSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", !open && "-rotate-90")} />
        {title}
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
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
  const hasOzapChat = getSession()?.tenant?.hasOzapConnection === true;
  const [tab, setTab] = useState("atividade");
  const hist = useTriagemHistory(open && lead ? lead.id : null);

  useEffect(() => {
    setTab("atividade");
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
          "w-[calc(100vw-1.25rem)] gap-0 overflow-hidden rounded-2xl border bg-card p-0 sm:max-w-6xl",
          "!flex !flex-col",
          "!top-[max(0.5rem,1.5dvh)] !translate-y-0",
          "max-h-[calc(100dvh-1rem)]",
        )}
      >
        {lead ? (
          <>
            <header className="shrink-0 border-b px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold",
                      PRIORIDADE_AVATAR[lead.prioridade],
                    )}
                  >
                    {initials(showCorretor && lead.corretor && lead.corretor !== "—" ? lead.corretor : lead.nome)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {showCorretor && lead.corretor && lead.corretor !== "—"
                        ? lead.corretor
                        : lead.nome}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {equipe ?? lead.equipe ?? (lead.tipo === "cliente" ? "Cliente" : "Lead")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {showMeuLeadBadge ? <MeuLeadBadge /> : null}
                  <LeadOrigemLiberacaoBadge lead={lead} />
                  {perdaAction ? (
                    <Button
                      type="button"
                      className="h-8 bg-[#e23b3b] px-3 text-white hover:bg-[#c92f2f]"
                      onClick={perdaAction.onClick}
                    >
                      Perdido
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={!temTelefone}
                    aria-label="WhatsApp"
                    onClick={() =>
                      hasOzapChat ? setTab("whatsapp") : abrirWhatsApp()
                    }
                  >
                    <FaWhatsapp className="h-4 w-4 text-[#25D366]" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={!temTelefone}
                    aria-label="Ligar"
                    onClick={ligar}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogTitle className="sr-only">{lead.nome}</DialogTitle>
              <DialogDescription className="sr-only">
                Detalhes de {lead.nome}
              </DialogDescription>
              <div className="mt-3">
                <EditableValue
                  value={lead.nome}
                  className="text-xl font-semibold tracking-tight"
                  onSave={(next) => saveText("nome", next, { required: true })}
                />
              </div>
              <FunilTrack
                stages={funnelStages}
                currentId={lead.stage}
                enteredAt={mon?.stageEnteredAt}
              />
              <p className="mt-2 text-xs text-primary">
                {lead.origem && lead.origem !== "Não informado" ? lead.origem : lead.tipo === "cliente" ? "Clientes" : "Leads"}
                {stage ? ` → ${stage.name}` : ""}
              </p>
              {mon && mon.problemas.length > 0 ? (
                <div
                  className={cn(
                    "mt-2 flex max-w-xl items-start gap-2 rounded-lg px-3 py-2 text-xs",
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

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[18.5rem_minmax(0,1fr)]">
              <aside className="order-2 flex min-h-0 flex-col overflow-y-auto border-t [scrollbar-width:thin] lg:order-1 lg:border-t-0 lg:border-r">
                <SideSection title="Resumo">
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Wallet className="h-4 w-4" /> Renda
                      </dt>
                      <dd className="font-medium">{lead.renda != null ? brl(lead.renda) : "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" /> Pessoa
                      </dt>
                      <dd className="truncate font-medium text-primary">{lead.nome}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" /> Telefone
                      </dt>
                      <dd className="truncate">{lead.telefone || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" /> E-mail
                      </dt>
                      <dd className="truncate">{email || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Flag className="h-4 w-4" /> Prioridade
                      </dt>
                      <dd className={lead.prioridade === "Alta" ? "text-destructive" : ""}>
                        {lead.prioridade}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" /> Criado em
                      </dt>
                      <dd>
                        {lead.createdAt
                          ? formatDateTimePt(lead.createdAt)
                          : lead.updatedAt}
                      </dd>
                    </div>
                  </dl>
                  {lead.analise && shouldShowAnaliseStatus(lead.analise.status) ? (
                    <Badge
                      variant="outline"
                      className={cn("mt-3", analiseBadgeClass(lead.analise.status))}
                    >
                      {ANALISE_STATUS_LABEL[lead.analise.status]}
                    </Badge>
                  ) : null}
                </SideSection>
                <SideSection title="Detalhes">
                    <section>
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
                      {lead.documentacaoStatus1 ||
                      lead.documentacaoStatus2 ||
                      lead.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <DocStatusFunilTags
                            status1={lead.documentacaoStatus1}
                            status2={lead.documentacaoStatus2}
                            className="justify-start"
                          />
                          {lead.tags
                            .filter((tag) => {
                              const key = tag.trim().toLowerCase();
                              return (
                                key !== lead.documentacaoStatus1?.trim().toLowerCase() &&
                                key !== lead.documentacaoStatus2?.trim().toLowerCase()
                              );
                            })
                            .map((tag) => (
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
                    {lead ? (
                      <EmpreendimentosInteressePanel
                        leadId={lead.id}
                        interesses={lead.interesses}
                        onLeadChange={onUpdated}
                      />
                    ) : null}

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

                    {stageControl ? (
                      <div className="mt-4 rounded-xl border bg-background/40 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Etapa atual
                        </p>
                        {stageControl}
                      </div>
                    ) : null}
                </SideSection>
                {sidebarActions.length > 0 ? (
                  <div className="space-y-2 p-4">
                    {sidebarActions.map((action) => (
                      <ActionRow key={action.label} action={action} />
                    ))}
                  </div>
                ) : null}
                <div className="mt-auto space-y-2 p-4">
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                    <span className="text-sm">Status</span>
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
                  {primaryAction}
                  {footer}
                </div>
              </aside>

              <div className="order-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] lg:order-2">
                <Tabs value={tab} onValueChange={setTab}>
                  <div className="sticky top-0 z-10 border-b bg-card">
                    <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-0 bg-transparent px-4 pt-2">
                      <TabsTrigger value="atividade" className="rounded-none border-b-2 border-transparent px-3 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                        Atividade
                      </TabsTrigger>
                      <TabsTrigger value="triagem" className="rounded-none border-b-2 border-transparent px-3 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <StickyNote className="mr-1.5 h-3.5 w-3.5" />
                        Triagem
                      </TabsTrigger>
                      {hasOzapChat ? (
                        <TabsTrigger value="whatsapp" className="rounded-none border-b-2 border-transparent px-3 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                          <FaWhatsapp className="mr-1.5 h-3.5 w-3.5" />
                          WhatsApp
                        </TabsTrigger>
                      ) : null}
                    </TabsList>
                  </div>

                  <TabsContent value="atividade" className="mt-0 space-y-4 px-4 py-4">
                    <button
                      type="button"
                      className="w-full rounded-lg border bg-muted/30 px-3 py-5 text-left text-sm text-muted-foreground hover:bg-muted/50 disabled:cursor-default"
                      disabled={!onAddAtividade}
                      onClick={onAddAtividade}
                    >
                      {onAddAtividade
                        ? "Clique aqui para adicionar uma atividade..."
                        : "As atividades deste registro aparecem no histórico."}
                    </button>
                    <MonitoramentoCard
                      lead={lead}
                      inatividadeFallback={inatividadeFallback}
                      onAddAtividade={onAddAtividade}
                    >
                      {monitoramentoSlot}
                    </MonitoramentoCard>
                  </TabsContent>

                  <TabsContent value="triagem" className="mt-0 space-y-3 px-4 py-4">
                    <div className="rounded-lg border border-[#f3e2a2] bg-[#fff8dc] p-3 text-sm text-[#3d3420] dark:border-[#f5c48a]/30 dark:bg-[#3a2a14] dark:text-[#f8fafc]">
                      {lead.analise?.parecer && shouldShowAnaliseStatus(lead.analise.status) ? (
                        <p className="mb-3 whitespace-pre-wrap">{lead.analise.parecer}</p>
                      ) : null}
                      {hist.events.length === 0 && !hist.loading ? (
                        <p>Nenhum relato de triagem ainda.</p>
                      ) : (
                        <ul className="space-y-3">
                          {hist.events.map((ev) => (
                            <li key={ev.id}>
                              <p className="text-[11px] opacity-70">
                                {ev.autor.name} · {formatTriagemWhen(ev.createdAt)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap">{ev.texto}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      {verTriagem ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 h-8 bg-white/80 dark:bg-[#1c2430]"
                          onClick={verTriagem.onClick}
                        >
                          Abrir triagem
                        </Button>
                      ) : null}
                    </div>
                  </TabsContent>

                  {hasOzapChat ? (
                    <TabsContent value="whatsapp" className="mt-0 px-4 py-4">
                      <LeadWhatsappChat
                        leadId={lead.id}
                        active={tab === "whatsapp"}
                      />
                    </TabsContent>
                  ) : null}
                </Tabs>

                <section className="border-t px-4 py-4">
                  <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold">
                    Histórico
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </h3>
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
                </section>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
