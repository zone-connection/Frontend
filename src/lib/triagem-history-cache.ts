import type { TriagemEvent } from "@/lib/triagem-api";
import { fetchTriagemHistory } from "@/lib/triagem-api";

/** Cache em memória do histórico — sobrevive à navegação entre rotas na sessão. */
const historyCache = new Map<string, TriagemEvent[]>();
const inflight = new Map<string, Promise<TriagemEvent[]>>();

export function getTriagemHistoryCached(
  leadId: string,
): TriagemEvent[] | undefined {
  return historyCache.get(leadId);
}

export function setTriagemHistoryCached(
  leadId: string,
  events: TriagemEvent[],
) {
  historyCache.set(leadId, events);
}

export function prependTriagemHistoryCached(
  leadId: string,
  event: TriagemEvent | TriagemEvent[],
) {
  const incoming = Array.isArray(event) ? event : [event];
  const ids = new Set(incoming.map((e) => e.id));
  const prev = historyCache.get(leadId) ?? [];
  historyCache.set(leadId, [
    ...incoming,
    ...prev.filter((e) => !ids.has(e.id)),
  ]);
}

export function replaceTriagemHistoryCached(
  leadId: string,
  event: TriagemEvent,
) {
  const prev = historyCache.get(leadId) ?? [];
  historyCache.set(
    leadId,
    prev.map((e) => (e.id === event.id ? event : e)),
  );
}

/**
 * Retorna histórico: cache imediato se houver; sempre revalida em background.
 * `onUpdate` é chamado quando a rede responde.
 */
export async function loadTriagemHistory(
  leadId: string,
  onUpdate?: (events: TriagemEvent[]) => void,
): Promise<TriagemEvent[]> {
  const cached = historyCache.get(leadId);
  if (cached) onUpdate?.(cached);

  let pending = inflight.get(leadId);
  if (!pending) {
    pending = fetchTriagemHistory(leadId)
      .then((data) => {
        historyCache.set(leadId, data.events);
        return data.events;
      })
      .finally(() => {
        inflight.delete(leadId);
      });
    inflight.set(leadId, pending);
  }

  const events = await pending;
  onUpdate?.(events);
  return events;
}
