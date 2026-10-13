import { apiFetch } from "@/lib/api";

export type WhatsappBubbleKind = "client" | "ai" | "agent" | "follow_up";

export type WhatsappDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsappInboxMessage = {
  id: string;
  direction: "in" | "out";
  kind: WhatsappBubbleKind;
  text: string;
  at: string | null;
  source: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  delivery?: WhatsappDeliveryStatus | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  error?: string | null;
};

export type WhatsappInboxChat = {
  chatId: string;
  name: string;
  phone: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  isGroup: boolean;
  aiPaused: boolean;
  pausedUntil: string | null;
  leadStatus: string | null;
  leadId: string | null;
  leadNome: string | null;
  tags?: WhatsappUserTag[];
};

export function isCrmWhatsappLeadNotifyChat(chat: {
  lastMessage?: string | null;
  name?: string | null;
}) {
  const text = `${chat.lastMessage ?? ""} ${chat.name ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    /abra (o|no) crm/.test(text) ||
    /voce recebeu\s+\d+\s+leads? novos?/.test(text) ||
    /novo lead no pool/.test(text) ||
    /novo lead atribuido/.test(text) ||
    /\d+\s+leads? no pool da equipe/.test(text) ||
    /funil\?lead=/.test(text)
  );
}

export type WhatsappUserTag = {
  id: string;
  name: string;
  color: string;
  source?: string;
  funilSlug?: string | null;
};

export async function fetchWhatsappInboxChats(
  page = 1,
  limit = 50,
  filters?: { corretorId?: string; equipeId?: string; tagId?: string },
) {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filters?.corretorId) qs.set("corretorId", filters.corretorId);
  if (filters?.equipeId) qs.set("equipeId", filters.equipeId);
  if (filters?.tagId) qs.set("tagId", filters.tagId);
  return apiFetch<{
    available: boolean;
    instanceId: number;
    page: number;
    limit: number;
    total: number | null;
    hasMore: boolean;
    canSend?: boolean;
    chats: WhatsappInboxChat[];
  }>(`/whatsapp/chats?${qs.toString()}`);
}

function chatPath(chatId: string) {
  return encodeURIComponent(chatId);
}

const MSG_CACHE_PREFIX = "crm-whatsapp-inbox-msgs-v2:";

export function unwrapWhatsappMediaUrl(url: string | null): string | null {
  if (!url) return null;
  const match = /[?&]url=([^&]+)/.exec(url);
  if (match?.[1]) {
    try {
      let inner = match[1];
      for (let i = 0; i < 2; i += 1) {
        if (/%[0-9A-Fa-f]{2}/.test(inner)) inner = decodeURIComponent(inner);
      }
      if (/^https?:\/\//i.test(inner)) return inner;
    } catch {
      /* ignore */
    }
  }
  return url;
}

function withUnwrappedMedia(messages: WhatsappInboxMessage[]) {
  return messages.map((message) => ({
    ...message,
    mediaUrl: unwrapWhatsappMediaUrl(message.mediaUrl),
  }));
}

export function readWhatsappMessagesCache(chatId: string) {
  try {
    const raw = sessionStorage.getItem(`${MSG_CACHE_PREFIX}${chatId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WhatsappInboxMessage[];
    return Array.isArray(parsed) ? withUnwrappedMedia(parsed) : null;
  } catch {
    return null;
  }
}

export function writeWhatsappMessagesCache(
  chatId: string,
  messages: WhatsappInboxMessage[],
) {
  try {
    sessionStorage.setItem(
      `${MSG_CACHE_PREFIX}${chatId}`,
      JSON.stringify(messages),
    );
  } catch {
    /* ignore */
  }
}

export async function transcribeWhatsappAudio(url: string) {
  return apiFetch<{ text: string }>("/whatsapp/media/transcribe", {
    method: "POST",
    body: { url: unwrapWhatsappMediaUrl(url) ?? url },
  });
}

export async function fetchWhatsappInboxMessages(chatId: string) {
  const result = await apiFetch<{
    available: boolean;
    chatId: string;
    messages: WhatsappInboxMessage[];
  }>(`/whatsapp/chats/${chatPath(chatId)}/messages`);
  return {
    ...result,
    messages: withUnwrappedMedia(result.messages ?? []),
  };
}

export async function sendWhatsappInboxMessage(chatId: string, content: string) {
  return apiFetch<{ ok: true; aiPaused: true }>(
    `/whatsapp/chats/${chatPath(chatId)}/messages`,
    { method: "POST", body: { content } },
  );
}

export async function editWhatsappInboxMessage(
  chatId: string,
  messageId: string,
  content: string,
) {
  return apiFetch<{ ok: true }>(
    `/whatsapp/chats/${chatPath(chatId)}/messages/${encodeURIComponent(messageId)}`,
    { method: "PATCH", body: { content } },
  );
}

export async function assumeWhatsappInboxChat(chatId: string) {
  return apiFetch<{ ok: true; aiPaused: true }>(
    `/whatsapp/chats/${chatPath(chatId)}/assume`,
    { method: "POST" },
  );
}

export async function resumeWhatsappInboxChat(chatId: string) {
  return apiFetch<{ ok: true; aiPaused: false }>(
    `/whatsapp/chats/${chatPath(chatId)}/resume`,
    { method: "POST" },
  );
}

export async function fetchWhatsappTags() {
  return apiFetch<WhatsappUserTag[]>("/whatsapp/tags");
}

export async function createWhatsappTag(name: string, color?: string) {
  return apiFetch<WhatsappUserTag>("/whatsapp/tags", {
    method: "POST",
    body: { name, color },
  });
}

export async function updateWhatsappTag(
  tagId: string,
  input: { name?: string; color?: string },
) {
  return apiFetch<WhatsappUserTag>(`/whatsapp/tags/${tagId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function importWhatsappTagsFromFunil() {
  return apiFetch<WhatsappUserTag[]>("/whatsapp/tags/from-funil", {
    method: "POST",
  });
}

export async function deleteWhatsappTag(tagId: string) {
  return apiFetch<{ ok: true }>(`/whatsapp/tags/${tagId}`, { method: "DELETE" });
}

export async function attachWhatsappChatTag(chatId: string, tagId: string) {
  return apiFetch<{ ok: true }>(`/whatsapp/chats/${chatPath(chatId)}/tags`, {
    method: "POST",
    body: { tagId },
  });
}

export async function detachWhatsappChatTag(chatId: string, tagId: string) {
  return apiFetch<{ ok: true }>(
    `/whatsapp/chats/${chatPath(chatId)}/tags/${tagId}`,
    { method: "DELETE" },
  );
}
