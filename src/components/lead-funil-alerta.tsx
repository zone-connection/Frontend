import {
  useEffect,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Clock,
  Hourglass,
  Loader2,
  LogIn,
  Timer,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import type { Lead } from "@/lib/crm-types";
import {
  adiarPrazoLead,
  fetchPrazoAdiamentos,
  mapApiLead,
} from "@/lib/leads-api";
import {
  formatDateTimePt,
  formatPrazoUnidade,
  MOTIVO_SEM_MOVIMENTACAO_LABEL,
  PRAZO_UNIDADE_OPTIONS,
  type LeadPrazoAdiamento,
  type PrazoUnidade,
  type ProblemaMonitoramento,
} from "@/lib/lead-monitoramento";
import { cn } from "@/lib/utils";

function problemaTone(tipo: ProblemaMonitoramento["tipo"]) {
  if (tipo === "prazo_ultrapassado" || tipo === "tarefa_atrasada") return "red";
  if (tipo === "prazo_proximo") return "orange";
  return "slate";
}

function ProblemaIcon({
  tipo,
  className,
}: {
  tipo: ProblemaMonitoramento["tipo"];
  className?: string;
}) {
  const cls = cn("h-3.5 w-3.5 shrink-0", className);
  if (tipo === "tarefa_atrasada") return <ClipboardList className={cls} />;
  if (tipo === "prazo_proximo") return <Hourglass className={cls} />;
  if (tipo === "sem_movimentacao") return <Timer className={cls} />;
  return <AlertTriangle className={cls} />;
}

function MetricRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-2.5 py-1.5",
        accent && "bg-red-500/10",
      )}
    >
      <dt className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted-foreground/80">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          "shrink-0 text-right text-[11px] font-medium tabular-nums",
          accent && "text-red-600 dark:text-red-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function stopCardEvents(e: PointerEvent | MouseEvent) {
  e.stopPropagation();
}

export function leadMonitoramentoCardClass(lead: Lead): string {
  const visual = lead.monitoramento?.visual;
  if (visual === "vermelho") {
    return "border-2 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]";
  }
  if (visual === "laranja") {
    return "border-2 border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.25)]";
  }
  return "";
}

export function LeadFunilAlerta({
  lead,
  onUpdated,
}: {
  lead: Lead;
  onUpdated?: (lead: Lead) => void;
}) {
  const mon = lead.monitoramento;
  const [open, setOpen] = useState(false);
  const [adiarOpen, setAdiarOpen] = useState(false);
  const [adiamentos, setAdiamentos] = useState<LeadPrazoAdiamento[] | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchPrazoAdiamentos(lead.id)
      .then((rows) => {
        if (!cancelled) setAdiamentos(rows);
      })
      .catch(() => {
        if (!cancelled) setAdiamentos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lead.id]);

  if (!mon || mon.visual === "none" || mon.problemas.length === 0) return null;

  const isRed = mon.visual === "vermelho";
  const summary =
    mon.problemas[0]?.detalhe ??
    (isRed ? "Lead precisa de atenção" : "Prazo próximo do vencimento");
  const timeLabel = isRed
    ? (mon.tempoAtrasoLabel ?? mon.tempoSemMovimentacaoLabel)
    : (mon.tempoRestanteLabel ?? mon.permanenciaLabel);

  return (
    <div className="w-full min-w-0">
    <TooltipProvider delayDuration={200}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild className="flex w-full">
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-7 w-full items-center gap-1.5 rounded-md border px-1.5 text-left text-[10px] font-medium",
                  isRed
                    ? "border-red-500/25 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15 text-red-700 dark:text-red-300"
                    : "border-orange-400/30 bg-gradient-to-r from-orange-400/18 via-amber-400/10 to-orange-400/18 text-orange-800 dark:text-orange-300",
                )}
                onPointerDown={stopCardEvents}
                onClick={stopCardEvents}
              >
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{summary}</span>
                {timeLabel && (
                  <span className="ml-auto shrink-0 tabular-nums">
                    {timeLabel}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            {mon.problemas.map((p) => p.titulo).join(" · ")}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          className="w-[20.5rem] overflow-hidden rounded-xl border-border/70 p-0 shadow-xl"
          onPointerDown={stopCardEvents}
          onClick={stopCardEvents}
        >
          <div
            className={cn(
              "px-3.5 py-3 text-white",
              isRed
                ? "bg-gradient-to-br from-red-500 via-rose-500 to-red-700"
                : "bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600",
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35">
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Monitoramento
                </p>
                <p className="truncate text-sm font-semibold leading-tight">
                  {lead.nome}
                </p>
                {getSession()?.role === "super_admin" ? null : (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-white/90">
                  <User className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{lead.corretor}</span>
                </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div className="space-y-2">
              {mon.problemas.map((problema) => {
                const tone = problemaTone(problema.tipo);
                return (
                  <div
                    key={problema.tipo}
                    className={cn(
                      "rounded-lg p-2.5 ring-1",
                      tone === "red" &&
                        "bg-gradient-to-br from-red-50 to-rose-100/90 ring-red-200/80 dark:from-red-950/50 dark:to-rose-950/30 dark:ring-red-800/40",
                      tone === "orange" &&
                        "bg-gradient-to-br from-orange-50 to-amber-100/90 ring-orange-200/80 dark:from-orange-950/40 dark:to-amber-950/25 dark:ring-orange-800/40",
                      tone === "slate" &&
                        "bg-gradient-to-br from-slate-50 to-slate-100/90 ring-slate-200/80 dark:from-slate-900/50 dark:to-slate-800/40 dark:ring-slate-700/50",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          tone === "red" &&
                            "bg-red-500/15 text-red-600 dark:text-red-300",
                          tone === "orange" &&
                            "bg-orange-500/15 text-orange-600 dark:text-orange-300",
                          tone === "slate" &&
                            "bg-slate-500/15 text-slate-600 dark:text-slate-300",
                        )}
                      >
                        <ProblemaIcon tipo={problema.tipo} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-snug">
                          {problema.titulo}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          {problema.detalhe}
                        </p>
                      </div>
                    </div>
                    {problema.motivos && problema.motivos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {problema.motivos.map((motivo) => (
                          <Badge
                            key={motivo}
                            variant="outline"
                            className="h-5 border-border/70 bg-background/70 px-1.5 py-0 text-[10px]"
                          >
                            {MOTIVO_SEM_MOVIMENTACAO_LABEL[motivo]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {mon.tarefasAtrasadas && mon.tarefasAtrasadas.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                  Follow-ups atrasados
                </p>
                <ul className="space-y-1.5">
                  {mon.tarefasAtrasadas.map((tarefa) => (
                    <li
                      key={tarefa.id}
                      className="rounded-lg bg-gradient-to-br from-red-50 to-rose-100/80 p-2.5 ring-1 ring-red-200/70 dark:from-red-950/40 dark:to-rose-950/20 dark:ring-red-800/40"
                    >
                      <p className="text-xs font-medium">{tarefa.titulo}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Prazo: {tarefa.prazo}
                        {tarefa.funilStage
                          ? ` · etapa ${tarefa.funilStage}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="divide-y divide-border/60 overflow-hidden rounded-lg bg-muted/45 ring-1 ring-border/60">
              <MetricRow
                icon={<LogIn className="h-3 w-3" />}
                label="Entrada na etapa"
                value={formatDateTimePt(mon.stageEnteredAt)}
              />
              <MetricRow
                icon={<Timer className="h-3 w-3" />}
                label="Permanência"
                value={mon.permanenciaLabel}
              />
              <MetricRow
                icon={<Clock className="h-3 w-3" />}
                label="Prazo configurado"
                value={
                  (mon.prazoConfigurado
                    ? formatPrazoUnidade(
                        mon.prazoConfigurado.valor,
                        mon.prazoConfigurado.unidade,
                      )
                    : "Sem prazo") + (mon.prazoAdiado ? " · adiado" : "")
                }
              />
              <MetricRow
                icon={<CalendarClock className="h-3 w-3" />}
                label="Vencimento"
                value={formatDateTimePt(mon.prazoDueAt)}
              />
              <MetricRow
                icon={<Hourglass className="h-3 w-3" />}
                label="Última movimentação"
                value={formatDateTimePt(mon.lastMovementAt)}
              />
              <MetricRow
                icon={<Timer className="h-3 w-3" />}
                label="Sem movimentação"
                value={mon.tempoSemMovimentacaoLabel}
              />
              {mon.tempoRestanteLabel && (
                <MetricRow
                  icon={<Hourglass className="h-3 w-3" />}
                  label="Tempo restante"
                  value={mon.tempoRestanteLabel}
                />
              )}
              {mon.tempoAtrasoLabel && (
                <MetricRow
                  icon={<AlertTriangle className="h-3 w-3" />}
                  label="Tempo em atraso"
                  value={mon.tempoAtrasoLabel}
                  accent
                />
              )}
            </dl>

            {adiamentos && adiamentos.length > 0 && (
              <div>
                <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Adiamentos
                </p>
                <ul className="space-y-1.5">
                  {adiamentos.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border/50"
                    >
                      <span className="font-medium text-foreground">
                        {item.prazoAnteriorLabel} → {item.prazoNovoLabel}
                      </span>
                      {" · "}
                      {item.autorNome} · {formatDateTimePt(item.createdAt)}
                      {item.motivo ? ` — ${item.motivo}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mon.podeAdiar && (
              <Button
                type="button"
                size="sm"
                className={cn("h-8 w-full", BRAND_GRADIENT_BTN)}
                style={BRAND_GRADIENT_STYLE}
                onClick={() => setAdiarOpen(true)}
              >
                <Clock className="h-3.5 w-3.5" />
                Adiar prazo
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <AdiarPrazoDialog
        open={adiarOpen}
        onOpenChange={setAdiarOpen}
        lead={lead}
        onUpdated={(next) => {
          onUpdated?.(next);
          setAdiarOpen(false);
          setOpen(false);
        }}
      />
    </TooltipProvider>
    </div>
  );
}

function AdiarPrazoDialog({
  open,
  onOpenChange,
  lead,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onUpdated: (lead: Lead) => void;
}) {
  const atual = lead.monitoramento?.prazoConfigurado;
  const [valor, setValor] = useState(String(atual?.valor ?? 24));
  const [unidade, setUnidade] = useState<PrazoUnidade>(atual?.unidade ?? "horas");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValor(String(lead.monitoramento?.prazoConfigurado?.valor ?? 24));
    setUnidade(lead.monitoramento?.prazoConfigurado?.unidade ?? "horas");
    setMotivo("");
  }, [open, lead.monitoramento?.prazoConfigurado]);

  async function handleSave() {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1) {
      toast.error("Informe um prazo válido.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adiarPrazoLead(lead.id, {
        valor: n,
        unidade,
        motivo: motivo.trim() || undefined,
      });
      onUpdated(mapApiLead(updated));
      toast.success("Prazo adiado e registrado no histórico.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível adiar o prazo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDown={stopCardEvents} onClick={stopCardEvents}>
        <DialogHeader>
          <DialogTitle>Adiar prazo — {lead.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground">
            O novo prazo é contado a partir da entrada na etapa atual
            {atual
              ? ` (hoje: ${formatPrazoUnidade(atual.valor, atual.unidade)})`
              : ""}
            .
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Novo prazo</Label>
              <Input
                type="number"
                min={1}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as PrazoUnidade)}
              >
                {PRAZO_UNIDADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar adiamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
