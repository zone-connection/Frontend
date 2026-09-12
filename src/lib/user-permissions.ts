import type { Role } from "@/lib/auth";

export type UserPermissions = {
  modules: Record<string, boolean>;
  actions: Record<string, boolean>;
};

export const PERMISSION_GROUPS = [
  { id: "operacao", label: "Operação" },
  { id: "fechamento", label: "Fechamento" },
  { id: "catalogo", label: "Catálogo" },
  { id: "gestao", label: "Gestão" },
  { id: "financeiro", label: "Financeiro" },
] as const;

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", routes: ["/dashboard"], group: "operacao" },
  { key: "leads", label: "Leads", routes: ["/leads"], group: "operacao" },
  { key: "funil", label: "Funil", routes: ["/funil"], group: "operacao" },
  { key: "triagem", label: "Triagem", routes: ["/triagem"], group: "operacao" },
  { key: "agenda", label: "Agenda", routes: ["/agenda"], group: "operacao" },
  {
    key: "clientes",
    label: "Clientes",
    routes: ["/clientes", "/funil-clientes"],
    group: "operacao",
  },
  {
    key: "leadsPerdidos",
    label: "Leads perdidos",
    routes: ["/leads-perdidos"],
    group: "operacao",
  },
  {
    key: "clientesPerdidos",
    label: "Perda de cliente",
    routes: ["/clientes-perdidos"],
    group: "operacao",
  },
  {
    key: "treinamento",
    label: "Treinamento",
    routes: ["/treinamento"],
    group: "operacao",
  },
  {
    key: "captacao",
    label: "Captação de imóveis",
    routes: ["/captacao"],
    group: "operacao",
  },
  {
    key: "imoveisUsados",
    label: "Venda de imóveis usados",
    routes: ["/imoveis-usados"],
    group: "operacao",
  },
  {
    key: "locacao",
    label: "Locação",
    routes: ["/locacao"],
    group: "operacao",
  },
  {
    key: "documentacao",
    label: "Documentação",
    routes: ["/documentacao"],
    group: "fechamento",
  },
  { key: "propostas", label: "Propostas", routes: ["/propostas"], group: "fechamento" },
  { key: "contratos", label: "Contratos", routes: ["/contratos"], group: "fechamento" },
  { key: "vendas", label: "Vendas", routes: ["/vendas"], group: "fechamento" },
  {
    key: "construtoras",
    label: "Construtoras",
    routes: ["/construtoras"],
    group: "catalogo",
  },
  { key: "imoveis", label: "Imóveis", routes: ["/imoveis"], group: "catalogo" },
  { key: "corretores", label: "Ranking", routes: ["/corretores"], group: "gestao" },
  { key: "atrasos", label: "Atrasos", routes: ["/atrasos"], group: "gestao" },
  { key: "metas", label: "Metas", routes: ["/metas"], group: "gestao" },
  { key: "analise", label: "Análise", routes: ["/resultado"], group: "gestao" },
  {
    key: "taxaConversao",
    label: "Taxa de conversão",
    routes: ["/taxa-conversao"],
    group: "gestao",
  },
  { key: "equipes", label: "Equipes", routes: ["/equipes"], group: "gestao" },
  { key: "usuarios", label: "Usuários", routes: ["/usuarios"], group: "gestao" },
  { key: "permissoes", label: "Permissões", routes: ["/permissoes"], group: "gestao" },
  {
    key: "configuracoes",
    label: "Configurações",
    routes: ["/configuracoes"],
    group: "gestao",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    routes: ["/financeiro"],
    group: "financeiro",
  },
  {
    key: "comissao",
    label: "Comissões",
    routes: ["/financeiro/comissao"],
    group: "financeiro",
  },
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]["key"];

export const PERMISSION_ACTIONS = [
  { key: "leads.view", label: "Visualizar leads", module: "leads" },
  { key: "leads.create", label: "Criar leads", module: "leads" },
  { key: "leads.edit", label: "Editar leads", module: "leads" },
  { key: "leads.delete", label: "Excluir leads", module: "leads" },
  { key: "leads.viewLost", label: "Visualizar leads perdidos", module: "leads" },
  {
    key: "leads.viewOthers",
    label: "Visualizar leads de outros corretores",
    module: "leads",
  },
  { key: "leads.changeOwner", label: "Alterar responsável pelo lead", module: "leads" },
  { key: "leads.export", label: "Exportar leads", module: "leads" },
  { key: "financeiro.access", label: "Acessar Financeiro", module: "financeiro" },
  {
    key: "financeiro.pagar.view",
    label: "Visualizar contas a pagar",
    module: "financeiro",
  },
  {
    key: "financeiro.pagar.create",
    label: "Criar contas a pagar",
    module: "financeiro",
  },
  {
    key: "financeiro.pagar.edit",
    label: "Editar contas a pagar",
    module: "financeiro",
  },
  {
    key: "financeiro.pagar.delete",
    label: "Excluir contas a pagar",
    module: "financeiro",
  },
  {
    key: "financeiro.receber.view",
    label: "Visualizar contas a receber",
    module: "financeiro",
  },
  {
    key: "financeiro.receber.create",
    label: "Criar contas a receber",
    module: "financeiro",
  },
  {
    key: "financeiro.receber.edit",
    label: "Editar contas a receber",
    module: "financeiro",
  },
  {
    key: "financeiro.receber.delete",
    label: "Excluir contas a receber",
    module: "financeiro",
  },
  { key: "financeiro.fluxo", label: "Visualizar fluxo de caixa", module: "financeiro" },
  { key: "financeiro.comissao", label: "Acessar comissões", module: "financeiro" },
  {
    key: "financeiro.export",
    label: "Exportar informações financeiras",
    module: "financeiro",
  },
] as const;

const ROLE_DEFAULT_ROUTES: Record<Role, readonly string[]> = {
  super_admin: [
    "/perfil",
    "/tenants",
    "/guia",
    "/dashboard",
    "/leads",
    "/caca-lead",
    "/funil",
    "/agenda",
    "/metas",
    "/treinamento",
    "/contratos",
    "/vendas",
    "/configuracoes",
    "/financeiro",
  ],
  admin: [
    "/dashboard",
    "/vendas",
    "/leads",
    "/caca-lead",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/treinamento",
    "/clientes",
    "/corretores",
    "/atrasos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/resultado",
    "/usuarios",
    "/permissoes",
    "/equipes",
    "/construtoras",
    "/leads-perdidos",
    "/taxa-conversao",
    "/propostas",
    "/contratos",
    "/financeiro",
    "/configuracoes",
    "/perfil",
  ],
  gerente: [
    "/dashboard",
    "/vendas",
    "/leads",
    "/caca-lead",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/treinamento",
    "/clientes",
    "/corretores",
    "/atrasos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/resultado",
    "/usuarios",
    "/construtoras",
    "/propostas",
    "/contratos",
    "/financeiro/comissao",
    "/configuracoes",
    "/perfil",
  ],
  corretor: [
    "/dashboard",
    "/leads",
    "/caca-lead",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/treinamento",
    "/clientes",
    "/clientes-perdidos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/contratos",
    "/construtoras",
    "/financeiro/comissao",
    "/perfil",
  ],
  analista: [
    "/caca-lead",
    "/resultado",
    "/documentacao",
    "/contratos",
    "/imoveis",
    "/treinamento",
    "/construtoras",
    "/usuarios",
    "/configuracoes",
    "/perfil",
  ],
  financeiro: [
    "/caca-lead",
    "/financeiro/visao-geral",
    "/financeiro/clientes-fornecedores",
    "/financeiro/movimentacao",
    "/financeiro/fluxo-caixa",
    "/financeiro/contas-a-receber",
    "/financeiro/contas-a-pagar",
    "/financeiro/despesas",
    "/financeiro/comissao",
    "/financeiro/funcionarios",
    "/perfil",
  ],
  treinee: [
    "/dashboard",
    "/leads",
    "/caca-lead",
    "/funil",
    "/funil-clientes",
    "/agenda",
    "/imoveis",
    "/treinamento",
    "/clientes",
    "/clientes-perdidos",
    "/metas",
    "/triagem",
    "/documentacao",
    "/contratos",
    "/financeiro/comissao",
    "/construtoras",
    "/configuracoes",
    "/perfil",
  ],
  assistente: ["/perfil", "/caca-lead"],
};

const GERENTE_BRONZE_ROUTES = [
  "/dashboard",
  "/leads",
  "/caca-lead",
  "/funil",
  "/agenda",
  "/imoveis",
  "/treinamento",
  "/triagem",
  "/construtoras",
  "/documentacao",
  "/contratos",
  "/financeiro/comissao",
  "/configuracoes",
  "/perfil",
] as const;

function routesForRole(role: Role, plano?: string | null): readonly string[] {
  if (role === "gerente" && plano === "bronze") return GERENTE_BRONZE_ROUTES;
  return ROLE_DEFAULT_ROUTES[role];
}

function roleHasRoute(role: Role, route: string, plano?: string | null): boolean {
  return routesForRole(role, plano).some(
    (allowed) => route === allowed || route.startsWith(`${allowed}/`),
  );
}

export function emptyPermissions(): UserPermissions {
  return { modules: {}, actions: {} };
}

export function sanitizeUserPermissions(raw: unknown): UserPermissions {
  const next = emptyPermissions();
  if (!raw || typeof raw !== "object") return next;
  const obj = raw as { modules?: unknown; actions?: unknown };
  if (obj.modules && typeof obj.modules === "object") {
    const modules = obj.modules as Record<string, unknown>;
    for (const item of PERMISSION_MODULES) {
      if (typeof modules[item.key] === "boolean") {
        next.modules[item.key] = modules[item.key] as boolean;
      }
    }
  }
  if (obj.actions && typeof obj.actions === "object") {
    const actions = obj.actions as Record<string, unknown>;
    for (const item of PERMISSION_ACTIONS) {
      if (typeof actions[item.key] === "boolean") {
        next.actions[item.key] = actions[item.key] as boolean;
      }
    }
  }
  return next;
}

export function defaultsFromRole(
  role: Role,
  plano?: string | null,
): UserPermissions {
  const roleRoutes = routesForRole(role, plano);
  const modules: Record<string, boolean> = {};
  for (const item of PERMISSION_MODULES) {
    if (item.key === "financeiro") {
      modules.financeiro = roleRoutes.some(
        (route) =>
          route === "/financeiro" ||
          (route.startsWith("/financeiro/") && route !== "/financeiro/comissao"),
      );
      continue;
    }
    if (item.key === "comissao") {
      modules.comissao = roleHasRoute(role, "/financeiro/comissao", plano);
      continue;
    }
    modules[item.key] = item.routes.some((route) =>
      roleHasRoute(role, route, plano),
    );
  }

  const gestor = role === "admin" || role === "gerente";
  const finUser =
    role === "admin" ||
    role === "gerente" ||
    role === "super_admin" ||
    role === "financeiro";

  const actions: Record<string, boolean> = {
    "leads.view": Boolean(modules.leads),
    "leads.create": Boolean(modules.leads),
    "leads.edit": Boolean(modules.leads),
    "leads.delete": role === "admin" || role === "super_admin",
    "leads.viewLost": Boolean(modules.leadsPerdidos),
    "leads.viewOthers":
      role === "admin" ||
      role === "super_admin" ||
      role === "gerente" ||
      role === "analista",
    "leads.changeOwner": gestor,
    "leads.export": gestor,
    "financeiro.access": Boolean(modules.financeiro),
    "financeiro.pagar.view": finUser && Boolean(modules.financeiro),
    "financeiro.pagar.create": finUser && Boolean(modules.financeiro),
    "financeiro.pagar.edit": finUser && Boolean(modules.financeiro),
    "financeiro.pagar.delete": finUser && Boolean(modules.financeiro),
    "financeiro.receber.view": finUser && Boolean(modules.financeiro),
    "financeiro.receber.create": finUser && Boolean(modules.financeiro),
    "financeiro.receber.edit": finUser && Boolean(modules.financeiro),
    "financeiro.receber.delete": finUser && Boolean(modules.financeiro),
    "financeiro.fluxo": finUser && Boolean(modules.financeiro),
    "financeiro.comissao": Boolean(modules.comissao),
    "financeiro.export": role === "admin",
  };

  return { modules, actions };
}

export function mergePermissions(
  base: UserPermissions,
  override?: UserPermissions | null,
): UserPermissions {
  return {
    modules: { ...base.modules, ...(override?.modules ?? {}) },
    actions: { ...base.actions, ...(override?.actions ?? {}) },
  };
}

export function effectivePermissions(
  role: Role,
  stored?: UserPermissions | null,
  plano?: string | null,
): UserPermissions {
  return mergePermissions(defaultsFromRole(role, plano), stored);
}

export function canUserAction(
  role: Role,
  stored: UserPermissions | null | undefined,
  action: string,
  plano?: string | null,
): boolean {
  return effectivePermissions(role, stored, plano).actions[action] === true;
}

export function hasUserModule(
  role: Role,
  stored: UserPermissions | null | undefined,
  moduleKey: string,
  plano?: string | null,
): boolean {
  return effectivePermissions(role, stored, plano).modules[moduleKey] === true;
}

export function moduleForPath(pathname: string): PermissionModuleKey | null {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const ranked = [...PERMISSION_MODULES].sort(
    (a, b) =>
      Math.max(...b.routes.map((r) => r.length)) -
      Math.max(...a.routes.map((r) => r.length)),
  );
  for (const item of ranked) {
    if (item.routes.some((route) => path === route || path.startsWith(`${route}/`))) {
      return item.key;
    }
  }
  return null;
}

export function actionForFinancePath(pathname: string): string | null {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (path.startsWith("/financeiro/contas-a-pagar")) return "financeiro.pagar.view";
  if (path.startsWith("/financeiro/contas-a-receber"))
    return "financeiro.receber.view";
  if (path.startsWith("/financeiro/fluxo-caixa")) return "financeiro.fluxo";
  if (path.startsWith("/financeiro/comissao")) return "financeiro.comissao";
  if (path.startsWith("/financeiro")) return "financeiro.access";
  return null;
}
