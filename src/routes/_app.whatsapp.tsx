import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  Tag,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { catalogColorBadgeClass } from "@/lib/catalog-colors";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { isCorretorLike } from "@/lib/permissions";
import {
  assumeWhatsappInboxChat,
  attachWhatsappChatTag,
  createWhatsappTag,
  deleteWhatsappTag,
  detachWhatsappChatTag,
  fetchWhatsappInboxChats,
  fetchWhatsappInboxMessages,
  fetchWhatsappTags,
  importWhatsappTagsFromFunil,
  readWhatsappMessagesCache,
  resumeWhatsappInboxChat,
  sendWhatsappInboxMessage,
  writeWhatsappMessagesCache,
  type WhatsappBubbleKind,
  type WhatsappInboxChat,
  type WhatsappInboxMessage,
  type WhatsappUserTag,
} from "@/lib/whatsapp-inbox-api";
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
  const [equipeId, setEquipeId] = useState("__all__");
  const [corretorId, setCorretorId] = useState("__all__");
  const [tagId, setTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<WhatsappUserTag[]>([]);
  const [tagDialog, setTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState<WhatsappInboxChat[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappInboxMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const loadGen = useRef(0);
  const pageSize = 50;
  const user = getSession();
  const [canSend, setCanSend] = useState(
    canSendWhatsappInbox(user?.role, user?.tenant?.modules ?? null),
  );
  const canFilterTeam =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "gerente";
  const cacheKey = `crm-whatsapp-inbox-chats:${user?.id ?? "anon"}`;

  const active = chats.find((chat) => chat.chatId === activeId) ?? null;

  function sortChats(list: WhatsappInboxChat[]) {
    return list.slice().sort((a, b) => {
      const left = a.lastMessageAt ?? "";
      const right = b.lastMessageAt ?? "";
      return right.localeCompare(left);
    });
  }

  async function loadChats(nextPage = page) {
    if (chats.length === 0) setLoading(true);
    try {
      const result = await fetchWhatsappInboxChats(nextPage, pageSize, {
        ...(equipeId !== "__all__" ? { equipeId } : {}),
        ...(corretorId !== "__all__" ? { corretorId } : {}),
        ...(tagId ? { tagId } : {}),
      });
      if (typeof result.canSend === "boolean") setCanSend(result.canSend);
      const next = sortChats(result.chats);
      setChats(next);
      setPage(result.page);
      setHasMore(result.hasMore);
      setTotal(result.total);
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            chats: next,
            page: result.page,
            hasMore: result.hasMore,
            total: result.total,
          }),
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível listar as conversas."));
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(chatId: string) {
    const gen = ++loadGen.current;
    const cached = readWhatsappMessagesCache(chatId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setLoadingMsgs(false);
    } else {
      setMessages([]);
      setLoadingMsgs(true);
    }
    try {
      const result = await fetchWhatsappInboxMessages(chatId);
      if (gen !== loadGen.current) return;
      setMessages(result.messages);
      writeWhatsappMessagesCache(chatId, result.messages);
    } catch (err) {
      if (gen !== loadGen.current) return;
      toast.error(errorMessage(err, "Não foi possível abrir a conversa."));
      if (!cached?.length) setMessages([]);
    } finally {
      if (gen === loadGen.current) setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as
          | WhatsappInboxChat[]
          | {
              chats: WhatsappInboxChat[];
              page: number;
              hasMore: boolean;
              total: number | null;
            };
        const list = Array.isArray(cached) ? cached : cached.chats;
        if (Array.isArray(list) && list.length > 0) {
          setChats(sortChats(list));
          if (!Array.isArray(cached)) {
            setPage(cached.page || 1);
            setHasMore(Boolean(cached.hasMore));
            setTotal(cached.total ?? null);
          }
          setLoading(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, [cacheKey]);

  useEffect(() => {
    void loadChats(1);
  }, [equipeId, corretorId, tagId]);

  useEffect(() => {
    let cancelled = false;
    void fetchWhatsappTags()
      .then((list) => {
        if (!cancelled) setTags(list);
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canFilterTeam) return;
    let cancelled = false;
    void fetchEquipes()
      .then((list) => {
        if (!cancelled) setEquipes(list);
      })
      .catch(() => {
        if (!cancelled) setEquipes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canFilterTeam]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loadingMsgs]);

  const corretores = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const equipe of equipes) {
      if (equipeId !== "__all__" && equipe.id !== equipeId) continue;
      for (const member of equipe.membros) {
        if (!isCorretorLike(member.role) && member.role !== "gerente") continue;
        seen.set(member.id, { id: member.id, name: member.name });
      }
    }
    return [...seen.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes, equipeId]);

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
    if (!canSend || !activeId || !draft.trim() || sending) return;
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
    if (!canSend || !activeId || assuming) return;
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

  async function reloadTags() {
    try {
      setTags(await fetchWhatsappTags());
    } catch {
      /* ignore */
    }
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name || savingTag) return;
    setSavingTag(true);
    try {
      await createWhatsappTag(name);
      setNewTagName("");
      await reloadTags();
      toast.success("Tag criada. Só você vê.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível criar a tag."));
    } finally {
      setSavingTag(false);
    }
  }

  async function handleImportFunil() {
    if (savingTag) return;
    setSavingTag(true);
    try {
      setTags(await importWhatsappTagsFromFunil());
      toast.success("Etapas do funil copiadas para as suas tags.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível puxar as etapas."));
    } finally {
      setSavingTag(false);
    }
  }

  async function handleDeleteTag(id: string) {
    try {
      await deleteWhatsappTag(id);
      if (tagId === id) setTagId(null);
      setTags((prev) => prev.filter((tag) => tag.id !== id));
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          tags: (chat.tags ?? []).filter((tag) => tag.id !== id),
        })),
      );
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível apagar a tag."));
    }
  }

  async function toggleChatTag(next: WhatsappUserTag) {
    if (!activeId) return;
    const on = (active?.tags ?? []).some((tag) => tag.id === next.id);
    try {
      if (on) await detachWhatsappChatTag(activeId, next.id);
      else await attachWhatsappChatTag(activeId, next.id);
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.chatId !== activeId) return chat;
          const current = chat.tags ?? [];
          return {
            ...chat,
            tags: on
              ? current.filter((tag) => tag.id !== next.id)
              : [...current, next],
          };
        }),
      );
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível atualizar a tag."));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border bg-primary/[0.04] grid-rows-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-b bg-primary/[0.03] lg:border-b-0 lg:border-r">
          <div className="shrink-0 space-y-2 border-b bg-primary/[0.04] p-3">
            <div className="flex items-center gap-2">
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
                onClick={() => void loadChats(page)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            {canFilterTeam ? (
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={equipeId}
                  onValueChange={(value) => {
                    setEquipeId(value);
                    setCorretorId("__all__");
                  }}
                >
                  <SelectTrigger className="h-8 border-white/15 bg-transparent px-2 text-xs text-foreground shadow-none">
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as equipes</SelectItem>
                    <SelectItem value="__none__">Sem equipe</SelectItem>
                    {equipes.map((equipe) => (
                      <SelectItem key={equipe.id} value={equipe.id}>
                        {equipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={corretorId} onValueChange={setCorretorId}>
                  <SelectTrigger className="h-8 border-white/15 bg-transparent px-2 text-xs text-foreground shadow-none">
                    <SelectValue placeholder="Corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os corretores</SelectItem>
                    <SelectItem value="__none__">Sem corretor</SelectItem>
                    {corretores.map((corretor) => (
                      <SelectItem key={corretor.id} value={corretor.id}>
                        {corretor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={cn(
                    catalogColorBadgeClass(
                      tag.color,
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    ),
                    tagId === tag.id
                      ? "ring-2 ring-white/80"
                      : "opacity-80 hover:opacity-100",
                  )}
                  onClick={() => setTagId((cur) => (cur === tag.id ? null : tag.id))}
                >
                  {tag.name}
                </button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-[11px]"
                onClick={() => setTagDialog(true)}
              >
                <Tag className="mr-1 h-3 w-3" />
                Tags
              </Button>
            </div>
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
                    activeId === chat.chatId && "bg-primary/10",
                  )}
                  onClick={() => setActiveId(chat.chatId)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
                    {(chat.tags ?? []).length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {(chat.tags ?? []).map((tag) => (
                          <span
                            key={tag.id}
                            className={catalogColorBadgeClass(
                              tag.color,
                              "rounded-full px-1.5 py-px text-[9px] font-semibold",
                            )}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  {chat.unread > 0 ? (
                    <span className="mt-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {chat.unread}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-1 border-t bg-primary/[0.04] px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={loading || page <= 1}
              onClick={() => void loadChats(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-0 truncate text-center text-[11px] text-muted-foreground">
              {total
                ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
                : `Página ${page}`}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={loading || !hasMore}
              onClick={() => void loadChats(page + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          {active ? (
            <>
              <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-primary/[0.04] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {active.leadNome || active.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {active.phone || active.chatId}
                    {active.isGroup ? " · Grupo" : ""}
                    {active.aiPaused ? " · IA pausada" : " · IA ativa"}
                    {loadingMsgs && messages.length > 0 ? " · atualizando" : ""}
                  </p>
                  {tags.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tags.map((tag) => {
                        const on = (active.tags ?? []).some((item) => item.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            className={cn(
                              catalogColorBadgeClass(
                                tag.color,
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              ),
                              on ? "ring-1 ring-white/70" : "opacity-50 hover:opacity-100",
                            )}
                            onClick={() => void toggleChatTag(tag)}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {active.leadId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/funil" search={{ lead: active.leadId }}>
                        Ver lead
                      </Link>
                    </Button>
                  ) : null}
                  {canSend ? (
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
                  ) : null}
                </div>
              </header>
              <div
                ref={scroller}
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]",
                  chatPaneClass,
                )}
                style={chatPaneVars}
              >
                {loadingMsgs && messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Carregando mensagens…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma mensagem neste chat.
                  </p>
                ) : (
                  <div className="mt-auto flex min-h-full flex-col justify-end gap-2">
                  {messages.map((msg) => {
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
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border bg-card",
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
                          {msg.mediaType === "audio" && msg.mediaUrl ? (
                            <WhatsappAudioBubble url={msg.mediaUrl} outgoing={meta.outgoing} />
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
                          {msg.text &&
                          !isMediaPlaceholder(msg.text) ? (
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
                  className="flex shrink-0 items-end gap-2 border-t bg-primary/[0.04] p-3"
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
                <p className="shrink-0 border-t bg-primary/[0.04] px-4 py-3 text-xs text-muted-foreground">
                  Seu perfil só visualiza as conversas dos seus leads.
                </p>
              )}
            </>
          ) : (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground dark:text-white/80",
                chatPaneClass,
              )}
              style={chatPaneVars}
            >
              <FaWhatsapp className="h-10 w-10 text-primary" />
              <p>Selecione uma conversa à esquerda.</p>
            </div>
          )}
        </section>
      </div>
      <Dialog open={tagDialog} onOpenChange={setTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suas tags do WhatsApp</DialogTitle>
            <DialogDescription>
              Só você vê. Crie as suas ou copie as etapas do funil da
              imobiliária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="Nova tag"
                maxLength={40}
              />
              <Button
                type="button"
                disabled={savingTag || !newTagName.trim()}
                onClick={() => void handleCreateTag()}
              >
                Criar
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={savingTag}
              onClick={() => void handleImportFunil()}
            >
              Puxar etapas do funil
            </Button>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tag ainda.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                  >
                    <span
                      className={catalogColorBadgeClass(
                        tag.color,
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      )}
                    >
                      {tag.name}
                      {tag.source === "funil" ? " · funil" : ""}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => void handleDeleteTag(tag.id)}
                      aria-label={`Apagar ${tag.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTagDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
