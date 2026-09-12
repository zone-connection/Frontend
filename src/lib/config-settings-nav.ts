import type { LucideIcon } from "lucide-react";
import { BookMarked, Building2, Layers } from "lucide-react";

export const CONFIG_SECOES = ["conta", "operacao", "catalogos"] as const;
export type ConfigSecao = (typeof CONFIG_SECOES)[number];

export const CONFIG_ITEMS = [
  "empresa",
  "creci",
  "conexoes",
  "usuario-extra",
  "modulos",
  "funil",
  "automacoes",
  "metas",
  "financeiro",
  "listas",
  "documentacao",
  "imoveis",
] as const;
export type ConfigItem = (typeof CONFIG_ITEMS)[number];

export type ConfigNavFlags = {
  showCreci: boolean;
  showOps: boolean;
  showFunil: boolean;
  showUsuarioExtra: boolean;
  showDocumentacao: boolean;
  showCatalog: boolean;
  showImoveis: boolean;
  showMetas: boolean;
  isSolo: boolean;
};

export type ConfigNavItem = {
  id: ConfigItem;
  label: string;
};

export type ConfigNavModule = {
  id: ConfigSecao;
  label: string;
  description: string;
  icon: LucideIcon;
  items: ConfigNavItem[];
};

export type ConfigSelection = {
  secao: ConfigSecao;
  item: ConfigItem;
};

export type ConfigSearch = {
  secao?: ConfigSecao;
  item?: ConfigItem;
  google?: string;
  meta?: string;
  orulo?: string;
  code?: string;
};

export function parseConfigSecao(value: unknown): ConfigSecao | undefined {
  return typeof value === "string" &&
    (CONFIG_SECOES as readonly string[]).includes(value)
    ? (value as ConfigSecao)
    : undefined;
}

export function parseConfigItem(value: unknown): ConfigItem | undefined {
  return typeof value === "string" &&
    (CONFIG_ITEMS as readonly string[]).includes(value)
    ? (value as ConfigItem)
    : undefined;
}

export function parseConfigSearch(
  search: Record<string, unknown>,
): ConfigSearch {
  const secao = parseConfigSecao(search.secao);
  const item = parseConfigItem(search.item);
  const google =
    typeof search.google === "string" && search.google.trim()
      ? search.google.trim()
      : undefined;
  const meta =
    typeof search.meta === "string" && search.meta.trim()
      ? search.meta.trim()
      : undefined;
  const orulo =
    typeof search.orulo === "string" && search.orulo.trim()
      ? search.orulo.trim()
      : undefined;
  const code =
    typeof search.code === "string" && search.code.trim()
      ? search.code.trim()
      : undefined;
  return {
    ...(secao ? { secao } : {}),
    ...(item ? { item } : {}),
    ...(google ? { google } : {}),
    ...(meta ? { meta } : {}),
    ...(orulo ? { orulo } : {}),
    ...(code ? { code } : {}),
  };
}

export function buildConfigModules(flags: ConfigNavFlags): ConfigNavModule[] {
  const modules: ConfigNavModule[] = [];

  const contaItems: ConfigNavItem[] = [];
  if (flags.showOps) {
    contaItems.push({
      id: "empresa",
      label: flags.isSolo ? "Meus dados" : "Imobiliária",
    });
  }
  if (flags.showCreci) {
    contaItems.push({ id: "creci", label: "CRECI" });
  }
  contaItems.push({ id: "conexoes", label: "Conexões" });
  if (flags.showUsuarioExtra) {
    contaItems.push({ id: "usuario-extra", label: "Assistente" });
  }
  if (contaItems.length > 0) {
    modules.push({
      id: "conta",
      label: "Conta",
      description: flags.isSolo
        ? "Seus dados, CRECI e conexões."
        : "Imobiliária, CRECI e conexões.",
      icon: Building2,
      items: contaItems,
    });
  }

  const operacaoItems: ConfigNavItem[] = [];
  if (flags.showOps) {
    operacaoItems.push(
      { id: "modulos", label: "Módulos" },
      { id: "funil", label: "Funis" },
      { id: "automacoes", label: "Automações" },
      { id: "financeiro", label: "Financeiro" },
    );
  } else if (flags.showFunil) {
    operacaoItems.push(
      { id: "funil", label: "Funis" },
      { id: "automacoes", label: "Automações" },
    );
  }
  if (flags.showMetas) {
    operacaoItems.push({ id: "metas", label: "Metas" });
  }
  if (operacaoItems.length > 0) {
    modules.push({
      id: "operacao",
      label: "Operação",
      description: flags.showOps
        ? "Módulos, funis, automações e preferências da operação."
        : "Funis e automações da operação comercial.",
      icon: Layers,
      items: operacaoItems,
    });
  }

  const catalogoItems: ConfigNavItem[] = [];
  if (flags.showCatalog) {
    catalogoItems.push({ id: "listas", label: "Leads" });
  }
  if (flags.showDocumentacao) {
    catalogoItems.push({ id: "documentacao", label: "Documentação" });
  }
  if (flags.showImoveis && flags.showCatalog) {
    catalogoItems.push({ id: "imoveis", label: "Imóveis" });
  }
  if (catalogoItems.length > 0) {
    modules.push({
      id: "catalogos",
      label: "Catálogos",
      description:
        flags.showDocumentacao || flags.showImoveis
          ? "Listas usadas em leads, documentação e imóveis."
          : "Listas usadas em leads.",
      icon: BookMarked,
      items: catalogoItems,
    });
  }

  return modules;
}

function findItem(
  modules: ConfigNavModule[],
  secao: ConfigSecao,
  item: ConfigItem,
): ConfigNavItem | undefined {
  return modules.find((mod) => mod.id === secao)?.items.find((it) => it.id === item);
}

export function defaultConfigSelection(
  flags: ConfigNavFlags,
  modules: ConfigNavModule[],
): ConfigSelection {
  const fallback: ConfigSelection = {
    secao: modules[0]?.id ?? "conta",
    item: modules[0]?.items[0]?.id ?? "conexoes",
  };
  if (flags.showOps && findItem(modules, "conta", "empresa")) {
    return { secao: "conta", item: "empresa" };
  }
  if (flags.showCreci && findItem(modules, "conta", "creci")) {
    return { secao: "conta", item: "creci" };
  }
  if (flags.showDocumentacao && findItem(modules, "catalogos", "documentacao")) {
    return { secao: "catalogos", item: "documentacao" };
  }
  if (flags.showCatalog && findItem(modules, "catalogos", "listas")) {
    return { secao: "catalogos", item: "listas" };
  }
  return fallback;
}

export function resolveConfigSelection(
  secao: ConfigSecao | undefined,
  item: ConfigItem | undefined,
  modules: ConfigNavModule[],
  fallback: ConfigSelection,
): ConfigSelection {
  if (secao && item && findItem(modules, secao, item)) {
    return { secao, item };
  }
  if (item) {
    const owner = modules.find((mod) => mod.items.some((it) => it.id === item));
    if (owner) return { secao: owner.id, item };
  }
  if (secao) {
    const mod = modules.find((m) => m.id === secao);
    if (mod?.items[0]) return { secao: mod.id, item: mod.items[0].id };
  }
  return fallback;
}
