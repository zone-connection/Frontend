import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSession } from "@/lib/auth";
import { canWriteTriagem } from "@/lib/permissions";
import { ApiError } from "@/lib/api";
import { updateTriagemEvent, type TriagemEvent } from "@/lib/triagem-api";
import {
  getTriagemHistoryCached,
  loadTriagemHistory,
  replaceTriagemHistoryCached,
} from "@/lib/triagem-history-cache";
import { ClipboardList, FileText, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";

export const MAX_TRIAGEM_TEXTO = 400;

export function formatTriagemWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function personInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function HistoryTimeline({
  events,
  contactName,
  stageLabel,
  fallbackStage,
  loading,
  leadId,
  onEventUpdated,
}: {
  events: TriagemEvent[];
  contactName: string;
  stageLabel: (slug: string | null) => string;
  /** Etapa atual do lead — usada só em relatos antigos sem stage gravado. */
  fallbackStage?: string | null;
  loading?: boolean;
  leadId?: string | null;
  onEventUpdated?: (event: TriagemEvent) => void;
}) {
  const session = getSession();
  const canSeeOriginal =
    session?.role === "admin" || session?.role === "gerente";
  const canEditOwn = canWriteTriagem(session?.role) && Boolean(session?.id);

  const [editEvent, setEditEvent] = useState<TriagemEvent | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [expandedOriginalId, setExpandedOriginalId] = useState<string | null>(
    null,
  );

  function openEdit(ev: TriagemEvent) {
    setEditEvent(ev);
    setEditTexto(ev.texto);
  }

  async function submitEdit() {
    if (!editEvent) return;
    const texto = editTexto.trim();
    if (!texto) {
      toast.error("Informe o relato.");
      return;
    }
    if (texto.length > MAX_TRIAGEM_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_TRIAGEM_TEXTO} caracteres.`,
      );
      return;
    }
    if (texto === editEvent.texto) {
      setEditEvent(null);
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updateTriagemEvent(editEvent.id, texto);
      if (leadId) replaceTriagemHistoryCached(leadId, updated);
      onEventUpdated?.(updated);
      setEditEvent(null);
      toast.success("Relato atualizado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o relato.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-xl">
        Nenhum relato registrado para este contato.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ClipboardList className="w-4 h-4 text-primary" />
        Linha do tempo da triagem
      </div>
      <ol className="relative space-y-0">
        {events.map((ev, index) => {
          const stageSlug = ev.stageNovo || ev.stageAnterior || fallbackStage;
          const stageName = stageSlug ? stageLabel(stageSlug) : null;
          const changedStage = Boolean(
            ev.stageAnterior &&
            ev.stageNovo &&
            ev.stageAnterior !== ev.stageNovo,
          );
          const isLast = index === events.length - 1;
          const isOwn =
            canEditOwn && session?.id != null && ev.autor.id === session.id;
          const showOriginal =
            canSeeOriginal &&
            Boolean(ev.textoAnterior) &&
            expandedOriginalId === ev.id;

          return (
            <li key={ev.id} className="relative flex gap-3 pb-6 last:pb-0">
              <div className="flex flex-col items-center w-5 shrink-0">
                <span className="relative z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <FileText className="h-2.5 w-2.5" />
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className="mt-1 w-px flex-1 min-h-6 bg-border"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatTriagemWhen(ev.createdAt)}
                    {ev.editedAt ? (
                      <span className="ml-1.5">
                        · editado {formatTriagemWhen(ev.editedAt)}
                      </span>
                    ) : null}
                  </div>
                  {isOwn ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEdit(ev)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                  ) : null}
                </div>

                <div className={cn(
                  "rounded-xl border bg-card p-3.5 space-y-2.5 shadow-sm",
                  (ev.origem === "retrabalho" || ev.origem === "caca_lead") &&
                    "border-amber-400/50 bg-amber-50/70 dark:bg-amber-950/20",
                )}>
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                        {personInitials(ev.autor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{ev.autor.name}</span>
                        {changedStage
                          ? " atualizou a triagem de "
                          : " registrou um relato sobre "}
                        <span className="font-semibold">{contactName}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {stageName && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              STATUS_CHIP_CLASS,
                              "font-medium bg-primary/10 text-primary border-primary/20",
                            )}
                            title={
                              changedStage ? stageName : `Manteve ${stageName}`
                            }
                          >
                            {changedStage ? stageName : `Manteve ${stageName}`}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {ev.origem === "funil"
                            ? "Funil"
                            : ev.origem === "retrabalho"
                              ? "Retrabalho"
                              : ev.origem === "caca_lead"
                                ? "Caça-lead"
                                : "Manual"}
                        </Badge>
                        {ev.editedAt ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium bg-amber-500/15 text-amber-800 border-amber-500/25"
                          >
                            Editado
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-0 sm:pl-10.5">
                    {ev.texto}
                  </p>
                  {canSeeOriginal && ev.textoAnterior ? (
                    <div className="pl-0 sm:pl-10.5 space-y-2">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          setExpandedOriginalId((prev) =>
                            prev === ev.id ? null : ev.id,
                          )
                        }
                      >
                        {showOriginal ? "Ocultar original" : "Ver original"}
                      </Button>
                      {showOriginal ? (
                        <div className="rounded-lg border border-dashed bg-muted/30 p-2.5">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">
                            Texto anterior
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {ev.textoAnterior}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Dialog
        open={Boolean(editEvent)}
        onOpenChange={(open) => {
          if (!open && !editSaving) setEditEvent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar relato</DialogTitle>
            <DialogDescription>
              Altere o texto do seu relato. A etapa do funil não muda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="triagem-edit-texto">Relato</Label>
              <span className="text-xs text-muted-foreground">
                {editTexto.length}/{MAX_TRIAGEM_TEXTO}
              </span>
            </div>
            <Textarea
              id="triagem-edit-texto"
              value={editTexto}
              maxLength={MAX_TRIAGEM_TEXTO}
              rows={4}
              disabled={editSaving}
              onChange={(e) => setEditTexto(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={editSaving}
              onClick={() => setEditEvent(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={editSaving || !editTexto.trim()}
              onClick={() => void submitEdit()}
            >
              {editSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function useTriagemHistory(leadId: string | null) {
  const [events, setEvents] = useState<TriagemEvent[]>(() =>
    leadId ? (getTriagemHistoryCached(leadId) ?? []) : [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const cached = getTriagemHistoryCached(leadId);
    if (cached) {
      setEvents(cached);
      setLoading(false);
    } else {
      setEvents([]);
      setLoading(true);
    }

    let cancelled = false;
    void loadTriagemHistory(leadId, (next) => {
      if (!cancelled) {
        setEvents(next);
        setLoading(false);
      }
    }).catch((err) => {
      if (cancelled) return;
      setLoading(false);
      if (!cached) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o histórico.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return { events, setEvents, loading };
}
