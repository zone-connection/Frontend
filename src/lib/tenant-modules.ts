/**
 * Catálogo de módulos do tenant, alinhado às permissões do plano.
 * O menu visual (Operação / Fechamento / Catálogo / Gestão / Financeiro)
 * fica em app-shell; daqui só entram chaves de plano.
 * false em Tenant.modules = oculto no menu e bloqueado na rota.
 */

export type TenantModuleKey =
  | "dashboard"
  | "leads"
  | "funil"
  | "triagem"
  | "agenda"
  | "imoveis"
  | "clientes"
  | "clientesPerdidos"
  | "construtoras"
  | "leadsPerdidos"
  | "usuarios"
  | "equipes"
  | "corretores"
  | "documentacao"
  | "analise"
  | "metas"
  | "propostas"
  | "contratos"
  | "taxaConversao"
  | "configuracoes"
  | "financeiro"
  | "comercial"
  | "captacao"
  | "imoveisUsados"
  | "locacao";

export type TenantModuleDef = {
  key: TenantModuleKey;
  label: string;
  /** Não desliga no toggle em massa do Administrativo. */
  keepOnAdminBulkOff?: boolean;
};

export type TenantModuleGroupId =
  | "operacoes"
  | "operacional"
  | "administrativo"
  | "financeiro";

export type TenantModuleGroup = {
  id: TenantModuleGroupId;
  label: string;
  modules: TenantModuleDef[];
};

export const TENANT_MODULE_GROUPS: TenantModuleGroup[] = [
  {
    id: "operacoes",
    label: "Operações imobiliárias",
    modules: [
      { key: "comercial", label: "Comercial" },
      { key: "captacao", label: "Captação de Imóveis" },
      { key: "imoveisUsados", label: "Venda de Imóveis Usados" },
      { key: "locacao", label: "Locação" },
    ],
  },
  {
    id: "operacional",
    label: "Operacional",
    modules: [
      { key: "dashboard", label: "Dashboard" },
      { key: "leads", label: "Leads" },
      { key: "funil", label: "Funil" },
      { key: "triagem", label: "Triagem" },
      { key: "agenda", label: "Agenda" },
      { key: "imoveis", label: "Imóveis" },
      { key: "clientes", label: "Clientes" },
      { key: "clientesPerdidos", label: "Perda de cliente" },
      { key: "construtoras", label: "Construtoras" },
      { key: "leadsPerdidos", label: "Leads Perdidos" },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    modules: [
      {
        key: "usuarios",
        label: "Usuários (criar usuário)",
        keepOnAdminBulkOff: true,
      },
      { key: "equipes", label: "Equipes" },
      { key: "corretores", label: "Ranking" },
      { key: "documentacao", label: "Documentação" },
      { key: "analise", label: "Análise" },
      { key: "metas", label: "Metas" },
      { key: "propostas", label: "Propostas" },
      { key: "contratos", label: "Contratos" },
      { key: "taxaConversao", label: "Taxa de conversão" },
      {
        key: "configuracoes",
        label: "Configurações",
        keepOnAdminBulkOff: true,
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    modules: [{ key: "financeiro", label: "Financeiro" }],
  },
];

export const ALL_TENANT_MODULE_KEYS: TenantModuleKey[] =
  TENANT_MODULE_GROUPS.flatMap((g) => g.modules.map((m) => m.key));

/** Rota → chave de módulo (para permissões / menu). */
export const ROUTE_MODULE_KEY: Record<string, TenantModuleKey> = {
  "/dashboard": "dashboard",
  "/leads": "leads",
  "/caca-lead": "leads",
  "/atrasos": "leads",
  "/funil": "funil",
  "/funil-clientes": "clientes",
  "/triagem": "triagem",
  "/agenda": "agenda",
  "/imoveis": "imoveis",
  "/clientes": "clientes",
  "/clientes-perdidos": "clientesPerdidos",
  "/construtoras": "construtoras",
  "/leads-perdidos": "leadsPerdidos",
  "/usuarios": "usuarios",
  "/equipes": "equipes",
  "/corretores": "corretores",
  "/documentacao": "documentacao",
  "/vendas": "documentacao",
  "/resultado": "analise",
  "/metas": "metas",
  "/propostas": "propostas",
  "/contratos": "contratos",
  "/taxa-conversao": "taxaConversao",
  "/configuracoes": "configuracoes",
  "/financeiro": "financeiro",
  "/captacao": "captacao",
  "/imoveis-usados": "imoveisUsados",
  "/locacao": "locacao",
};

export const TENANT_OPERATION_KEYS = [
  "comercial",
  "captacao",
  "imoveisUsados",
  "locacao",
] as const;

const OPERATION_DEFAULTS: Record<
  "comercial" | "captacao" | "imoveisUsados" | "locacao",
  boolean
> = {
  comercial: true,
  captacao: false,
  imoveisUsados: false,
  locacao: false,
};

export function isTenantOperationKey(
  key: string,
): key is "comercial" | "captacao" | "imoveisUsados" | "locacao" {
  return (TENANT_OPERATION_KEYS as readonly string[]).includes(key);
}

export function isTenantOperationEnabled(
  modules: Record<string, boolean> | null | undefined,
  key: "comercial" | "captacao" | "imoveisUsados" | "locacao",
): boolean {
  if (typeof modules?.[key] === "boolean") return modules[key] === true;
  return OPERATION_DEFAULTS[key];
}

export function defaultModulesRecord(
  enabled = true,
): Record<TenantModuleKey, boolean> {
  return Object.fromEntries(
    ALL_TENANT_MODULE_KEYS.map((key) => {
      if (isTenantOperationKey(key)) return [key, OPERATION_DEFAULTS[key]];
      return [key, enabled];
    }),
  ) as Record<TenantModuleKey, boolean>;
}

export function modulesFromTenantJson(
  modules: Record<string, boolean> | null | undefined,
): Record<TenantModuleKey, boolean> {
  const base = defaultModulesRecord(true);
  if (!modules) return base;
  for (const key of ALL_TENANT_MODULE_KEYS) {
    if (typeof modules[key] === "boolean") base[key] = modules[key]!;
  }
  // Compatibilidade com tenants antigos (só 6 chaves)
  return base;
}

export type TenantPlano = "solo" | "bronze" | "prata" | "ouro";

export const PLANO_MAX_USUARIOS: Record<TenantPlano, number> = {
  solo: 2,
  bronze: 5,
  prata: 15,
  ouro: 35,
};

export const PLANO_LABELS: Record<TenantPlano, string> = {
  solo: "Solo — Corretor",
  bronze: "Bronze — CRM",
  prata: "Prata — CRM + Administrativo ou Financeiro",
  ouro: "Ouro — Todos os módulos",
};

/** Financeiro enxuto do Solo (o módulo `financeiro` continua ligado). */
export const SOLO_FINANCEIRO_ROUTES = [
  "/financeiro/comissao",
  "/financeiro/contas-a-receber",
  "/financeiro/contas-a-pagar",
  "/financeiro/fluxo-caixa",
  "/financeiro/funcionarios",
] as const;

/** Telas de time / carteira — solo usa Funil em vez de Clientes. */
export const SOLO_BLOCKED_ROUTES = [
  "/clientes",
  "/funil-clientes",
  "/clientes-perdidos",
  "/usuarios",
  "/permissoes",
] as const;

const SOLO_ENABLED = new Set<TenantModuleKey>([
  "dashboard",
  "leads",
  "funil",
  "agenda",
  "imoveis",
  "construtoras",
  "usuarios",
  "configuracoes",
  "documentacao",
  "propostas",
  "contratos",
  "metas",
  "financeiro",
]);

const ADMIN_TOGGLE_KEYS: TenantModuleKey[] = [
  "equipes",
  "corretores",
  "documentacao",
  "analise",
  "metas",
  "propostas",
  "taxaConversao",
];

export function isAdminGroupEnabled(
  modules: Record<TenantModuleKey, boolean>,
): boolean {
  return ADMIN_TOGGLE_KEYS.every((k) => modules[k] !== false);
}

/** @deprecated Use isAdminGroupEnabled */
export const adminGroupEnabled = isAdminGroupEnabled;

/** Analista: nunca no Solo/Bronze; Prata/Ouro só com administrativo ativo. */
export function isAnalistaAllowed(
  plano: TenantPlano | null | undefined,
  modules?: Record<string, boolean> | null,
): boolean {
  if (!plano || plano === "bronze" || plano === "solo") return false;
  const normalized = modulesFromTenantJson(modules);
  return isAdminGroupEnabled(normalized);
}

export function isGerenteAllowed(plano: TenantPlano | null | undefined): boolean {
  return plano !== "solo";
}

export function isFinanceiroRoleAllowed(
  plano: TenantPlano | null | undefined,
  modules?: Record<string, boolean> | null,
): boolean {
  if (!plano || plano === "bronze") return false;
  if (plano === "solo") return true;
  return modules?.financeiro !== false;
}

export function isFinanceiroPathAllowed(
  path: string,
  plano?: TenantPlano | null,
): boolean {
  if (plano !== "solo") return true;
  if (path === "/financeiro" || path === "/financeiro/") return true;
  if (!path.startsWith("/financeiro")) return true;
  return SOLO_FINANCEIRO_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export function isSoloPathAllowed(
  path: string,
  plano?: TenantPlano | null,
): boolean {
  if (plano !== "solo") return true;
  return !SOLO_BLOCKED_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

/**
 * Normaliza módulos pelas regras do plano (espelha o backend).
 * Solo: recorte fixo. Prata: administrativo XOR financeiro (se ambos, prioriza administrativo).
 */
export function normalizeModulesForPlano(
  plano: TenantPlano,
  modules: Record<TenantModuleKey, boolean>,
): Record<TenantModuleKey, boolean> {
  if (plano === "solo") {
    const next = defaultModulesRecord(false);
    for (const key of SOLO_ENABLED) next[key] = true;
    next.comercial = true;
    for (const key of TENANT_OPERATION_KEYS) {
      if (key !== "comercial") next[key] = modules[key] === true;
    }
    return next;
  }

  const next = { ...modules };
  for (const key of TENANT_MODULE_GROUPS.find((g) => g.id === "operacional")!
    .modules.map((m) => m.key)) {
    if (typeof next[key] !== "boolean") next[key] = true;
  }
  next.usuarios = true;
  next.configuracoes = true;

  if (plano === "bronze") {
    for (const key of ADMIN_TOGGLE_KEYS) next[key] = false;
    next.financeiro = false;
  } else if (plano === "prata") {
    const adminOn = ADMIN_TOGGLE_KEYS.every((k) => next[k] !== false);
    const financeOn = next.financeiro === true;
    if (adminOn && financeOn) {
      next.financeiro = false;
    } else if (financeOn && !adminOn) {
      for (const key of ADMIN_TOGGLE_KEYS) next[key] = false;
      next.financeiro = true;
    } else if (adminOn) {
      next.financeiro = false;
    }
  }

  for (const key of TENANT_OPERATION_KEYS) {
    if (typeof next[key] !== "boolean") next[key] = OPERATION_DEFAULTS[key];
  }

  return next;
}

/** Preset de módulos por plano (espelha o backend). */
export function modulesPresetForPlano(
  plano: TenantPlano,
): Record<TenantModuleKey, boolean> {
  if (plano === "solo") {
    return normalizeModulesForPlano(plano, defaultModulesRecord(false));
  }
  const next = defaultModulesRecord(false);
  for (const key of TENANT_MODULE_GROUPS.find((g) => g.id === "operacional")!
    .modules.map((m) => m.key)) {
    next[key] = true;
  }
  next.usuarios = true;
  next.configuracoes = true;
  if (plano === "prata" || plano === "ouro") {
    for (const mod of TENANT_MODULE_GROUPS.find((g) => g.id === "administrativo")!
      .modules) {
      next[mod.key] = true;
    }
  }
  if (plano === "ouro") {
    next.financeiro = true;
  }
  return normalizeModulesForPlano(plano, next);
}

/** Desliga todos do Administrativo, mantendo "criar usuário" / config. */
export function setAdminGroupEnabled(
  modules: Record<TenantModuleKey, boolean>,
  enabled: boolean,
): Record<TenantModuleKey, boolean> {
  const next = { ...modules };
  const admin = TENANT_MODULE_GROUPS.find((g) => g.id === "administrativo");
  if (!admin) return next;
  for (const mod of admin.modules) {
    if (mod.keepOnAdminBulkOff) {
      if (enabled) next[mod.key] = true;
      continue;
    }
    next[mod.key] = enabled;
  }
  return next;
}
