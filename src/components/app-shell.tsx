import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  LayoutDashboard,
  Store,
  Users,
  Kanban,
  Crosshair,
  Calendar,
  Building2,
  UserCircle2,
  UsersRound,
  FileSignature,
  DollarSign,
  Settings,
  User as UserIcon,
  LogOut,
  Bell,
  ChevronsLeft,
  ChevronDown,
  ChevronRight,
  Target,
  ClipboardList,
  Briefcase,
  Shield,
  CircleUser,
  ArrowLeftRight,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  FolderOpen,
  SearchCheck,
  Percent,
  Goal,
  UserX,
  Network,
  Menu,
  X,
  Headset,
  BookOpen,
  BookMarked,
  GraduationCap,
  Handshake,
  Library,
  Receipt,
  TriangleAlert,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getSession, sendHeartbeat, signOut, type AuthUser } from "@/lib/auth";
import { canAccessRoute } from "@/lib/permissions";
import { useHideImoveisFromSidebar } from "@/lib/imoveis-nav-prefs";
import { useHideClientesFromSidebar } from "@/lib/clientes-nav-prefs";
import { useTenantTheme } from "@/lib/tenant-theme";
import { GuiaTourHost } from "@/components/guia-tour";
import { ModuloAjudaButton } from "@/components/modulo-ajuda";
import { ApiError } from "@/lib/api";
import {
  fetchNotificacoes,
  markAllNotificacoesLidas,
  markNotificacaoLida,
  type Notificacao,
} from "@/lib/notificacoes-api";
import { syncLeadMonitoramento } from "@/lib/leads-api";
import {
  fetchAgendaLembretes,
  type AgendaProximo,
  type AgendaUrgencia,
} from "@/lib/agenda-api";
import { AgendaLembretesDialog } from "@/components/agenda-lembretes-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/env";

const AGENDA_BADGE_BY_URGENCIA: Record<
  Exclude<AgendaUrgencia, "nenhuma">,
  string
> = {
  dia: "bg-amber-400 text-amber-950 hover:bg-amber-400",
  duas_horas: "bg-orange-500 text-white hover:bg-orange-500",
  uma_hora: "bg-red-600 text-white hover:bg-red-600",
};

const AGENDA_DOT_BY_URGENCIA: Record<
  Exclude<AgendaUrgencia, "nenhuma">,
  string
> = {
  dia: "bg-amber-400",
  duas_horas: "bg-orange-500",
  uma_hora: "bg-red-600",
};

const SUPPORT_WHATSAPP_URL = getWhatsAppUrl(undefined, "558191702203");

const SESSION_LEMBRETE_KEY = "agenda-lembretes-card-shown";
const SESSION_ANALISE_ALERT_KEY = "analise-resultado-alerted-ids";

type NavLeaf = { to: string; label: string; icon: LucideIcon };
type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
};
type NavItem = NavLeaf | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function itemMatchesPath(item: NavItem, pathname: string) {
  if (isNavGroup(item)) {
    return item.children.some(
      (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
    );
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

const FINANCEIRO_MODULES: NavLeaf[] = [
  {
    to: "/financeiro/visao-geral",
    label: "Visão geral",
    icon: LayoutDashboard,
  },
  {
    to: "/financeiro/clientes-fornecedores",
    label: "Clientes e fornecedores",
    icon: Users,
  },
  {
    to: "/financeiro/movimentacao",
    label: "Movimentação financeira",
    icon: ArrowLeftRight,
  },
  { to: "/financeiro/fluxo-caixa", label: "Fluxo de caixa", icon: Banknote },
  {
    to: "/financeiro/contas-a-receber",
    label: "Contas a receber",
    icon: ArrowUpRight,
  },
  {
    to: "/financeiro/contas-a-pagar",
    label: "Contas a pagar",
    icon: ArrowDownRight,
  },
  {
    to: "/financeiro/despesas",
    label: "Despesas",
    icon: Receipt,
  },
  { to: "/financeiro/comissao", label: "Comissão", icon: Percent },
  { to: "/financeiro/funcionarios", label: "Funcionários", icon: UsersRound },
];

/** Operação da plataforma (super_admin). */
const PLATFORM_OPERACAO_MODULES: NavLeaf[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/funil", label: "Funil", icon: Kanban },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/treinamento", label: "Treinamento", icon: GraduationCap },
];

/** Fechamento da plataforma (super_admin) — sem Documentação nem Propostas. */
const PLATFORM_FECHAMENTO_MODULES: NavLeaf[] = [
  { to: "/contratos", label: "Contratos", icon: FileSignature },
  { to: "/vendas", label: "Vendas", icon: DollarSign },
];

/** Gestão da plataforma (super_admin) — clientes da plataforma e guia. */
const PLATFORM_GESTAO_MODULES: NavLeaf[] = [
  { to: "/tenants", label: "Clientes", icon: Building2 },
  { to: "/guia", label: "Guia", icon: BookOpen },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

/** Financeiro da plataforma (super_admin) — mesmo design das imobiliárias. */
const PLATFORM_FINANCEIRO_MODULES: NavLeaf[] = [
  {
    to: "/financeiro/visao-geral",
    label: "Visão geral",
    icon: LayoutDashboard,
  },
  {
    to: "/financeiro/clientes-fornecedores",
    label: "Fornecedores",
    icon: Users,
  },
  {
    to: "/financeiro/movimentacao",
    label: "Movimentação financeira",
    icon: ArrowLeftRight,
  },
  {
    to: "/financeiro/contas-a-receber",
    label: "Contas a receber",
    icon: ArrowUpRight,
  },
  {
    to: "/financeiro/contas-a-pagar",
    label: "Contas a pagar",
    icon: ArrowDownRight,
  },
  {
    to: "/financeiro/despesas",
    label: "Despesas",
    icon: Receipt,
  },
  {
    to: "/financeiro/fluxo-caixa",
    label: "Fluxo de caixa",
    icon: Banknote,
  },
  { to: "/financeiro/funcionarios", label: "Funcionários", icon: UsersRound },
];

const NAV_SECTIONS: {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Admin da imobiliária ou super_admin da plataforma. */
  adminOrPlatform?: boolean;
  gerenteOnly?: boolean;
  /** Item solto no menu, sem pasta/seção. */
  standalone?: boolean;
  items: NavItem[];
}[] = [
  {
    id: "operacao",
    label: "Operação",
    icon: Briefcase,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/leads", label: "Leads", icon: Users },
      { to: "/caca-lead", label: "Caça-lead", icon: Crosshair },
      { to: "/funil", label: "Funil", icon: Kanban },
      { to: "/triagem", label: "Triagem", icon: ClipboardList },
      { to: "/agenda", label: "Agenda", icon: Calendar },
      { to: "/clientes", label: "Clientes", icon: UserCircle2 },
      { to: "/funil-clientes", label: "Funil de Clientes", icon: Kanban },
      { to: "/leads-perdidos", label: "Leads Perdidos", icon: UserX },
      { to: "/clientes-perdidos", label: "Perda de cliente", icon: UserX },
      {
        id: "captacao",
        label: "Captação",
        icon: Home,
        children: [
          { to: "/captacao/visao-geral", label: "Visão geral", icon: LayoutDashboard },
          { to: "/captacao/funil", label: "Funil", icon: Kanban },
          { to: "/captacao/captacoes", label: "Captações", icon: ClipboardList },
          { to: "/captacao/proprietarios", label: "Proprietários", icon: Users },
        ],
      },
      {
        id: "imoveis-usados",
        label: "Venda de Usados",
        icon: Store,
        children: [
          { to: "/imoveis-usados/visao-geral", label: "Visão geral", icon: LayoutDashboard },
          { to: "/imoveis-usados/funil", label: "Funil", icon: Kanban },
          { to: "/imoveis-usados/interessados", label: "Interessados", icon: Users },
        ],
      },
      { to: "/treinamento", label: "Treinamento", icon: GraduationCap },
    ],
  },
  {
    id: "fechamento",
    label: "Fechamento",
    icon: Handshake,
    items: [
      { to: "/documentacao", label: "Documentação", icon: FolderOpen },
      { to: "/propostas", label: "Propostas", icon: ClipboardList },
      { to: "/contratos", label: "Contratos", icon: FileSignature },
      { to: "/vendas", label: "Vendas", icon: DollarSign },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    icon: Library,
    items: [
      { to: "/construtoras", label: "Construtoras", icon: Building2 },
      { to: "/imoveis", label: "Imóveis", icon: Building2 },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    icon: Shield,
    items: [
      { to: "/tenants", label: "Clientes", icon: Building2 },
      { to: "/guia", label: "Guia", icon: BookOpen },
      { to: "/corretores", label: "Ranking", icon: UsersRound },
      { to: "/atrasos", label: "Atrasos", icon: TriangleAlert },
      { to: "/metas", label: "Metas", icon: Target },
      { to: "/resultado", label: "Análise", icon: SearchCheck },
      { to: "/taxa-conversao", label: "Taxa de conversão", icon: Goal },
      { to: "/equipes", label: "Equipes", icon: Network },
      { to: "/usuarios", label: "Usuários", icon: UsersRound },
      { to: "/permissoes", label: "Permissões", icon: KeyRound },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    adminOrPlatform: true,
    items: FINANCEIRO_MODULES,
  },
  {
    id: "conta",
    label: "Conta",
    icon: CircleUser,
    items: [{ to: "/perfil", label: "Perfil", icon: UserIcon }],
  },
  {
    id: "guia-sistema",
    label: "Guia do sistema",
    icon: BookMarked,
    standalone: true,
    items: [{ to: "/guia-sistema", label: "Guia do sistema", icon: BookMarked }],
  },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
  analista: "Analista",
  treinee: "Treinee",
  financeiro: "Financeiro",
  assistente: "Assistente",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const { brandName, logoUrl, modules } = useTenantTheme();
  const hideImoveisFromSidebar = useHideImoveisFromSidebar();
  const hideClientesFromSidebar = useHideClientesFromSidebar();
  const plano = user?.tenant?.plano ?? null;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operacao: true,
    financeiro: true,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [agendaSolicitacoesCount, setAgendaSolicitacoesCount] = useState(0);
  const [agendaUrgencia, setAgendaUrgencia] =
    useState<AgendaUrgencia>("nenhuma");
  const [agendaProximosCount, setAgendaProximosCount] = useState(0);
  const [agendaProximos, setAgendaProximos] = useState<AgendaProximo[]>([]);
  const [lembretesOpen, setLembretesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [analiseAlert, setAnaliseAlert] = useState<Notificacao | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTriagem = pathname === "/triagem";

  useEffect(() => {
    const sync = () => setUser(getSession());
    sync();
    window.addEventListener("crm-session-updated", sync);
    return () => window.removeEventListener("crm-session-updated", sync);
  }, []);

  const loadNotificacoes = useCallback(async () => {
    try {
      try {
        await syncLeadMonitoramento();
      } catch {
        // sync de prazo não deve impedir o sino
      }
      setNotificacoes(await fetchNotificacoes());
    } catch {
      // silencioso: sino não deve quebrar o shell
    }
  }, []);

  // Gerente: aviso em tela (toast + modal) quando chega resultado de análise.
  useEffect(() => {
    if (user?.role !== "gerente") return;
    if (analiseAlert) return;

    const unread = notificacoes.filter(
      (n) => !n.lida && n.tipo === "analise_resultado",
    );
    if (unread.length === 0) return;

    let shown: string[] = [];
    try {
      shown = JSON.parse(
        sessionStorage.getItem(SESSION_ANALISE_ALERT_KEY) || "[]",
      ) as string[];
      if (!Array.isArray(shown)) shown = [];
    } catch {
      shown = [];
    }

    const next = unread.find((n) => !shown.includes(n.id));
    if (!next) return;

    const updated = [...shown, next.id].slice(-40);
    try {
      sessionStorage.setItem(
        SESSION_ANALISE_ALERT_KEY,
        JSON.stringify(updated),
      );
    } catch {
      // ignore
    }

    setAnaliseAlert(next);
    const aprovada = /aprovad/i.test(next.titulo);
    if (aprovada) {
      toast.success(next.titulo, {
        description: next.corpo,
        duration: 10_000,
      });
    } else {
      toast.message(next.titulo, {
        description: next.corpo,
        duration: 10_000,
      });
    }
  }, [notificacoes, user?.role, analiseAlert]);

  const loadAgendaBadge = useCallback(
    async (opts?: { showCard?: boolean }) => {
      try {
        const data = await fetchAgendaLembretes();
        setAgendaSolicitacoesCount(data.solicitacoesCount);
        setAgendaUrgencia(data.urgencia);
        setAgendaProximosCount(data.proximosCount);
        setAgendaProximos(data.proximos);

        if (opts?.showCard && data.proximos.length > 0) {
          const already =
            typeof sessionStorage !== "undefined" &&
            sessionStorage.getItem(SESSION_LEMBRETE_KEY) === "1";
          if (!already) {
            sessionStorage.setItem(SESSION_LEMBRETE_KEY, "1");
            setLembretesOpen(true);
          }
        }

        if (data.novasNotificacoes.length > 0) {
          void loadNotificacoes();
        }
      } catch {
        // silencioso
      }
    },
    [loadNotificacoes],
  );

  useEffect(() => {
    if (!user) return;
    // Super admin não usa notificações/agenda do CRM operacional.
    if (user.role === "super_admin") return;

    void loadNotificacoes();
    // Analista não tem módulo de agenda; só consulta notificações.
    if (user.role !== "analista") {
      void loadAgendaBadge({ showCard: true });
    }
    const pollMs = user.role === "gerente" ? 20_000 : 60_000;
    const id = window.setInterval(() => {
      void loadNotificacoes();
      if (user.role !== "analista") {
        void loadAgendaBadge();
      }
    }, pollMs);
    return () => window.clearInterval(id);
  }, [user, loadNotificacoes, loadAgendaBadge]);

  // Presença: heartbeat a cada 60s com a aba visível (tempo logado no dia).
  useEffect(() => {
    if (!user || user.role === "super_admin") return;

    const beat = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void sendHeartbeat().catch(() => {
        // silencioso — falha de presença não deve afetar o uso
      });
    };

    beat();
    const id = window.setInterval(beat, 60_000);

    const onVisibility = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  const unreadCount = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes],
  );

  const isAdmin = user?.role === "admin";
  const isPlatformAdmin = user?.role === "super_admin";
  const agendaBadgeCount =
    agendaUrgencia !== "nenhuma"
      ? agendaProximosCount
      : agendaSolicitacoesCount;
  const showAgendaBadge = agendaBadgeCount > 0;
  // Admin: badge neutro (sem vermelho/laranja de urgência pessoal).
  const agendaBadgeClass = isAdmin
    ? agendaUrgencia !== "nenhuma"
      ? "bg-slate-500 text-white hover:bg-slate-500"
      : "bg-primary"
    : agendaUrgencia !== "nenhuma"
      ? AGENDA_BADGE_BY_URGENCIA[agendaUrgencia]
      : "bg-primary";
  const agendaDotClass = isAdmin
    ? agendaUrgencia !== "nenhuma"
      ? "bg-slate-500"
      : "bg-primary"
    : agendaUrgencia !== "nenhuma"
      ? AGENDA_DOT_BY_URGENCIA[agendaUrgencia]
      : "bg-primary";

  async function handleOpenNotif(n: Notificacao) {
    try {
      if (!n.lida) {
        const updated = await markNotificacaoLida(n.id);
        setNotificacoes((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível marcar como lida.",
      );
    }
    setNotifOpen(false);
    if (
      n.tipo === "agenda_solicitacao" ||
      n.tipo === "agenda_resposta" ||
      n.tipo === "agenda_atribuicao" ||
      n.tipo === "agenda_lembrete_1d" ||
      n.tipo === "agenda_lembrete_2h" ||
      n.tipo === "agenda_lembrete_1h"
    ) {
      void navigate({ to: "/agenda" });
      return;
    }
    if (n.tipo === "analise_resultado") {
      void navigate({
        to:
          user?.role === "gerente" || user?.role === "admin"
            ? "/documentacao"
            : "/resultado",
      });
      return;
    }
    if (n.tipo === "imovel_compativel") {
      void navigate({
        to: "/imoveis",
        search: n.empreendimentoId
          ? { matches: n.empreendimentoId }
          : undefined,
      });
      return;
    }
    const canOpenFunil = Boolean(
      user &&
        canAccessRoute(
          user.role,
          "/funil",
          user.tenant?.modules ?? null,
          user.tenant?.plano,
          user.permissions,
        ),
    );
    const leadDest = canOpenFunil ? "/funil" : "/leads";
    if (n.tipo === "proposta_vencimento_proximo") {
      if (
        user &&
        canAccessRoute(
          user.role,
          "/propostas",
          user.tenant?.modules ?? null,
          user.tenant?.plano,
          user.permissions,
        )
      ) {
        void navigate({ to: "/propostas" });
      } else if (n.leadId && canOpenFunil) {
        void navigate({
          to: "/funil",
          search: { lead: n.leadId },
        });
      } else {
        void navigate({ to: leadDest });
      }
      return;
    }
    if (
      n.tipo === "lead_prazo_proximo" ||
      n.tipo === "lead_prazo_ultrapassado" ||
      n.tipo === "lead_sem_atendimento" ||
      n.tipo === "tarefa_atrasada"
    ) {
      if (canOpenFunil) {
        void navigate({
          to: "/funil",
          search: { lead: n.leadId ?? undefined },
        });
      } else {
        void navigate({ to: "/leads" });
      }
      return;
    }
    void navigate({
      to: user?.role === "analista" ? "/documentacao" : leadDest,
    });
  }

  async function dismissAnaliseAlert(opts?: { openDoc?: boolean }) {
    const current = analiseAlert;
    setAnaliseAlert(null);
    if (!current) return;
    try {
      if (!current.lida) {
        const updated = await markNotificacaoLida(current.id);
        setNotificacoes((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
      }
    } catch {
      // ignore
    }
    if (opts?.openDoc) {
      if (
        user &&
        canAccessRoute(
          user.role,
          "/documentacao",
          user.tenant?.modules ?? null,
          user.tenant?.plano ?? null,
          user.permissions,
        )
      ) {
        void navigate({ to: "/documentacao" });
      }
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificacoesLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível marcar todas.",
      );
    }
  }

  const navSections = useMemo(() => {
    if (!user) return [];
    return NAV_SECTIONS.filter((section) => {
      if (section.adminOnly) return user.role === "admin";
      if (section.adminOrPlatform) {
        return (
          section.id === "financeiro" ||
          user.role === "admin" ||
          user.role === "super_admin"
        );
      }
      if (section.gerenteOnly) return user.role === "gerente";
      return true;
    })
      .map((section) => {
        let sectionItems = section.items;
        if (user.role === "super_admin") {
          if (section.id === "operacao") sectionItems = PLATFORM_OPERACAO_MODULES;
          else if (section.id === "fechamento")
            sectionItems = PLATFORM_FECHAMENTO_MODULES;
          else if (section.id === "gestao") sectionItems = PLATFORM_GESTAO_MODULES;
          else if (section.id === "financeiro")
            sectionItems = PLATFORM_FINANCEIRO_MODULES;
        }
        return {
          ...section,
          items: sectionItems
            .map((item) => {
              if (isNavGroup(item)) {
                const children = item.children.filter((c) =>
                  canAccessRoute(
                    user.role,
                    c.to,
                    user.tenant?.modules ?? modules,
                    plano,
                    user.permissions,
                  ),
                );
                return children.length ? { ...item, children } : null;
              }
              if (item.to === "/imoveis" && hideImoveisFromSidebar) {
                return null;
              }
              if (
                hideClientesFromSidebar &&
                (item.to === "/clientes" || item.to === "/funil-clientes")
              ) {
                return null;
              }
              return canAccessRoute(
                user.role,
                item.to,
                user.tenant?.modules ?? modules,
                plano,
                user.permissions,
              )
                ? item
                : null;
            })
            .filter((item): item is NavItem => item !== null),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [user, modules, plano, hideImoveisFromSidebar, hideClientesFromSidebar]);

  useEffect(() => {
    const active = navSections.find((section) =>
      section.items.some((item) => itemMatchesPath(item, pathname)),
    );
    if (active) {
      setOpenSections((prev) => ({ ...prev, [active.id]: true }));
    }
    for (const section of navSections) {
      for (const item of section.items) {
        if (isNavGroup(item) && itemMatchesPath(item, pathname)) {
          setOpenGroups((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    }
  }, [pathname, navSections]);

  // Fecha o menu mobile automaticamente quando a rota muda.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Trava o scroll do body enquanto o drawer mobile está aberto.
  useEffect(() => {
    if (mobileNavOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mobileNavOpen]);

  function toggleSection(id: string) {
    if (collapsed) {
      setCollapsed(false);
      setOpenSections((prev) => ({ ...prev, [id]: true }));
      return;
    }
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSignOut() {
    await signOut();
    sessionStorage.removeItem(SESSION_LEMBRETE_KEY);
    sessionStorage.removeItem(SESSION_ANALISE_ALERT_KEY);
    toast.success("Você saiu da conta");
    navigate({ to: "/login", replace: true });
  }

  function renderAccountFooter(collapsedView: boolean) {
    return (
      <div className="border-t border-sidebar-border">
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-2 p-3 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
          title="Suporte técnico"
        >
          <Headset className="h-4 w-4 shrink-0" />
          {!collapsedView && <span>Suporte técnico</span>}
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full cursor-pointer items-center gap-2 p-3 text-xs text-[#f87171] hover:bg-[#f87171]/15 hover:text-[#fca5a5]"
          title="Sair"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsedView && <span>Sair da conta</span>}
        </button>
      </div>
    );
  }

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("") ?? "U";
  const canSettings = user
    ? canAccessRoute(
        user.role,
        "/configuracoes",
        modules,
        plano,
        user.permissions,
      )
    : false;

  // Renderiza as seções de navegação. Reaproveitado tanto pelo <aside> fixo
  // do desktop quanto pelo drawer mobile, para não duplicar a lógica.
  function renderNavSections(collapsedView: boolean, onNavigate?: () => void) {
    const parentClass =
      "flex w-full items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium text-white/95 transition-colors hover:bg-white/[0.04]";
    const childClass = (active: boolean) =>
      cn(
        "relative flex w-full items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-[12.5px] font-normal transition-colors",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/70 hover:bg-white/[0.04] hover:text-white",
      );
    const treeClass = "ml-[21px] space-y-0.5 border-l border-white/15 pl-2.5";

    return (
      <nav className="sidebar-nav-scroll flex-1 overflow-y-auto">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = !!openSections[section.id];
          const standaloneLeaf =
            section.standalone &&
            section.items.length === 1 &&
            !isNavGroup(section.items[0])
              ? section.items[0]
              : null;

          if (standaloneLeaf) {
            const active =
              pathname === standaloneLeaf.to ||
              pathname.startsWith(`${standaloneLeaf.to}/`);
            return (
              <div
                key={section.id}
                className="border-b border-white/10"
              >
                <Link
                  to={standaloneLeaf.to}
                  preload="intent"
                  onClick={onNavigate}
                  title={collapsedView ? section.label : undefined}
                  className={cn(parentClass, active && "bg-white/[0.06] text-white")}
                >
                  <SectionIcon className="size-4 shrink-0 stroke-[1.6]" />
                  {!collapsedView && (
                    <span className="flex-1 truncate">{section.label}</span>
                  )}
                </Link>
              </div>
            );
          }

          return (
            <div key={section.id} className="border-b border-white/10 py-1">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                title={collapsedView ? section.label : undefined}
                className={cn(parentClass, "cursor-pointer")}
              >
                <SectionIcon className="size-4 shrink-0 stroke-[1.6]" />
                {!collapsedView && (
                  <>
                    <span className="flex-1 truncate text-left">
                      {section.label}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="size-4 shrink-0 text-white/50 stroke-[1.6]" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-white/50 stroke-[1.6]" />
                    )}
                  </>
                )}
              </button>

              {isOpen && !collapsedView && (
                <div className={cn(treeClass, "mb-1.5 mt-0.5")}>
                  {section.items.map((item) => {
                    if (isNavGroup(item)) {
                      const groupOpen = !!openGroups[item.id];
                      const GroupIcon = item.icon;
                      return (
                        <div key={item.id}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.id)}
                            className={cn(childClass(false), "cursor-pointer")}
                          >
                            <GroupIcon className="size-3.5 shrink-0 stroke-[1.6]" />
                            <span className="flex-1 truncate text-left">
                              {item.label}
                            </span>
                            {groupOpen ? (
                              <ChevronDown className="size-3.5 shrink-0 text-white/45 stroke-[1.6]" />
                            ) : (
                              <ChevronRight className="size-3.5 shrink-0 text-white/45 stroke-[1.6]" />
                            )}
                          </button>
                          {groupOpen && (
                            <div className={cn(treeClass, "mt-0.5")}>
                              {item.children.map((child) => {
                                const active =
                                  pathname === child.to ||
                                  pathname.startsWith(`${child.to}/`);
                                const ChildIcon = child.icon;
                                return (
                                  <Link
                                    key={child.to}
                                    to={child.to}
                                    preload="intent"
                                    onClick={onNavigate}
                                    className={childClass(active)}
                                  >
                                    <ChildIcon className="size-3.5 shrink-0 stroke-[1.6]" />
                                    <span className="truncate">{child.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const active =
                      pathname === item.to ||
                      pathname.startsWith(`${item.to}/`);
                    const Icon = item.icon;
                    const isAgenda = item.to === "/agenda";
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        preload="intent"
                        onClick={onNavigate}
                        className={childClass(active)}
                      >
                        <span className="relative shrink-0">
                          <Icon className="size-3.5 stroke-[1.6]" />
                          {isAgenda && showAgendaBadge && collapsedView ? (
                            <span
                              className={cn(
                                "absolute -top-1.5 -right-1.5 size-2 rounded-full",
                                agendaDotClass,
                              )}
                            />
                          ) : null}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {isAgenda && showAgendaBadge ? (
                          <Badge
                            className={cn(
                              "h-5 min-w-5 px-1.5 text-[10px]",
                              agendaBadgeClass,
                            )}
                          >
                            {agendaBadgeCount > 9 ? "9+" : agendaBadgeCount}
                          </Badge>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar fixa — visível apenas em telas md e acima */}
      <aside
        className={cn(
          collapsed ? "w-16" : "w-64",
          "hidden md:flex shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 sticky top-0 h-screen flex-col",
        )}
      >
        <div
          className={cn(
            "flex border-b border-sidebar-border",
            collapsed
              ? "flex-col items-center gap-1 px-1 py-2"
              : "items-center gap-2 px-3 h-14",
          )}
        >
          <img
            src={logoUrl}
            alt={brandName}
            className="w-8 h-8 rounded-none object-contain shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">
                {brandName === "Zone Connection" ? (
                  <>
                    Zone <span className="text-primary">Connection</span>
                  </>
                ) : (
                  brandName
                )}
              </div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">
                {user?.role === "super_admin" ? "Plataforma" : "CRM conectado"}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            <ChevronsLeft
              className={cn(
                "w-4 h-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>
        {renderNavSections(collapsed)}
        {renderAccountFooter(collapsed)}
      </aside>

      {/* Backdrop do menu mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileNavOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer do menu mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform duration-200 ease-out md:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <img
            src={logoUrl}
            alt={brandName}
            className="w-8 h-8 rounded-none object-contain shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">
              {brandName === "Zone Connection" ? (
                <>
                  Zone <span className="text-primary">Connection</span>
                </>
              ) : (
                brandName
              )}
            </div>
            <div className="text-[10px] text-sidebar-foreground/60 truncate">
              {user?.role === "super_admin" ? "Plataforma" : "CRM conectado"}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {renderNavSections(false, () => setMobileNavOpen(false))}
        {renderAccountFooter(false)}
      </aside>

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          isTriagem && "lg:h-dvh lg:overflow-hidden",
        )}
      >
        <header className="h-14 border-b bg-card/90 backdrop-blur sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 min-w-0 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Abrir menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {!isPlatformAdmin && (
              <Popover
                open={notifOpen}
                onOpenChange={(o) => {
                  setNotifOpen(o);
                  if (o) void loadNotificacoes();
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notificações"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                {/* Âncora no canto direito do header para o painel abrir alinhado à página */}
                <PopoverAnchor asChild>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-full h-0 w-0 sm:right-6"
                  />
                </PopoverAnchor>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  className="w-80 p-0"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <p className="text-sm font-semibold">Notificações</p>
                    {unreadCount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => void handleMarkAllRead()}
                      >
                        Marcar todas
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificacoes.length === 0 ? (
                      <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                        Nenhuma notificação
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-accent/60 transition-colors",
                            !n.lida && "bg-primary/5",
                          )}
                          onClick={() => void handleOpenNotif(n)}
                        >
                          <div className="text-xs font-medium leading-snug">
                            {n.titulo}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {n.corpo}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-2.5 py-1.5 hover:bg-accent"
                  aria-label="Menu da conta"
                >
                  <Avatar className="w-7 h-7">
                    {user?.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="avatar-fallback-brand text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left leading-tight hidden sm:block">
                    <div className="text-xs font-medium">
                      {user?.name ?? "Usuário"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
                  <UserIcon className="w-4 h-4 mr-2" /> Perfil
                </DropdownMenuItem>
                {canSettings && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/configuracoes" })}
                  >
                    <Settings className="w-4 h-4 mr-2" /> Configurações
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          className={cn(
            "flex-1 p-3 sm:p-4 md:p-6 max-w-full min-w-0 overflow-x-clip",
            isTriagem && "flex min-h-0 flex-col lg:overflow-hidden",
          )}
        >
          {children}
        </main>
        <GuiaTourHost />
      </div>

      <AgendaLembretesDialog
        open={lembretesOpen}
        onOpenChange={setLembretesOpen}
        proximos={agendaProximos}
        urgencia={agendaUrgencia}
        informativo={user?.role === "admin"}
        onGoAgenda={() => {
          setLembretesOpen(false);
          void navigate({ to: "/agenda" });
        }}
      />

      <AlertDialog
        open={Boolean(analiseAlert)}
        onOpenChange={(open) => {
          if (!open) void dismissAnaliseAlert();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {analiseAlert?.titulo ?? "Resultado da análise"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {analiseAlert?.corpo ??
                "Um processo da sua equipe teve o resultado da análise atualizado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => void dismissAnaliseAlert()}>
              Fechar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void dismissAnaliseAlert({ openDoc: true })}
            >
              Ver documentação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  actionsClassName,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Classes extras no container das actions (ex.: funil sem max-width). */
  actionsClassName?: string;
}) {
  const { brandName } = useTenantTheme();
  return (
    <div
      data-guia="page-header"
      className="mb-4 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-6"
    >
      <div className="min-w-0 flex-1 space-y-1 lg:min-w-64">
        <p className="mb-1.5 inline-flex max-w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate">{brandName}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight wrap-break-word text-module-title sm:text-2xl">
            {title}
          </h1>
          <ModuloAjudaButton />
        </div>
        {description && (
          <div className="mt-1 text-sm text-pretty wrap-break-word text-muted-foreground">
            {typeof description === "string" ? (
              <p className="max-w-2xl">{description}</p>
            ) : (
              description
            )}
          </div>
        )}
      </div>
      {actions && (
        <div
          data-guia="page-actions"
          className={cn(
            "flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto lg:max-w-[min(100%,36rem)] lg:shrink-0",
            actionsClassName,
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
