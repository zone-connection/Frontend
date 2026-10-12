import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  fetchLeadWhatsappChat,
  sendLeadWhatsappChat,
  type LeadWhatsappMessage,
} from "@/lib/leads-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

function bubbleLabel(msg: LeadWhatsappMessage) {
  if (msg.direction === "in") return "Cliente";
  if (msg.source === "ai" || msg.source === "bot" || msg.source === "agent") {
    return "IA";
  }
  return "CRM";
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
  const [reason, setReason] = useState<"not_linked" | "not_configured" | null>(
    null,
  );
  const [messages, setMessages] = useState<LeadWhatsappMessage[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const chat = await fetchLeadWhatsappChat(leadId);
      setAvailable(chat.available);
      setReason(chat.reason ?? null);
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
    if (!text || sending) return;
    setSending(true);
    try {
      await sendLeadWhatsappChat(leadId, text);
      setDraft("");
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          direction: "out",
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
          : "Este lead ainda não tem conversa da IA no WhatsApp. Quando o bot atender, o histórico aparece aqui."}
      </div>
    );
  }

  return (
    <div className="flex min-h-[22rem] flex-col overflow-hidden rounded-xl border bg-muted/20">
      <div className="flex items-center justify-between border-b px-3 py-2">
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
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]"
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
          messages.map((msg) => {
            const outgoing = msg.direction === "out";
            return (
              <div
                key={msg.id}
                className={cn("flex", outgoing ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    outgoing
                      ? "rounded-br-md bg-emerald-600 text-white"
                      : "rounded-bl-md bg-background",
                  )}
                >
                  <p className="text-[10px] font-medium opacity-80">
                    {bubbleLabel(msg)}
                    {msg.at ? ` · ${formatWhen(msg.at)}` : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t bg-background p-2"
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
          className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700"
          disabled={sending || !draft.trim()}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
