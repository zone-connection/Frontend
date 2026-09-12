import type { AuthUser, Role } from "@/lib/auth";
import {
  ROUTE_MODULE_KEY,
  isFinanceiroPathAllowed,
  isSoloPathAllowed,
  isTenantOperationEnabled,
  isTenantOperationKey,
  type TenantPlano,
} from "@/lib/tenant-modules";
import {
  actionForFinancePath,
  canUserAction,
  effectivePermissions,
  hasUserModule,
  moduleForPath,
  type UserPermissions,
} from "@/lib/user-permissions";

/**
 * Rotas por perfil:
 * - admin: operação + financeiro; carteira própria (/clientes) e vendas
 * - gerente: operação da equipe; carteira própria (/clientes) e vendas
 * - corretor: essencial (próprios leads/agenda/clientes) + cadastro de construtoras (sem vendas)
 * - analista: documentação, resultado e catálogos (origens/tags/motivos)
 * - financeiro: somente o módulo Financeiro (visão, parceiros, fluxo, títulos, despesas, comissão)
 * - treinee: mesmo acesso operacional do corretor + cadastro de construtoras/empreendimentos/origens/tags/CCAs; documentação só vinculada
 */
const ROLE_ROUTES: Record<Role, readonly string[]> = {
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
    "/financeiro/visao-geral",
    "/financeiro/clientes-fornecedores",
    "/financeiro/contas-a-receber",
    "/financeiro/contas-a-pagar",
    "/financeiro/despesas",
    "/financeiro/fluxo-caixa",
    "/financeiro/movimentacao",
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
    "/guia-sistema",
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
    "/guia-sistema",
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
    "/taxa-conversao",
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
    "/guia-sistema",
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
    "/resultado",
    "/documentacao",
    "/contratos",
    "/imoveis",
    "/treinamento",
    "/guia-sistema",
    "/construtoras",
    "/usuarios",
    "/configuracoes",
    "/perfil",
  ],
  financeiro: [
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
    "/guia-sistema",
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
  assistente: ["/perfil"],
};

/** No Bronze o gerente acessa só o CRM operacional. */
const GERENTE_BRONZE_ROUTES: readonly string[] = [
  "/dashboard",
  "/leads",
  "/funil",
  "/agenda",
  "/imoveis",
  "/treinamento",
  "/guia-sistema",
  "/triagem",
  "/construtoras",
  "/documentacao",
  "/contratos",
    "/financeiro/comissao",
    "/configuracoes",
    "/perfil",
  ];

export function getAllowedRoutes(role: Role): readonly string[] {
  return ROLE_ROUTES[role];
}

export function canAccessRoute(
  role: Role,
  pathname: string,
  modules?: Record<string, boolean> | null,
  plano?: TenantPlano | null,
  userPermissions?: UserPermissions | null,
): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (path === "/perfil") return true;

  if (!isFinanceiroPathAllowed(path, plano ?? null)) return false;
  if (!isSoloPathAllowed(path, plano ?? null)) return false;

  if (modules) {
    const tenantKey = Object.entries(ROUTE_MODULE_KEY).find(
      ([route]) => path === route || path.startsWith(`${route}/`),
    )?.[1];
    if (tenantKey) {
      if (isTenantOperationKey(tenantKey)) {
        if (!isTenantOperationEnabled(modules, tenantKey)) return false;
      } else if (modules[tenantKey] === false) {
        return false;
      }
    }
  }

  const permKey = moduleForPath(path);
    if (permKey && isTenantOperationKey(permKey)) {
      if (!isTenantOperationEnabled(modules, permKey)) return false;
      if (
        role === "admin" ||
        role === "super_admin" ||
        role === "gerente" ||
        role === "corretor" ||
        role === "treinee"
      ) {
        return true;
      }
    }
  if (permKey && role !== "super_admin") {
    const effective = effectivePermissions(role, userPermissions, plano);
    if (permKey === "comissao") {
      const allowed =
        effective.modules.comissao === true ||
        effective.modules.financeiro === true;
      if (!allowed) return false;
      return effective.actions["financeiro.comissao"] !== false;
    }
    if (effective.modules[permKey] !== true) return false;
    if (permKey === "leads" && effective.actions["leads.view"] === false) {
      return false;
    }
    if (
      permKey === "leadsPerdidos" &&
      effective.actions["leads.viewLost"] === false
    ) {
      return false;
    }
    const financeAction = actionForFinancePath(path);
    if (financeAction && effective.actions[financeAction] === false) {
      return false;
    }
    return true;
  }

  const roleRoutes =
    role === "gerente" && plano === "bronze"
      ? GERENTE_BRONZE_ROUTES
      : ROLE_ROUTES[role];
  return roleRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export function defaultRouteForRole(
  role: Role,
  user?: Pick<AuthUser, "tenant" | "permissions"> | null,
): string {
  if (role === "super_admin") return "/tenants";
  if (role === "analista") return "/documentacao";
  if (role === "financeiro") {
    return user?.tenant?.plano === "solo"
      ? "/financeiro/fluxo-caixa"
      : "/financeiro/visao-geral";
  }

  const home = user?.tenant?.homePath?.trim();
  if (
    home &&
    canAccessRoute(
      role,
      home,
      user?.tenant?.modules ?? null,
      user?.tenant?.plano ?? null,
      user?.permissions ?? null,
    )
  ) {
    return home;
  }
  if (
    canAccessRoute(
      role,
      "/dashboard",
      user?.tenant?.modules ?? null,
      user?.tenant?.plano ?? null,
      user?.permissions ?? null,
    )
  ) {
    return "/dashboard";
  }
  return "/perfil";
}

/** Apenas admin vê indicadores financeiros (receita, comissão, valores em R$). */
export function canViewFinancial(role: Role): boolean {
  return role === "admin" || role === "financeiro";
}

export type FinanceiroAcao = "view" | "create" | "edit" | "delete";

export function canFinanceiroAction(
  user: Pick<
    AuthUser,
    | "role"
    | "financeiroCanView"
    | "financeiroCanCreate"
    | "financeiroCanEdit"
    | "financeiroCanDelete"
    | "permissions"
  > | null | undefined,
  action: FinanceiroAcao,
): boolean {
  if (!user) return false;
  if (
    user.role === "admin" ||
    user.role === "super_admin" ||
    user.role === "gerente"
  ) {
    return true;
  }
  if (user.role === "financeiro") {
    if (action === "view") return user.financeiroCanView !== false;
    if (action === "create") return user.financeiroCanCreate !== false;
    if (action === "edit") return user.financeiroCanEdit !== false;
    return user.financeiroCanDelete !== false;
  }
  if (!user.permissions) return false;
  if (action === "view") {
    return canUserAction(user.role, user.permissions, "financeiro.access");
  }
  if (action === "create") {
    return (
      canUserAction(user.role, user.permissions, "financeiro.pagar.create") ||
      canUserAction(user.role, user.permissions, "financeiro.receber.create")
    );
  }
  if (action === "edit") {
    return (
      canUserAction(user.role, user.permissions, "financeiro.pagar.edit") ||
      canUserAction(user.role, user.permissions, "financeiro.receber.edit")
    );
  }
  return (
    canUserAction(user.role, user.permissions, "financeiro.pagar.delete") ||
    canUserAction(user.role, user.permissions, "financeiro.receber.delete")
  );
}

/** Módulo concedido (ou padrão do cargo). */
export function canViewModule(
  user: Pick<AuthUser, "role" | "permissions" | "tenant"> | null | undefined,
  moduleKey: string,
): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return hasUserModule(
    user.role,
    user.permissions,
    moduleKey,
    user.tenant?.plano,
  );
}

/** Ranking, VGV e vendas por construtora: gestão ou módulo concedido. */
export function canViewRankingVendas(
  user:
    | Pick<AuthUser, "role" | "permissions" | "tenant">
    | Role
    | null
    | undefined,
): boolean {
  if (!user) return false;
  if (typeof user === "string") {
    return user === "admin" || user === "gerente";
  }
  return canViewModule(user, "corretores") || canViewModule(user, "vendas");
}

/**
 * Admin vê todos; gerente vê a própria equipe (escopo aplicado na API).
 * Analista tem visão global de processos de análise.
 * Corretor e treinee ficam restritos aos próprios registros.
 */
export function canViewTeamData(role: Role): boolean {
  return (
    role === "admin" ||
    role === "super_admin" ||
    role === "gerente" ||
    role === "analista"
  );
}

/** Mesmo escopo operacional do corretor (própria carteira). */
export function isCorretorLike(role: string | null | undefined): boolean {
  return role === "corretor" || role === "treinee";
}

/** Admin da imobiliária e gerente podem trocar o corretor do lead. */
export function canReassignLead(role: string | null | undefined): boolean {
  return role === "admin" || role === "gerente";
}

/** Quem pode registrar relatos e editar o próprio texto na triagem. */
export function canWriteTriagem(role: string | null | undefined): boolean {
  return (
    role === "corretor" ||
    role === "treinee" ||
    role === "gerente" ||
    role === "admin"
  );
}

/**
 * Quem vê o lead no funil / monitoramento de atraso:
 * - admin: todos do tenant
 * - gerente: carteira própria + corretores da equipe + pool da equipe
 * - corretor/treinee: somente os próprios
 */
export function isLeadInAtrasoScope(
  user: Pick<AuthUser, "id" | "name" | "role">,
  lead: {
    corretorId?: string | null;
    equipeId?: string | null;
    corretor?: string | null;
  },
  team?: { memberIds: Set<string>; equipeIds: Set<string> },
): boolean {
  if (
    user.role === "admin" ||
    user.role === "super_admin" ||
    user.role === "analista"
  ) {
    return true;
  }
  if (isCorretorLike(user.role)) {
    return lead.corretorId === user.id || lead.corretor === user.name;
  }
  if (user.role === "gerente") {
    if (lead.corretorId === user.id) return true;
    if (lead.corretorId && team?.memberIds.has(lead.corretorId)) return true;
    if (
      !lead.corretorId &&
      lead.equipeId &&
      team?.equipeIds.has(lead.equipeId)
    ) {
      return true;
    }
    return false;
  }
  return false;
}
