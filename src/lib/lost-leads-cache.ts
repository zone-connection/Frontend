import { fetchLostLeads, mapApiLead, type ApiLead } from "@/lib/leads-api";
import type { Lead } from "@/lib/crm-types";

export type LostLead = Lead & {
  motivoPerda: string;
  perdidoAt: string;
  perdidoPor: string;
  perdidoPorRole: string | null;
};

export function corretorNaPerda(lead: LostLead): string {
  if (
    (lead.perdidoPorRole === "admin" || lead.perdidoPorRole === "super_admin") &&
    lead.perdidoPor !== "—"
  ) {
    return `${lead.perdidoPor} deu a perda`;
  }
  return lead.corretor;
}

const CACHE_KEY = "crm_lost_leads_cache_v2";

let memoryCache: LostLead[] | null = null;

function formatPerdidoAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

export function mapLostLead(api: ApiLead): LostLead {
  const base = mapApiLead(api);
  return {
    ...base,
    motivoPerda: api.motivoPerda ?? "—",
    perdidoAt: formatPerdidoAt(api.perdidoAt),
    perdidoPor: api.perdidoPor?.name ?? "—",
    perdidoPorRole: api.perdidoPor?.role ?? null,
  };
}

function readSessionCache(): LostLead[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LostLead[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(leads: LostLead[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(leads));
  } catch {
    // quota / private mode — ignore
  }
}

/** Cache em memória (+ sessionStorage) para abrir a tela sem esperar a API. */
export function getLostLeadsCache(): LostLead[] | null {
  if (memoryCache) return memoryCache;
  const fromSession = readSessionCache();
  if (fromSession) {
    memoryCache = fromSession;
    return fromSession;
  }
  return null;
}

export function setLostLeadsCache(leads: LostLead[]) {
  memoryCache = leads;
  writeSessionCache(leads);
}

export function removeLostLeadFromCache(id: string) {
  const current = getLostLeadsCache();
  if (!current) return;
  setLostLeadsCache(current.filter((l) => l.id !== id));
}

export function removeLostLeadsFromCache(ids: string[]) {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const current = getLostLeadsCache();
  if (!current) return;
  setLostLeadsCache(current.filter((l) => !drop.has(l.id)));
}

/** Após marcar como perdido, injeta no cache para a lista abrir já atualizada. */
export function prependLostLeadToCache(api: ApiLead) {
  const item = mapLostLead(api);
  const current = getLostLeadsCache() ?? [];
  setLostLeadsCache([item, ...current.filter((l) => l.id !== item.id)]);
}

export function invalidateLostLeadsCache() {
  memoryCache = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CACHE_KEY);
  }
}

export async function loadLostLeads(options?: {
  force?: boolean;
}): Promise<LostLead[]> {
  if (!options?.force) {
    const cached = getLostLeadsCache();
    if (cached) return cached;
  }

  const pageSize = 200;
  const first = await fetchLostLeads({ page: 1, limit: pageSize });
  const all = [...first.data];
  const totalPages = Math.max(1, first.meta.totalPages);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetchLostLeads({ page: i + 2, limit: pageSize }),
      ),
    );
    for (const page of rest) all.push(...page.data);
  }

  const mapped = all.map(mapLostLead);
  setLostLeadsCache(mapped);
  return mapped;
}
