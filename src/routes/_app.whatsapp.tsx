import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Pause, Play, RefreshCw, Search, Send } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  assumeWhatsappInboxChat,
  fetchWhatsappInboxChats,
  fetchWhatsappInboxMessages,
  resumeWhatsappInboxChat,
  sendWhatsappInboxMessage,
  type WhatsappBubbleKind,
  type WhatsappInboxChat,
  type WhatsappInboxMessage,
} from "@/lib/whatsapp-inbox-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Zone Connection" }] }),
  component: WhatsappInboxPage,
});

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function formatWhen(at: string | null) {
  if (!at) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function bubbleMeta(kind: WhatsappBubbleKind) {
  if (kind === "client") return { label: "Cliente", outgoing: false };
  if (kind === "ai") return { label: "IA", outgoing: true };
  if (kind === "follow_up") return { label: "Follow-up", outgoing: true };
  return { label: "Corretor", outgoing: true };
}

function WhatsappInboxPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assuming, setAssuming] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState<WhatsappInboxChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappInboxMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const active = chats.find((chat) => chat.chatId === activeId) ?? null;

  async function loadChats(selectId?: string | null) {
    setLoading(true);
    try {
      const result = await fetchWhatsappInboxChats();
      const next = result.chats.slice().sort((a, b) => {
        const left = a.lastMessageAt ?? "";
        const right = b.lastMessageAt ?? "";
        return right.localeCompare(left);
      });
      setChats(next);
      const keep = selectId ?? activeId;
      if (keep && next.some((chat) => chat.chatId === keep)) {
        setActiveId(keep);
      } else if (!keep && next[0]) {
        setActiveId(next[0].chatId);
      }
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível listar as conversas."));
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(chatId: string) {
    setLoadingMsgs(true);
    try {
      const result = await fetchWhatsappInboxMessages(chatId);
      setMessages(result.messages);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível abrir a conversa."));
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    void loadChats();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loadingMsgs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) =>
      `${chat.name} ${chat.phone ?? ""} ${chat.lastMessage ?? ""} ${chat.leadNome ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [chats, query]);

  async function send() {
    if (!activeId || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);
    try {
      await sendWhatsappInboxMessage(activeId, text);
      setDraft("");
      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === activeId
            ? {
                ...chat,
                lastMessage: text,
                lastMessageAt: new Date().toISOString(),
                aiPaused: true,
              }
            : chat,
        ),
      );
      await loadMessages(activeId);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível enviar."));
    } finally {
      setSending(false);
    }
  }

  async function toggleAi() {
    if (!activeId || assuming) return;
    setAssuming(true);
    try {
      if (active?.aiPaused) {
        await resumeWhatsappInboxChat(activeId);
        setChats((prev) =>
          prev.map((chat) =>
            chat.chatId === activeId ? { ...chat, aiPaused: false } : chat,
          ),
        );
        toast.success("IA religada nesta conversa.");
      } else {
        await assumeWhatsappInboxChat(activeId);
        setChats((prev) =>
          prev.map((chat) =>
            chat.chatId === activeId ? { ...chat, aiPaused: true } : chat,
          ),
        );
        toast.success("Você assumiu. A IA ficou pausada.");
      }
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar a IA."));
    } finally {
      setAssuming(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="WhatsApp"
        description="Conversas do número da imobiliária. Ao responder, a IA pausa nesta conversa."
      />
      <div className="grid min-h-[32rem] flex-1 overflow-hidden rounded-2xl border bg-card lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar conversa"
                className="h-9 pl-8"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => void loadChats(activeId)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            {loading && chats.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Carregando conversas…
              </p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma conversa encontrada.
              </p>
            ) : (
              filtered.map((chat) => (
                <button
                  key={chat.chatId}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-muted/50",
                    activeId === chat.chatId && "bg-emerald-500/10",
                  )}
                  onClick={() => setActiveId(chat.chatId)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FaWhatsapp className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {chat.leadNome || chat.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatWhen(chat.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {chat.aiPaused ? "IA pausada · " : ""}
                      {chat.lastMessage || "Sem mensagens"}
                    </span>
                  </span>
                  {chat.unread > 0 ? (
                    <span className="mt-1 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                      {chat.unread}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          {active ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {active.leadNome || active.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {active.phone || active.chatId}
                    {active.isGroup ? " · Grupo" : ""}
                    {active.aiPaused ? " · IA pausada" : " · IA ativa"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {active.leadId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/funil" search={{ lead: active.leadId }}>
                        Ver lead
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={active.aiPaused ? "outline" : "default"}
                    onClick={() => void toggleAi()}
                    disabled={assuming}
                  >
                    {assuming ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : active.aiPaused ? (
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Pause className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {active.aiPaused ? "Religar IA" : "Assumir"}
                  </Button>
                </div>
              </header>
              <div
                ref={scroller}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4 [scrollbar-width:thin]"
              >
                {loadingMsgs ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Carregando mensagens…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma mensagem neste chat.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const meta = bubbleMeta(msg.kind);
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
                            "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            meta.outgoing
                              ? "rounded-br-md bg-emerald-600 text-white"
                              : "rounded-bl-md bg-background",
                          )}
                        >
                          <p className="flex items-center gap-1 text-[10px] font-medium opacity-80">
                            {msg.kind === "ai" || msg.kind === "follow_up" ? (
                              <Bot className="h-3 w-3" />
                            ) : null}
                            {meta.label}
                            {msg.at ? ` · ${formatWhen(msg.at)}` : ""}
                          </p>
                          {msg.mediaUrl && msg.mediaType === "image" ? (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block"
                            >
                              <img
                                src={msg.mediaUrl}
                                alt=""
                                className="max-h-56 rounded-lg"
                              />
                            </a>
                          ) : null}
                          {msg.mediaUrl && msg.mediaType === "audio" ? (
                            <audio
                              className="mt-1 w-full max-w-xs"
                              controls
                              src={msg.mediaUrl}
                            />
                          ) : null}
                          {msg.mediaUrl &&
                          msg.mediaType &&
                          msg.mediaType !== "image" &&
                          msg.mediaType !== "audio" &&
                          msg.mediaType !== "text" ? (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block underline"
                            >
                              Abrir {msg.mediaType}
                            </a>
                          ) : null}
                          {msg.text ? (
                            <p className="mt-0.5 whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form
                className="flex items-end gap-2 border-t p-3"
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
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <FaWhatsapp className="h-10 w-10 text-emerald-600" />
              <p>Selecione uma conversa à esquerda.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
