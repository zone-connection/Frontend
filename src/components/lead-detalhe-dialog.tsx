import {
  useCallback,
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
import { DocStatusFunilTags } from "@/components/doc-status1-funil-tag";
import { LeadOrigemLiberacaoBadge } from "@/components/lead-origem-liberacao-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  MAX_TRIAGEM_TEXTO,
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
import { canWriteTriagem } from "@/lib/permissions";
import { createTriagemEvent } from "@/lib/triagem-api";
import { prependTriagemHistoryCached } from "@/lib/triagem-history-cache";
import { cn } from "@/lib/utils";
import { DocumentacoesLeadPanel } from "@/components/documentacoes-lead-panel";
import { LeadFichaView } from "@/components/lead-ficha-view";
import {
  fetchArquivoHistorico,
  type ArquivoHistoricoItem,
} from "@/lib/arquivos-api";

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

const FICHA_TAB =
  "!h-auto !rounded-none !border-b-2 !border-transparent !bg-transparent !bg-none !px-3 !pb-2 !pt-1 !text-muted-foreground !shadow-none data-[state=active]:!border-primary data-[state=active]:!bg-transparent data-[state=active]:!bg-none data-[state=active]:!text-primary data-[state=active]:!shadow-none";

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
      <span className={cn("min-w-0 flex-1 whitespace-normal break-words text-sm", !empty && "font-medium", className)}>
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
    <div className="min-w-0 rounded-xl bg-[#F8FAFC] px-3 py-2.5 dark:bg-white/5">
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
  const idx = Math.max(0, track.findIndex((s) => s.id === currentId));
  const days = daysSince(enteredAt);

  return (
    <ol className="flex gap-1 overflow-x-auto [scrollbar-width:thin]">
      {track.map((s, i) => {
        const current = s.id === currentId;
        const reached = i < idx;
        return (
          <li
            key={s.id}
            title={s.name}
            className={cn(
              "min-w-[7.5rem] flex-1 truncate rounded-lg px-3 py-2 text-center text-[11px] font-medium",
              current
                ? "bg-[#0F172A] text-white"
                : reached
                  ? "bg-[#E8EEF5] text-[#0F172A]"
                  : "bg-[#F8FAFC] text-[#94A3B8]",
            )}
          >
            {current && days != null ? `${days}d · ` : ""}
            {s.name}
          </li>
        );
      })}
    </ol>
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
    <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", !open && "-rotate-90")} />
        {title}
      </button>
      {open ? <div className="border-t px-4 py-4">{children}</div> : null}
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
  const [triagemTexto, setTriagemTexto] = useState("");
  const [triagemSaving, setTriagemSaving] = useState(false);
  const hist = useTriagemHistory(open && lead ? lead.id : null);
  const [arquivoHist, setArquivoHist] = useState<ArquivoHistoricoItem[]>([]);
  const [arquivoTick, setArquivoTick] = useState(0);
  const refreshArquivos = useCallback(() => setArquivoTick((n) => n + 1), []);
  useEffect(() => {
    if (!open || !lead) return;
    let cancel = false;
    void fetchArquivoHistorico({ entityType: "lead", entityId: lead.id })
      .then((rows) => {
        if (!cancel) setArquivoHist(rows);
      })
      .catch(() => {
        if (!cancel) setArquivoHist([]);
      });
    return () => {
      cancel = true;
    };
  }, [open, lead, arquivoTick]);
  const podeTriagem = canWriteTriagem(getSession()?.role);

  useEffect(() => {
    setTab("atividade");
    setTriagemTexto("");
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

  async function registrarTriagem() {
    if (!lead || !podeTriagem) return;
    const texto = triagemTexto.trim();
    if (!texto) {
      toast.error("Informe o relato da triagem.");
      return;
    }
    if (texto.length > MAX_TRIAGEM_TEXTO) {
      toast.error(`O relato deve ter no máximo ${MAX_TRIAGEM_TEXTO} caracteres.`);
      return;
    }
    setTriagemSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: lead.id,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(lead.id, created);
      hist.setEvents((cur) => {
        const ids = new Set(created.map((item) => item.id));
        return [...created, ...cur.filter((item) => !ids.has(item.id))];
      });
      setTriagemTexto("");
      toast.success("Relato registrado na triagem.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível registrar a triagem."));
    } finally {
      setTriagemSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="!top-14 !bottom-0 !left-0 !right-0 md:!left-[var(--app-sidebar,15rem)] bg-background"
        className={cn(
          "!left-0 !right-0 !top-14 !bottom-0 !h-auto !max-h-none !w-auto !max-w-none !translate-x-0 !translate-y-0",
          "md:!left-[var(--app-sidebar,15rem)]",
          "!flex !flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#EEF3F8] p-0 shadow-none dark:bg-[#0f141b]",
        )}
      >
        {lead ? (
          <>
            <DialogTitle className="sr-only">{lead.nome}</DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes de {lead.nome}
            </DialogDescription>
            <LeadFichaView onBack={() => onOpenChange(false)} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}