import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Pencil,
  RefreshCw,
  Trash2,
  Search,
  Send,
  Tag,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATALOG_COLORS,
  DEFAULT_CATALOG_COLOR,
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  catalogColorSwatchStyle,
  sameCatalogColor,
} from "@/lib/catalog-colors";
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
  deleteWhatsappInboxMessage,
  editWhatsappInboxMessage,
  fetchWhatsappInboxChats,
  fetchWhatsappInboxMessages,
  isCrmWhatsappLeadNotifyChat,
  fetchWhatsappTags,
  importWhatsappTagsFromFunil,
  readWhatsappMessagesCache,
  updateWhatsappTag,
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
import { chatPaneClass, chatPaneVars } from "@/components/whatsapp-chat-look";
import {
  WhatsappMessageBubble,
  WhatsappMessageDetailsDialog,
  WhatsappMessageEditDialog,
} from "@/components/whatsapp-message-bubble";

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

function tagChipProps(color: string, extra?: string) {
  return {
    className: cn(
      catalogColorBadgeClass(color),
      "h-auto w-auto max-w-[9rem] shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      extra,
    ),
    style: catalogColorBadgeStyle(color),
  };
}

function ChatTagPicker({
  assigned,
  tags,
  onToggle,
  onManage,
  compact,
}: {
  assigned: WhatsappUserTag[];
  tags: WhatsappUserTag[];
  onToggle: (tag: WhatsappUserTag) => void;
  onManage: () => void;
  compact?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={compact ? "ghost" : "outline"}
          size="sm"
          className={cn(
            compact ? "h-8 w-8 shrink-0 px-0" : "h-8 shrink-0",
            assigned.length > 0 && compact && "text-primary",
          )}
          title="Atribuir tag"
          onClick={(event) => event.stopPropagation()}
        >
          <Tag className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
          {compact ? null : "Tag"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 space-y-2 p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="px-1 text-[11px] font-medium text-muted-foreground">
          Atribuir tag a esta conversa
        </p>
        {tags.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">
            Crie uma tag primeiro.
          </p>
        ) : (
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {tags.map((tag) => {
              const on = assigned.some((item) => item.id === tag.id);
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-muted"
                    onClick={() => onToggle(tag)}
                  >
                    <span
                      {...tagChipProps(
                        tag.color,
                        "min-w-0 flex-1 truncate text-[11px]",
                      )}
                    >
                      {tag.name}
                    </span>
                    {on ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full text-[11px]"
          onClick={onManage}
        >
          Gerenciar tags
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function TagColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATALOG_COLORS.map((color) => {
        const selected = sameCatalogColor(value, color);
        return (
          <button
            key={color}
            type="button"
            title={color}
            aria-label="Escolher cor"
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={cn(
              "h-6 w-6 rounded-md border-2 transition",
              selected ? "scale-110 border-foreground" : "border-transparent",
            )}
            style={catalogColorSwatchStyle(color)}
          />
        );
      })}
    </div>
  );
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
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_CATALOG_COLOR);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState<string>(DEFAULT_CATALOG_COLOR);
  const [savingTag, setSavingTag] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState<WhatsappInboxChat[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappInboxMessage[]>([]);
  const [detailMsg, setDetailMsg] = useState<WhatsappInboxMessage | null>(null);
  const [editMsg, setEditMsg] = useState<WhatsappInboxMessage | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingMsg, setSavingMsg] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const loadGen = useRef(0);
  const stickToBottom = useRef(true);
  const pageSize = 50;
  const user = getSession();
  const [canSend, setCanSend] = useState(
    canSendWhatsappInbox(user?.role, user?.tenant?.modules ?? null),
  );
  const canFilterTeam =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "gerente";
  const cacheKey = `crm-whatsapp-inbox-chats-v3:${user?.id ?? "anon"}`;

  const active = chats.find((chat) => chat.chatId === activeId) ?? null;

  function sortChats(list: WhatsappInboxChat[]) {
    return list.slice().sort((a, b) => {
      const left = a.lastMessageAt ?? "";
      const right = b.lastMessageAt ?? "";
      return right.localeCompare(left);
    });
  }

  async function loadChats(nextPage = page, silent = false) {
    if (!silent && chats.length === 0) setLoading(true);
    try {
      const result = await fetchWhatsappInboxChats(nextPage, pageSize, {
        ...(equipeId !== "__all__" ? { equipeId } : {}),
        ...(corretorId !== "__all__" ? { corretorId } : {}),
        ...(tagId ? { tagId } : {}),
      });
      if (typeof result.canSend === "boolean") setCanSend(result.canSend);
      const next = sortChats(
        result.chats.filter((chat) => !isCrmWhatsappLeadNotifyChat(chat)),
      );
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
      if (!silent) {
        toast.error(errorMessage(err, "Não foi possível listar as conversas."));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadMessages(chatId: string, silent = false) {
    const gen = silent ? loadGen.current : ++loadGen.current;
    const cached = readWhatsappMessagesCache(chatId);
    if (!silent) {
      if (cached && cached.length > 0) {
        setMessages(cached);
        setLoadingMsgs(false);
      } else {
        setMessages([]);
        setLoadingMsgs(true);
      }
    }
    try {
      const result = await fetchWhatsappInboxMessages(chatId);
      if (gen !== loadGen.current) return;
      setMessages((prev) => {
        if (
          silent &&
          prev.length === result.messages.length &&
          prev.every(
            (msg, i) =>
              msg.id === result.messages[i]?.id &&
              msg.text === result.messages[i]?.text &&
              msg.delivery === result.messages[i]?.delivery,
          )
        ) {
          return prev;
        }
        return result.messages;
      });
      writeWhatsappMessagesCache(chatId, result.messages);
    } catch (err) {
      if (gen !== loadGen.current) return;
      if (!silent) {
        toast.error(errorMessage(err, "Não foi possível abrir a conversa."));
        if (!cached?.length) setMessages([]);
      }
    } finally {
      if (!silent && gen === loadGen.current) setLoadingMsgs(false);
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
          setChats(
            sortChats(list.filter((chat) => !isCrmWhatsappLeadNotifyChat(chat))),
          );
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
    const tick = () => {
      if (document.hidden) return;
      void loadChats(page, true);
      if (activeId) void loadMessages(activeId, true);
    };
    const timer = window.setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [activeId, page, equipeId, corretorId, tagId]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !stickToBottom.current) return;
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

  async function saveEditedMessage() {
    if (!canSend || !activeId || !editMsg || savingMsg) return;
    const text = editDraft.trim();
    if (!text) return;
    setSavingMsg(true);
    try {
      await editWhatsappInboxMessage(activeId, editMsg.id, text);
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

  async function removeMessage(msg: WhatsappInboxMessage) {
    if (!canSend || !activeId) return;
    if (!window.confirm("Excluir esta mensagem no WhatsApp?")) return;
    try {
      await deleteWhatsappInboxMessage(activeId, msg.id);
      setMessages((prev) => prev.filter((item) => item.id !== msg.id));
      toast.success("Mensagem excluída.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir a mensagem."));
    }
  }

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
      stickToBottom.current = true;
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
      await createWhatsappTag(name, newTagColor);
      setNewTagName("");
      setNewTagColor(DEFAULT_CATALOG_COLOR);
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

  function applyTagUpdate(updated: WhatsappUserTag) {
    setTags((prev) =>
      prev.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag)),
    );
    setChats((prev) =>
      prev.map((chat) => ({
        ...chat,
        tags: (chat.tags ?? []).map((tag) =>
          tag.id === updated.id ? { ...tag, name: updated.name, color: updated.color } : tag,
        ),
      })),
    );
  }

  async function handleSaveEditTag() {
    if (!editingTagId || savingTag) return;
    const name = editTagName.trim();
    if (!name) return;
    setSavingTag(true);
    try {
      const updated = await updateWhatsappTag(editingTagId, {
        name,
        color: editTagColor,
      });
      applyTagUpdate(updated);
      setEditingTagId(null);
      toast.success("Tag atualizada.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível editar a tag."));
    } finally {
      setSavingTag(false);
    }
  }

  async function handleDeleteTag(id: string) {
    const tag = tags.find((item) => item.id === id);
    if (
      !window.confirm(
        `Excluir a tag "${tag?.name ?? ""}"? Ela sai de todas as conversas.`,
      )
    ) {
      return;
    }
    try {
      await deleteWhatsappTag(id);
      if (tagId === id) setTagId(null);
      if (editingTagId === id) setEditingTagId(null);
      setTags((prev) => prev.filter((item) => item.id !== id));
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          tags: (chat.tags ?? []).filter((item) => item.id !== id),
        })),
      );
      toast.success("Tag excluída.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir a tag."));
    }
  }

  async function toggleChatTag(chatId: string, next: WhatsappUserTag) {
    const chat = chats.find((item) => item.chatId === chatId);
    const on = (chat?.tags ?? []).some((tag) => tag.id === next.id);
    try {
      if (on) await detachWhatsappChatTag(chatId, next.id);
      else await attachWhatsappChatTag(chatId, next.id);
      setChats((prev) =>
        prev.map((item) => {
          if (item.chatId !== chatId) return item;
          const current = item.tags ?? [];
          return {
            ...item,
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
                  {...tagChipProps(
                    tag.color,
                    tagId === tag.id
                      ? "ring-2 ring-white/80"
                      : "opacity-90 hover:opacity-100",
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
                <div
                  key={chat.chatId}
                  className={cn(
                    "flex items-start gap-1 border-b hover:bg-muted/50",
                    activeId === chat.chatId && "bg-primary/10",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left"
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
                              {...tagChipProps(tag.color, "px-1.5 py-px text-[9px]")}
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
                  <div className="shrink-0 py-2 pr-1">
                    <ChatTagPicker
                      compact
                      assigned={chat.tags ?? []}
                      tags={tags}
                      onToggle={(tag) => void toggleChatTag(chat.chatId, tag)}
                      onManage={() => setTagDialog(true)}
                    />
                  </div>
                </div>
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
                  {(active.tags ?? []).length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(active.tags ?? []).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          {...tagChipProps(tag.color)}
                          title="Remover tag"
                          onClick={() => void toggleChatTag(active.chatId, tag)}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ChatTagPicker
                    assigned={active.tags ?? []}
                    tags={tags}
                    onToggle={(tag) => void toggleChatTag(active.chatId, tag)}
                    onManage={() => setTagDialog(true)}
                  />
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
                onScroll={(event) => {
                  const el = event.currentTarget;
                  stickToBottom.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 96;
                }}
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
                      <WhatsappMessageBubble
                        key={msg.id}
                        message={msg}
                        label={meta.label}
                        outgoing={meta.outgoing}
                        canMutate={canSend && meta.outgoing}
                        onDetails={() => setDetailMsg(msg)}
                        onEdit={() => {
                          setEditMsg(msg);
                          setEditDraft(msg.text);
                        }}
                        onDelete={() => void removeMessage(msg)}
                      />
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
      <Dialog
        open={tagDialog}
        onOpenChange={(open) => {
          setTagDialog(open);
          if (!open) setEditingTagId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suas tags do WhatsApp</DialogTitle>
            <DialogDescription>
              Só você vê. Crie, edite, escolha a cor ou exclua.
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
            <TagColorPicker value={newTagColor} onChange={setNewTagColor} />
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
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="space-y-2 rounded-md border px-2 py-1.5"
                  >
                    {editingTagId === tag.id ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            value={editTagName}
                            onChange={(event) => setEditTagName(event.target.value)}
                            maxLength={40}
                            className="h-8"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={savingTag || !editTagName.trim()}
                            onClick={() => void handleSaveEditTag()}
                          >
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            disabled={savingTag}
                            onClick={() => void handleDeleteTag(tag.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Excluir
                          </Button>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingTagId(null)}
                            aria-label="Cancelar edição"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <TagColorPicker
                          value={editTagColor}
                          onChange={setEditTagColor}
                        />
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span {...tagChipProps(tag.color, "text-[11px]")}>
                          {tag.name}
                          {tag.source === "funil" ? " · funil" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => {
                              setEditingTagId(tag.id);
                              setEditTagName(tag.name);
                              setEditTagColor(tag.color || DEFAULT_CATALOG_COLOR);
                            }}
                            aria-label={`Editar ${tag.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                            onClick={() => void handleDeleteTag(tag.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        </span>
                      </div>
                    )}
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
