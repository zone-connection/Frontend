import { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  fetchLeadWhatsappChat,
  sendLeadWhatsappChat,
  type LeadWhatsappMessage,
} from "@/lib/leads-api";
import {
  deleteWhatsappInboxMessage,
  editWhatsappInboxMessage,
} from "@/lib/whatsapp-inbox-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSession } from "@/lib/auth";
import { canSendWhatsappInbox } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { chatPaneClass, chatPaneVars } from "@/components/whatsapp-chat-look";
import {
  inferReadDelivery,
  isRemoteWhatsappMessage,
  WhatsappDeleteMessagesDialog,
  WhatsappMessageBubble,
  WhatsappMessageDetailsDialog,
  WhatsappMessageEditDialog,
} from "@/components/whatsapp-message-bubble";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function bubbleMeta(msg: LeadWhatsappMessage) {
  if (msg.kind === "client" || msg.direction === "in" || msg.source === "lead_message") {
    return { label: "Cliente", outgoing: false };
  }
  if (msg.kind === "ai" || msg.source === "ai" || msg.source === "ai_message" || msg.source === "bot") {
    return { label: "IA", outgoing: true };
  }
  if (msg.kind === "follow_up" || msg.source === "follow_up") {
    return { label: "Follow-up", outgoing: true };
  }
  return { label: "Corretor", outgoing: true };
}

export function LeadWhatsappChat({
  leadId,
  active,
  className,
}: {
  leadId: string;
  active: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [available, setAvailable] = useState(true);
  const [reason, setReason] = useState<
    "not_linked" | "not_configured" | "ozap_error" | null
  >(null);
  const [ozapError, setOzapError] = useState<string | null>(null);
  const [messages, setMessages] = useState<LeadWhatsappMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [detailMsg, setDetailMsg] = useState<LeadWhatsappMessage | null>(null);
  const [editMsg, setEditMsg] = useState<LeadWhatsappMessage | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingMsg, setSavingMsg] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<LeadWhatsappMessage[]>([]);
  const [deletingMsgs, setDeletingMsgs] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const session = getSession();
  const canSend = canSendWhatsappInbox(
    session?.role,
    session?.tenant?.modules ?? null,
  );
  const threadMessages = useMemo(
    () => inferReadDelivery(messages),
    [messages],
  );

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const chat = await fetchLeadWhatsappChat(leadId);
      setAvailable(chat.available);
      setReason(chat.reason ?? null);
      setOzapError(chat.error ?? null);
      setChatId(chat.chatId ?? null);
      setMessages((prev) => {
        if (
          silent &&
          prev.length === chat.messages.length &&
          prev.every(
            (msg, i) =>
              msg.id === chat.messages[i]?.id &&
              msg.text === chat.messages[i]?.text &&
              msg.delivery === chat.messages[i]?.delivery,
          )
        ) {
          return prev;
        }
        return chat.messages;
      });
    } catch (err) {
      if (!silent) {
        toast.error(errorMessage(err, "Não foi possível carregar o WhatsApp."));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!active) return;
    setSelectMode(false);
    setSelectedIds([]);
    let cancelled = false;
    setLoading(true);
    void fetchLeadWhatsappChat(leadId)
      .then((chat) => {
        if (cancelled) return;
        setAvailable(chat.available);
        setReason(chat.reason ?? null);
        setOzapError(chat.error ?? null);
        setChatId(chat.chatId ?? null);
        setMessages(chat.messages);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(errorMessage(err, "Não foi possível carregar o WhatsApp."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, active]);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (document.hidden) return;
      void load(true);
    };
    const timer = window.setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [leadId, active]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function saveEditedMessage() {
    if (!canSend || !chatId || !editMsg || savingMsg) return;
    const text = editDraft.trim();
    if (!text) return;
    setSavingMsg(true);
    try {
      await editWhatsappInboxMessage(chatId, editMsg.id, text);
      setMessages((prev) =>
        prev.map((item) => (item.id === editMsg.id ? { ...item, text } : item)),
      );
      setEditMsg(null);
      toast.success("Mensagem editada.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível editar a mensagem."));
    } finally {
      setSavingMsg(false);
    }
  }

  function toggleSelectMessage(id: string) {
    setSelectMode(true);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function askDeleteMessages(list: LeadWhatsappMessage[]) {
    const removable = list.filter(
      (item) =>
        (item.direction === "out" || item.kind === "agent" || item.kind === "ai") &&
        isRemoteWhatsappMessage(item.id),
    );
    if (removable.length === 0) return;
    setPendingDelete(removable);
  }

  async function confirmDeleteMessages() {
    if (!canSend || !chatId || pendingDelete.length === 0 || deletingMsgs) return;
    setDeletingMsgs(true);
    const removed: string[] = [];
    try {
      for (const msg of pendingDelete) {
        await deleteWhatsappInboxMessage(chatId, msg.id);
        removed.push(msg.id);
      }
      setMessages((prev) => prev.filter((item) => !removed.includes(item.id)));
      setSelectedIds([]);
      setSelectMode(false);
      setPendingDelete([]);
      toast.success(
        removed.length > 1
          ? `${removed.length} mensagens excluídas.`
          : "Mensagem excluída.",
      );
    } catch (err) {
      if (removed.length > 0) {
        setMessages((prev) => prev.filter((item) => !removed.includes(item.id)));
      }
      toast.error(errorMessage(err, "Não foi possível excluir as mensagens."));
    } finally {
      setDeletingMsgs(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!canSend || !text || sending) return;
    setSending(true);
    try {
      await sendLeadWhatsappChat(leadId, text);
      setDraft("");
      stickToBottom.current = true;
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          direction: "out",
          kind: "agent",
          text,
          at: new Date().toISOString(),
          source: "crm",
        },
      ]);
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível enviar a mensagem."));
    } finally {
      setSending(false);
    }
  }

  if (!available) {
    return (
      <div
        className={cn(
          "flex min-h-[22rem] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {reason === "not_configured"
          ? "A integração com o OZap ainda não está configurada no servidor."
          : reason === "ozap_error"
            ? ozapError ??
              "O OZap recusou a leitura do chat. Confira a API Key e a instância."
            : "Este lead ainda não tem conversa da IA no WhatsApp. Quando o bot atender, o histórico aparece aqui."}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border bg-primary/[0.04]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b bg-primary/[0.04] px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          Conversa no WhatsApp
        </p>
        <div className="flex items-center gap-1">
          {canSend ? (
            <Button
              type="button"
              variant={selectMode ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => {
                setSelectMode((cur) => {
                  if (cur) setSelectedIds([]);
                  return !cur;
                });
              }}
            >
              <ListChecks className="mr-1 h-3.5 w-3.5" />
              {selectMode ? "Cancelar" : "Selecionar"}
            </Button>
          ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
        </div>
      </div>
      <div
        ref={scroller}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]",
          chatPaneClass,
        )}
        style={chatPaneVars}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        }}
      >
        {loading && messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Carregando conversa…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma mensagem encontrada neste chat.
          </p>
        ) : (
          <div className="flex flex-col justify-end gap-2">
            {threadMessages.map((msg) => {
              const meta = bubbleMeta(msg);
              return (
                <WhatsappMessageBubble
                  key={msg.id}
                  message={msg}
                  label={meta.label}
                  outgoing={meta.outgoing}
                  canMutate={canSend && meta.outgoing && Boolean(chatId)}
                  selecting={selectMode}
                  selected={selectedIds.includes(msg.id)}
                  onToggleSelect={() => toggleSelectMessage(msg.id)}
                  onDetails={() => setDetailMsg(msg)}
                  onEdit={() => {
                    setEditMsg(msg);
                    setEditDraft(msg.text);
                  }}
                  onDelete={() => askDeleteMessages([msg])}
                  onStartSelect={() => toggleSelectMessage(msg.id)}
                />
              );
            })}
          </div>
        )}
      </div>
      {selectMode ? (
        <div className="flex items-center justify-between gap-2 border-t bg-primary/[0.06] px-3 py-2">
          <p className="text-xs">
            {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8"
            disabled={selectedIds.length === 0}
            onClick={() =>
              askDeleteMessages(
                threadMessages.filter((item) => selectedIds.includes(item.id)),
              )
            }
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Excluir
          </Button>
        </div>
      ) : canSend ? (
        <form
          className="flex items-end gap-2 border-t bg-primary/[0.04] p-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escreva uma mensagem…"
            className="min-h-[44px] max-h-28 resize-none rounded-xl"
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={sending || !draft.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      ) : (
        <p className="border-t bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">
          Seu perfil só visualiza as conversas dos seus leads.
        </p>
      )}
      <WhatsappDeleteMessagesDialog
        open={pendingDelete.length > 0}
        count={pendingDelete.length}
        previews={pendingDelete.slice(0, 3).map(
          (item) => item.text?.trim() || item.mediaType || "Mensagem",
        )}
        busy={deletingMsgs}
        onOpenChange={(open) => {
          if (!open) setPendingDelete([]);
        }}
        onConfirm={() => void confirmDeleteMessages()}
      />
      <WhatsappMessageDetailsDialog
        message={detailMsg}
        open={Boolean(detailMsg)}
        onOpenChange={(open) => {
          if (!open) setDetailMsg(null);
        }}
      />
      <WhatsappMessageEditDialog
        open={Boolean(editMsg)}
        value={editDraft}
        saving={savingMsg}
        onOpenChange={(open) => {
          if (!open) setEditMsg(null);
        }}
        onChange={setEditDraft}
        onSave={() => void saveEditedMessage()}
      />
    </div>
  );
}
