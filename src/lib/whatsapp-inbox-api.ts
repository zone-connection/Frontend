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

export async function fetchWhatsappInboxChats() {
  return apiFetch<{
    available: boolean;
    instanceId: number;
    chats: WhatsappInboxChat[];
  }>("/whatsapp/chats");
}

function chatPath(chatId: string) {
  return encodeURIComponent(chatId);
}

const MSG_CACHE_PREFIX = "crm-whatsapp-inbox-msgs:";

export function readWhatsappMessagesCache(chatId: string) {
  try {
    const raw = sessionStorage.getItem(`${MSG_CACHE_PREFIX}${chatId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WhatsappInboxMessage[];
    return Array.isArray(parsed) ? parsed : null;
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

export async function fetchWhatsappInboxMessages(chatId: string) {
  return apiFetch<{
    available: boolean;
    chatId: string;
    messages: WhatsappInboxMessage[];
  }>(`/whatsapp/chats/${chatPath(chatId)}/messages`);
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
