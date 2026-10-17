import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ModulePageTransition, OperationSubnav } from "@/components/operacao-ui";
import {
  ClipboardList,
  FolderOpen,
  Funnel,
  Goal,
  LayoutDashboard,
  SearchCheck,
  Target,
  Users,
} from "lucide-react";

const TABS = [
  { to: "/captacao/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/captacao/funil", label: "Funil", icon: Funnel },
  { to: "/captacao/captacoes", label: "Captações", icon: ClipboardList },
  { to: "/captacao/oportunidades", label: "Oportunidades", icon: SearchCheck },
  { to: "/captacao/proprietarios", label: "Proprietários", icon: Users },
  { to: "/captacao/avaliacoes", label: "Avaliações", icon: Goal },
  { to: "/captacao/documentacao", label: "Documentação", icon: FolderOpen },
  { to: "/captacao/relatorios", label: "Relatórios", icon: Target },
] as const;

export const Route = createFileRoute("/_app/captacao")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/captacao" || location.pathname === "/captacao/") {
      throw redirect({ to: "/captacao/visao-geral" });
    }
  },
  component: CaptacaoLayout,
});

function CaptacaoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <OperationSubnav items={[...TABS]} pathname={pathname} />
      <ModulePageTransition pathname={pathname}>
        <Outlet />
      </ModulePageTransition>
    </div>
  );
}
