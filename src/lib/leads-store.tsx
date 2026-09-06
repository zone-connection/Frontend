import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lead, StageId } from "@/lib/crm-types";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  createLead,
  deleteLeadApi,
  fetchLeadAssignees,
  fetchLeads,
  mapApiLead,
  markLeadLostApi,
  markLeadsLostBulkApi,
  updateLeadApi,
  updateLeadStageApi,
  type CreateLeadInput,
  type LeadAssignee,
  type UpdateLeadInput,
} from "@/lib/leads-api";
import {
  fetchDocumentacoes,
  type Documentacao,
} from "@/lib/documentacao-api";
import { prependLostLeadToCache, invalidateLostLeadsCache } from "@/lib/lost-leads-cache";
import {
  prependLostClienteToCache,
  invalidateLostClientesCache,
} from "@/lib/lost-clientes-cache";

const LEGACY_STORAGE_KEY = "crm_mock_leads";

export type { LeadAssignee };

/** Status 1/2 mais recente por lead (Documentação). */
function latestDocStatusByLeadId(docs: Documentacao[]) {
  const map = new Map<
    string,
    { status1: string; status2: string; updatedAt: string }
  >();
  for (const doc of docs) {
    if (!doc.leadId) continue;
    const prev = map.get(doc.leadId);
    if (!prev || doc.updatedAt > prev.updatedAt) {
      map.set(doc.leadId, {
        status1: doc.status1,
        status2: doc.status2,
        updatedAt: doc.updatedAt,
      });
    }
  }
  return map;
}

function applyDocStatusToLead(
  lead: Lead,
  byLead: Map<string, { status1: string; status2: string; updatedAt: string }>,
): Lead {
  const fromDoc = byLead.get(lead.id);
  if (!fromDoc) return lead;
  return {
    ...lead,
    documentacaoStatus1: fromDoc.status1,
    documentacaoStatus2: fromDoc.status2,
  };
}

type LeadsContextValue = {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  /** Usuários ativos para atribuição (vindo de GET /leads/assignees). */
  assignees: LeadAssignee[];
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  requestLeads: () => void;
  resolveCorretorId: (nome: string) => string | undefined;
  addLead: (input: CreateLeadInput) => Promise<Lead>;
  updateLead: (
    id: string,
    patch: UpdateLeadInput & { corretor?: string },
  ) => Promise<Lead>;
  updateLeadStage: (
    id: string,
    stage: StageId,
    extra?: {
      construtoraId?: string;
      empreendimentoId?: string;
      omitTriagem?: boolean;
      temEntrada?: boolean;
      valorEntrada?: number | null;
      temFgts?: boolean;
      valorFgts?: number | null;
      temDependente?: boolean;
    },
  ) => Promise<Lead>;
  applyLead: (lead: Lead) => void;
  /** Marca como perdido (sai das listas operacionais). */
  markLeadLost: (id: string, motivo: string) => Promise<void>;
  /** Soft-delete em lote (um request por até 500 ids). */
  markLeadsLost: (ids: string[], motivo: string) => Promise<{
    updated: number;
    skipped: number;
  }>;
  /** Exclusão definitiva (admin, lead já perdido). */
  deleteLead: (id: string) => Promise<void>;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

function clearLegacyStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function buildOptimisticLead(
  input: CreateLeadInput,
  assignees: LeadAssignee[],
): Lead {
  const session = getSession();
  const assignee =
    (input.corretorId
      ? assignees.find((a) => a.id === input.corretorId)
      : null) ?? (session ? assignees.find((a) => a.id === session.id) : null);

  return {
    id: `temp-${crypto.randomUUID()}`,
    tipo: input.tipo === "cliente" ? "cliente" : "lead",
    nome: input.nome,
    telefone: input.telefone,
    email: input.email,
    origem: input.origem,
    interesse: input.interesse,
    cidade: input.cidade,
    bairro: input.bairro,
    corretor: assignee?.name ?? session?.name ?? "—",
    corretorId: input.corretorId ?? assignee?.id ?? session?.id ?? null,
    stage: input.stage ?? "novo",
    prioridade: input.prioridade ?? "Média",
    renda: input.renda ?? null,
    tipoRenda: input.tipoRenda ?? null,
    estadoCivil: input.estadoCivil ?? null,
    cpf: input.cpf ?? null,
    rg: input.rg ?? null,
    endereco: input.endereco ?? null,
    cep: input.cep ?? null,
    orcamentoMax: input.orcamentoMax ?? null,
    quartosMin: input.quartosMin ?? null,
    vagasMin: input.vagasMin ?? null,
    updatedAt: todayLabel(),
    tags: input.tags ?? [],
  };
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wanted, setWanted] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const pageSize = 200;
      const [first, team] = await Promise.all([
        fetchLeads({ page: 1, limit: pageSize }),
        fetchLeadAssignees(),
      ]);
      setAssignees(
        [...team].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
      setLeads(first.data.map(mapApiLead));
      setLoading(false);

      const totalPages = Math.max(1, first.meta.totalPages);
      const [rest, docs] = await Promise.all([
        totalPages > 1
          ? Promise.all(
              Array.from({ length: totalPages - 1 }, (_, i) =>
                fetchLeads({ page: i + 2, limit: pageSize }),
              ),
            )
          : Promise.resolve([]),
        fetchDocumentacoes().catch(() => [] as Documentacao[]),
      ]);
      const all = [...first.data];
      for (const page of rest) all.push(...page.data);
      const docStatusByLead = latestDocStatusByLeadId(docs);
      setLeads(
        all
          .map(mapApiLead)
          .map((lead) => applyDocStatusToLead(lead, docStatusByLead)),
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os leads.";
      setError(message);
      setLoading(false);
    }
  }, []);

  const requestLeads = useCallback(() => {
    setWanted(true);
  }, []);

  useEffect(() => {
    clearLegacyStorage();
  }, []);

  useEffect(() => {
    if (!wanted) return;
    void refresh();
  }, [wanted, refresh]);

  const resolveCorretorId = useCallback(
    (nome: string) => assignees.find((a) => a.name === nome)?.id,
    [assignees],
  );

  const addLead = useCallback(
    async (input: CreateLeadInput) => {
      const optimistic = buildOptimisticLead(input, assignees);
      setLeads((prev) => [optimistic, ...prev]);

      try {
        const created = await createLead(input);
        const mapped = mapApiLead(created);
        setLeads((prev) =>
          prev.map((l) => (l.id === optimistic.id ? mapped : l)),
        );
        return mapped;
      } catch (err) {
        setLeads((prev) => prev.filter((l) => l.id !== optimistic.id));
        throw err;
      }
    },
    [assignees],
  );

  const updateLead = useCallback(
    async (id: string, patch: UpdateLeadInput & { corretor?: string }) => {
      const { corretor, corretorId, equipeId, createdAt, ...rest } = patch;
      const body: UpdateLeadInput = {
        ...rest,
        ...(createdAt !== undefined ? { createdAt } : {}),
      };

      if (corretorId !== undefined) {
        body.corretorId = corretorId;
      } else if (corretor) {
        const resolved = resolveCorretorId(corretor);
        if (resolved) body.corretorId = resolved;
      }
      if (equipeId !== undefined) {
        body.equipeId = equipeId;
      }

      const previous = leads.find((l) => l.id === id);
      if (previous) {
        const assigneeName =
          body.corretorId != null
            ? (assignees.find((a) => a.id === body.corretorId)?.name ??
              previous.corretor)
            : body.corretorId === null
              ? "—"
              : corretor
                ? corretor
                : previous.corretor;

        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...rest,
                  ...(createdAt ? { createdAt } : {}),
                  ...(body.corretorId !== undefined
                    ? { corretorId: body.corretorId, corretor: assigneeName }
                    : {}),
                  ...(body.equipeId !== undefined
                    ? { equipeId: body.equipeId }
                    : {}),
                  ...(corretor && body.corretorId === undefined
                    ? { corretor }
                    : {}),
                  updatedAt: todayLabel(),
                }
              : l,
          ),
        );
      }

      try {
        const updated = await updateLeadApi(id, body);
        const mapped = mapApiLead(updated);
        setLeads((prev) => prev.map((l) => (l.id === id ? mapped : l)));
        return mapped;
      } catch (err) {
        if (previous) {
          setLeads((prev) => prev.map((l) => (l.id === id ? previous : l)));
        }
        throw err;
      }
    },
    [assignees, leads, resolveCorretorId],
  );

  const updateLeadStage = useCallback(
    async (
      id: string,
      stage: StageId,
      extra?: {
        construtoraId?: string;
        empreendimentoId?: string;
        omitTriagem?: boolean;
      },
    ) => {
      const previous = leads.find((l) => l.id === id);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, stage, updatedAt: todayLabel() } : l,
        ),
      );

      try {
        const updated = await updateLeadStageApi(id, stage, extra);
        const mapped = mapApiLead(updated);
        setLeads((prev) => prev.map((l) => (l.id === id ? mapped : l)));
        return mapped;
      } catch (err) {
        if (previous) {
          setLeads((prev) => prev.map((l) => (l.id === id ? previous : l)));
        }
        throw err;
      }
    },
    [leads],
  );

  const applyLead = useCallback((lead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
  }, []);

  const markLeadLost = useCallback(async (id: string, motivo: string) => {
    let previous: Lead | undefined;
    setLeads((prev) => {
      previous = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });

    try {
      const api = await markLeadLostApi(id, motivo);
      if (api.tipo === "cliente") {
        prependLostClienteToCache(api);
      } else {
        prependLostLeadToCache(api);
      }
    } catch (err) {
      if (previous) {
        setLeads((prev) => [previous!, ...prev]);
      }
      throw err;
    }
  }, []);

  const markLeadsLost = useCallback(async (ids: string[], motivo: string) => {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return { updated: 0, skipped: 0 };
    const drop = new Set(unique);
    const removed: Lead[] = [];
    setLeads((prev) => {
      const keep: Lead[] = [];
      for (const l of prev) {
        if (drop.has(l.id)) removed.push(l);
        else keep.push(l);
      }
      return keep;
    });

    try {
      const result = await markLeadsLostBulkApi(unique, motivo);
      invalidateLostLeadsCache();
      invalidateLostClientesCache();
      const done = new Set(result.ids);
      if (result.skipped > 0) {
        const restore = removed.filter((l) => !done.has(l.id));
        if (restore.length > 0) {
          setLeads((prev) => [...restore, ...prev]);
        }
      }
      return { updated: result.updated, skipped: result.skipped };
    } catch (err) {
      setLeads((prev) => {
        const existing = new Set(prev.map((l) => l.id));
        return [...removed.filter((l) => !existing.has(l.id)), ...prev];
      });
      throw err;
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    let previous: Lead | undefined;
    setLeads((prev) => {
      previous = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });

    try {
      await deleteLeadApi(id);
    } catch (err) {
      if (previous) {
        setLeads((prev) => [previous!, ...prev]);
      }
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      leads,
      loading,
      error,
      assignees,
      refresh,
      requestLeads,
      resolveCorretorId,
      addLead,
      updateLead,
      updateLeadStage,
      applyLead,
      markLeadLost,
      markLeadsLost,
      deleteLead,
    }),
    [
      leads,
      loading,
      error,
      assignees,
      refresh,
      requestLeads,
      resolveCorretorId,
      addLead,
      updateLead,
      updateLeadStage,
      applyLead,
      markLeadLost,
      markLeadsLost,
      deleteLead,
    ],
  );

  return (
    <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  useEffect(() => {
    ctx.requestLeads();
  }, [ctx.requestLeads]);
  return ctx;
}
