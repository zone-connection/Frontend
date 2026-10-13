import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  fetchLeadWhatsappChat,
  sendLeadWhatsappChat,
  type LeadWhatsappMessage,
} from "@/lib/leads-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getSession } from "@/lib/auth";
import { canSendWhatsappInbox } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  chatPaneClass,
  chatPaneVars,
  isMediaPlaceholder,
  mediaSrc,
  WhatsappAudioBubble,
} from "@/components/whatsapp-chat-look";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function formatWhen(at: string | null) {
  if (!at) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
}: {
  leadId: string;
  active: boolean;
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
  const scroller = useRef<HTMLDivElement>(null);
  const session = getSession();
  const canSend = canSendWhatsappInbox(
    session?.role,
    session?.tenant?.modules ?? null,
  );

  async function load() {
    setLoading(true);
    try {
      const chat = await fetchLeadWhatsappChat(leadId);
      setAvailable(chat.available);
      setReason(chat.reason ?? null);
      setOzapError(chat.error ?? null);
      setMessages(chat.messages);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível carregar o WhatsApp."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    void fetchLeadWhatsappChat(leadId)
      .then((chat) => {
        if (cancelled) return;
        setAvailable(chat.available);
        setReason(chat.reason ?? null);
        setOzapError(chat.error ?? null);
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
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const text = draft.trim();
    if (!canSend || !text || sending) return;
    setSending(true);
    try {
      await sendLeadWhatsappChat(leadId, text);
      setDraft("");
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
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível enviar a mensagem."));
    } finally {
      setSending(false);
    }
  }

  if (!available) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
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
    <div className="flex min-h-[22rem] flex-col overflow-hidden rounded-xl border bg-primary/[0.04]">
      <div className="flex items-center justify-between border-b bg-primary/[0.04] px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          Conversa no WhatsApp
        </p>
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
      <div
        ref={scroller}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]",
          chatPaneClass,
        )}
        style={chatPaneVars}
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
            {messages.map((msg) => {
              const meta = bubbleMeta(msg);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    meta.outgoing ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      meta.outgoing
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border bg-card",
                    )}
                  >
                    <p className="flex items-center gap-1 text-[10px] font-medium opacity-80">
                      {meta.label === "IA" || meta.label === "Follow-up" ? (
                        <Bot className="h-3 w-3" />
                      ) : null}
                      {meta.label}
                      {msg.at ? ` · ${formatWhen(msg.at)}` : ""}
                    </p>
                    {msg.mediaUrl && msg.mediaType === "image" ? (
                      <a
                        href={mediaSrc(msg.mediaUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block"
                      >
                        <img
                          src={mediaSrc(msg.mediaUrl)}
                          alt=""
                          className="max-h-56 rounded-lg"
                        />
                      </a>
                    ) : null}
                    {(msg.mediaType?.toLowerCase() === "audio" ||
                      (isMediaPlaceholder(msg.text) &&
                        /audio/i.test(msg.text))) &&
                    msg.mediaUrl ? (
                      <WhatsappAudioBubble
                        url={msg.mediaUrl}
                        outgoing={meta.outgoing}
                      />
                    ) : null}
                    {msg.mediaUrl &&
                    msg.mediaType &&
                    msg.mediaType !== "image" &&
                    msg.mediaType !== "audio" &&
                    msg.mediaType !== "text" ? (
                      <a
                        href={mediaSrc(msg.mediaUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block underline"
                      >
                        Abrir {msg.mediaType}
                      </a>
                    ) : null}
                    {msg.text && !isMediaPlaceholder(msg.text) ? (
                      <p className="mt-0.5 whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {canSend ? (
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
    </div>
  );
}
