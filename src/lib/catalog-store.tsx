import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api";
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalog,
  installDefaultFunnelStages,
  reorderCatalog,
  updateCatalogItem,
  type CatalogItem,
  type CatalogType,
  type CreateCatalogInput,
  type FunilEtapaPapel,
  type GroupedCatalog,
  type UpdateCatalogInput,
} from "@/lib/catalog-api";
import {
  DEFAULT_CATALOG_COLOR,
  normalizeCatalogColor,
} from "@/lib/catalog-colors";
import type { FunilEtapa } from "@/lib/funis-api";
import {
  normalizeDocStatus,
  statusesMatch,
} from "@/lib/documentacao-status";

/** Etapa do funil normalizada para as telas (id = slug). */
export type FunnelStage = {
  id: string;
  name: string;
  color: string;
  papel: FunilEtapaPapel | null;
};

/** Slug legado da etapa inicial (fallback). */
export const INITIAL_STAGE_SLUG = "novo";

const LEGACY_PAPEL_BY_SLUG: Record<string, FunilEtapaPapel> = {
  novo: "inicial",
  "em-analise": "analise",
  "ganho-venda": "venda",
  perdido: "perdido",
};

function resolvePapel(
  item: CatalogItem,
  siblings: CatalogItem[] = [],
): FunilEtapaPapel | null {
  if (item.papel) return item.papel;
  const slug = item.slug ?? "";
  const legacy = LEGACY_PAPEL_BY_SLUG[slug] ?? null;
  if (!legacy) return null;
  if (siblings.some((s) => s.id !== item.id && s.papel === legacy)) {
    return null;
  }
  return legacy;
}

type CatalogContextValue = {
  catalog: GroupedCatalog;
  loading: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  /** Aplica etapas de um funil no catálogo (ex.: após recuperar etapas órfãs). */
  applyFunnelEtapas: (etapas: FunilEtapa[]) => void;
  /** Etapas do funil ativas, ordenadas (id = slug). */
  funnelStages: FunnelStage[];
  /** Slug da etapa usada ao criar lead (papel inicial). */
  defaultStageId: string;
  /** Slug da etapa com o papel dado, ou null. */
  stageByPapel: (papel: FunilEtapaPapel) => string | null;
  /** Labels ativos por tipo (para dropdowns). */
  origens: string[];
  motivos: string[];
  tags: string[];
  documentacaoFontes: string[];
  documentacaoStatus1: string[];
  documentacaoStatus2: string[];
  /** Cor Tailwind do item pelo label; fallback neutro se não houver. */
  colorByLabel: (type: CatalogType, label: string) => string;
  addItem: (input: CreateCatalogInput) => Promise<CatalogItem>;
  updateItem: (id: string, patch: UpdateCatalogInput) => Promise<CatalogItem>;
  removeItem: (id: string) => Promise<void>;
  reorder: (type: CatalogType, orderedIds: string[]) => Promise<void>;
  installDefaultFunnel: () => Promise<void>;
};

const emptyGrouped = (): GroupedCatalog => ({
  funil_etapa: [],
  origem: [],
  motivo_perda: [],
  tag: [],
  documentacao_fonte: [],
  documentacao_status1: [],
  documentacao_status2: [],
  cca: [],
  empreendimento_tipo: [],
  empreendimento_status: [],
  empreendimento_tag: [],
});

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<GroupedCatalog>(emptyGrouped);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent && !loadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog(true);
      setCatalog(data);
      loadedOnce.current = true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os catálogos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const funnelStages = useMemo<FunnelStage[]>(
    () =>
      catalog.funil_etapa.map((item) => ({
        id: item.slug ?? item.id,
        name: item.label,
        color: normalizeCatalogColor(item.color),
        papel: resolvePapel(item, catalog.funil_etapa),
      })),
    [catalog.funil_etapa],
  );

  const stageByPapel = useCallback(
    (papel: FunilEtapaPapel) =>
      funnelStages.find((s) => s.papel === papel)?.id ?? null,
    [funnelStages],
  );

  const defaultStageId = useMemo(() => {
    return (
      stageByPapel("inicial") ??
      funnelStages[0]?.id ??
      INITIAL_STAGE_SLUG
    );
  }, [funnelStages, stageByPapel]);

  const origens = useMemo(
    () => catalog.origem.map((i) => i.label),
    [catalog.origem],
  );
  const motivos = useMemo(
    () => catalog.motivo_perda.map((i) => i.label),
    [catalog.motivo_perda],
  );
  const tags = useMemo(() => catalog.tag.map((i) => i.label), [catalog.tag]);
  const documentacaoFontes = useMemo(
    () => catalog.documentacao_fonte.map((i) => i.label),
    [catalog.documentacao_fonte],
  );
  const documentacaoStatus1 = useMemo(
    () => catalog.documentacao_status1.map((i) => i.label),
    [catalog.documentacao_status1],
  );
  const documentacaoStatus2 = useMemo(
    () => catalog.documentacao_status2.map((i) => i.label),
    [catalog.documentacao_status2],
  );

  const colorByLabel = useCallback(
    (type: CatalogType, label: string) => {
      const list = catalog[type];
      const exact = list.find((i) => i.label === label);
      if (exact) return normalizeCatalogColor(exact.color);

      const trimmed = label.trim().toLowerCase();
      const byCase = list.find((i) => i.label.trim().toLowerCase() === trimmed);
      if (byCase) return normalizeCatalogColor(byCase.color);

      if (type === "documentacao_status1" || type === "documentacao_status2") {
        const normalized = normalizeDocStatus(label);
        const byNorm = list.find(
          (i) => normalizeDocStatus(i.label) === normalized,
        );
        if (byNorm) return normalizeCatalogColor(byNorm.color);
        const byGroup = list.find((i) => statusesMatch(i.label, label));
        if (byGroup) return normalizeCatalogColor(byGroup.color);
      }

      return DEFAULT_CATALOG_COLOR;
    },
    [catalog],
  );

  const upsertLocal = useCallback((item: CatalogItem) => {
    setCatalog((prev) => {
      const list = prev[item.type].filter((i) => i.id !== item.id);
      const next = item.active ? [...list, item] : list;
      next.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"),
      );
      return { ...prev, [item.type]: next };
    });
  }, []);

  const addItem = useCallback(
    async (input: CreateCatalogInput) => {
      const created = await createCatalogItem(input);
      upsertLocal(created);
      return created;
    },
    [upsertLocal],
  );

  const updateItem = useCallback(
    async (id: string, patch: UpdateCatalogInput) => {
      const updated = await updateCatalogItem(id, patch);
      upsertLocal(updated);
      return updated;
    },
    [upsertLocal],
  );

  const removeItem = useCallback(async (id: string) => {
    const removed = await deleteCatalogItem(id);
    setCatalog((prev) => ({
      ...prev,
      [removed.type]: prev[removed.type].filter((i) => i.id !== id),
    }));
  }, []);

  const reorder = useCallback(
    async (type: CatalogType, orderedIds: string[]) => {
      const items = await reorderCatalog(type, orderedIds);
      setCatalog((prev) => ({
        ...prev,
        [type]: items.filter((i) => i.active),
      }));
    },
    [],
  );

  const applyFunnelEtapas = useCallback((etapas: FunilEtapa[]) => {
    setCatalog((prev) => ({
      ...prev,
      funil_etapa: [...etapas]
        .filter((e) => e.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((e) => ({
          id: e.id,
          type: "funil_etapa" as const,
          label: e.label,
          slug: e.slug,
          color: e.color,
          sortOrder: e.sortOrder,
          active: e.active,
          papel: e.papel,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
    }));
  }, []);

  const installDefaultFunnel = useCallback(async () => {
    const stages = await installDefaultFunnelStages();
    setCatalog((prev) => ({
      ...prev,
      funil_etapa: stages.filter((i) => i.active),
    }));
  }, []);

  const value = useMemo(
    () => ({
      catalog,
      loading,
      error,
      refresh,
      applyFunnelEtapas,
      funnelStages,
      defaultStageId,
      stageByPapel,
      origens,
      motivos,
      tags,
      documentacaoFontes,
      documentacaoStatus1,
      documentacaoStatus2,
      colorByLabel,
      addItem,
      updateItem,
      removeItem,
      reorder,
      installDefaultFunnel,
    }),
    [
      catalog,
      loading,
      error,
      refresh,
      funnelStages,
      defaultStageId,
      stageByPapel,
      origens,
      motivos,
      tags,
      documentacaoFontes,
      documentacaoStatus1,
      documentacaoStatus2,
      colorByLabel,
      addItem,
      updateItem,
      removeItem,
      reorder,
      installDefaultFunnel,
      applyFunnelEtapas,
    ],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
