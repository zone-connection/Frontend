import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ModulePageTransition, OperationSubnav } from "@/components/operacao-ui";
import { Funnel, LayoutDashboard, Store, Users } from "lucide-react";

const TABS = [
  { to: "/imoveis-usados/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/imoveis-usados/funil", label: "Funil", icon: Funnel },
  { to: "/imoveis-usados/estoque", label: "Estoque", icon: Store },
  { to: "/imoveis-usados/interessados", label: "Interessados", icon: Users },
] as const;

export const Route = createFileRoute("/_app/imoveis-usados")({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === "/imoveis-usados" ||
      location.pathname === "/imoveis-usados/"
    ) {
      throw redirect({ to: "/imoveis-usados/visao-geral" });
    }
  },
  component: UsadosLayout,
});

function UsadosLayout() {
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
