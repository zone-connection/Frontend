import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  monitoramentoCardClass,
  OperacaoFunilAlerta,
} from "@/components/operacao-funil-alerta";
import { FunilColumnShell } from "@/components/funil-column-shell";
import { getWhatsAppUrl } from "@/lib/env";
import type { LeadMonitoramento } from "@/lib/lead-monitoramento";
import { phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Phone,
  User,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";

const COLUMN_STEP_PX = 288 + 12;

export type OperationFunnelStage = {
  id: string;
  label: string;
  color?: string | null;
};

export type OperationFunnelCard = {
  id: string;
  etapaId: string;
  title: string;
  subtitle?: string;
  meta?: string;
  value?: number;
  href: string;
  imageUrl?: string | null;
  footer?: string;
  updatedAt?: string;
  phone?: string;
  actionLabel?: string;
  priority?: "alta" | "media" | "baixa";
  monitoramento?: LeadMonitoramento | null;
  tag?: { label: string; className?: string };
  tags?: Array<{ label: string; className?: string }>;
};

export function FunilScrollControls({
  canScrollLeft,
  canScrollRight,
  onScroll,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScroll: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex h-8 items-center overflow-hidden rounded-full border bg-background">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-none"
        disabled={!canScrollLeft}
        aria-label="Coluna anterior"
        title="Coluna anterior"
        onClick={() => onScroll(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="h-4 w-px bg-border" />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-none"
        disabled={!canScrollRight}
        aria-label="Próxima coluna"
        title="Próxima coluna"
        onClick={() => onScroll(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function OperationFunnelBoard({
  stages,
  cards,
  movingId,
  onMove,
  onCardClick,
  toolbar,
  onScrollChange,
  scrollApiRef,
}: {
  stages: OperationFunnelStage[];
  cards: OperationFunnelCard[];
  movingId?: string | null;
  onMove: (cardId: string, etapaId: string) => void;
  onCardClick?: (cardId: string) => void;
  toolbar?: ReactNode;
  onScrollChange?: (state: { left: boolean; right: boolean }) => void;
  scrollApiRef?: MutableRefObject<((direction: -1 | 1) => void) | null>;
}) {
  const [activeDrop, setActiveDrop] = useState<string | null>(null);
  const didDrag = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = boardRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      onScrollChange?.({ left: false, right: false });
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft < max - 2;
    setCanScrollLeft(left);
    setCanScrollRight(right);
    onScrollChange?.({ left, right });
  }, [onScrollChange]);

  const scrollBoard = useCallback((direction: -1 | 1) => {
    const el = boardRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * COLUMN_STEP_PX, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (scrollApiRef) scrollApiRef.current = scrollBoard;
    return () => {
      if (scrollApiRef) scrollApiRef.current = null;
    };
  }, [scrollApiRef, scrollBoard]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons, stages.length, cards.length]);

  function handleDrop(etapaId: string, event: DragEvent) {
    event.preventDefault();
    setActiveDrop(null);
    const cardId = event.dataTransfer.getData("text/plain");
    if (!cardId) return;
    const card = cards.find((item) => item.id === cardId);
    if (!card || card.etapaId === etapaId) return;
    onMove(cardId, etapaId);
  }

  function openCard(card: OperationFunnelCard) {
    if (didDrag.current) return;
    if (onCardClick) {
      onCardClick(card.id);
      return;
    }
    window.location.assign(card.href);
  }

  function openWhatsApp(phone: string) {
    const digits = phoneDigits(phone);
    if (digits.length < 10) {
      toast.error("Este contato não tem telefone.");
      return;
    }
    const e164 = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(getWhatsAppUrl(undefined, e164), "_blank", "noopener,noreferrer");
  }

  const showInlineScroll = !onScrollChange && !scrollApiRef;

  return (
    <div>
      {showInlineScroll || toolbar ? (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          {showInlineScroll ? (
            <FunilScrollControls
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              onScroll={scrollBoard}
            />
          ) : null}
        </div>
      ) : null}

      <div
        ref={boardRef}
        className="-mx-6 flex gap-3 overflow-x-auto scroll-smooth px-6 pb-4"
      >
        {stages.map((stage) => {
          const columnCards = cards.filter((card) => card.etapaId === stage.id);
          const total = columnCards.reduce(
            (sum, card) => sum + (card.value ?? 0),
            0,
          );
          return (
            <FunilColumnShell
              key={stage.id}
              title={stage.label}
              count={columnCards.length}
              total={formatColumnTotal(total)}
              color={stage.color}
              active={activeDrop === stage.id}
              onDragOver={(event) => {
                event.preventDefault();
                setActiveDrop(stage.id);
              }}
              onDragLeave={() => {
                if (activeDrop === stage.id) setActiveDrop(null);
              }}
              onDrop={(event) => handleDrop(stage.id, event)}
            >
                {columnCards.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Arraste um card para esta etapa
                  </p>
                ) : (
                  columnCards.map((card) => {
                    const phone = card.phone ?? "";
                    const canWhatsApp = phoneDigits(phone).length >= 10;
                    return (
                      <Card
                        key={card.id}
                        draggable
                        onDragStart={(event) => {
                          didDrag.current = true;
                          event.dataTransfer.setData("text/plain", card.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          window.setTimeout(() => {
                            didDrag.current = false;
                          }, 0);
                        }}
                        onClick={() => openCard(card)}
                        className={cn(
                          "cursor-grab select-none rounded-2xl border-black/5 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[opacity,box-shadow,transform] duration-200 hover:bg-muted/40 hover:shadow-md active:cursor-grabbing",
                          movingId !== card.id &&
                            monitoramentoCardClass(card.monitoramento),
                          movingId === card.id &&
                            "scale-[0.98] border-dashed border-primary/40 bg-muted/40 opacity-35 shadow-none",
                        )}
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <div className="table-person-name flex min-w-0 items-center gap-2 text-sm">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "text-[10px] font-semibold text-white",
                                  lostLeadAvatarClass(card.title),
                                )}
                              >
                                {card.title
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part[0]?.toUpperCase() ?? "")
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{card.title}</span>
                          </div>
                          <div
                            className={cn(
                              "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                              card.priority === "alta"
                                ? "bg-destructive"
                                : card.priority === "media"
                                  ? "bg-warning"
                                  : "bg-muted-foreground",
                            )}
                          />
                        </div>
                        {(card.tags?.length
                          ? card.tags
                          : card.tag
                            ? [card.tag]
                            : []
                        ).map((tag) => (
                          <span
                            key={tag.label}
                            className={cn(
                              "mb-1.5 mr-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              tag.className ?? "bg-violet-600 text-white",
                            )}
                          >
                            {tag.label}
                          </span>
                        ))}
                        {card.subtitle ? (
                          <p className="mb-1 truncate text-xs text-muted-foreground">
                            {card.subtitle}
                          </p>
                        ) : null}
                        {phone ? (
                          <div className="grid grid-cols-[14px_minmax(0,1fr)_22px] items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{phone}</span>
                            <button
                              type="button"
                              title="Abrir WhatsApp"
                              aria-label="Abrir WhatsApp"
                              disabled={!canWhatsApp}
                              className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[#25D366] hover:bg-[#25D366]/15 disabled:pointer-events-none disabled:opacity-40"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(phone);
                              }}
                            >
                              <FaWhatsapp className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                        ) : null}
                        <div className="mt-1.5 grid grid-cols-[14px_minmax(0,1fr)_22px] items-center gap-1.5">
                          <Banknote
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="text-sm font-semibold text-primary">
                            {card.meta ?? "—"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                          <div className="flex min-w-0 items-center gap-1">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{card.footer ?? "—"}</span>
                          </div>
                          {card.updatedAt ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {card.updatedAt}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 flex w-full flex-col gap-1.5">
                          {card.actionLabel ? (
                            <button
                              type="button"
                              className="flex h-7 w-full items-center justify-center gap-1 rounded-md border border-border/70 bg-muted/30 px-1.5 text-[11px] font-medium text-foreground hover:border-primary/30 hover:bg-muted/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCard(card);
                              }}
                            >
                              <ClipboardList
                                className="h-3 w-3 text-primary"
                                aria-hidden
                              />
                              {card.actionLabel}
                            </button>
                          ) : null}
                          <OperacaoFunilAlerta
                            monitoramento={card.monitoramento}
                          />
                        </div>
                      </Card>
                    );
                  })
                )}
            </FunilColumnShell>
          );
        })}
      </div>
    </div>
  );
}

function formatColumnTotal(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
