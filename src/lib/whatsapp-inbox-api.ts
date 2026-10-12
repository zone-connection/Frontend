import { apiFetch } from "@/lib/api";

export type WhatsappBubbleKind = "client" | "ai" | "agent" | "follow_up";

export type WhatsappInboxMessage = {
  id: string;
  direction: "in" | "out";
  kind: WhatsappBubbleKind;
  text: string;
  at: string | null;
  source: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
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
};

export async function fetchWhatsappInboxChats(page = 1, limit = 50) {
  return apiFetch<{
    available: boolean;
    instanceId: number;
    page: number;
    limit: number;
    total: number | null;
    hasMore: boolean;
    canSend?: boolean;
    chats: WhatsappInboxChat[];
  }>(`/whatsapp/chats?page=${page}&limit=${limit}`);
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
