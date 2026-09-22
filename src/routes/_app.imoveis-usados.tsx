import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { OperationSubnav } from "@/components/operacao-ui";
import { Calendar, FileText, Kanban, LayoutDashboard, Store, Users } from "lucide-react";

const TABS = [
  { to: "/imoveis-usados/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/imoveis-usados/funil", label: "Funil", icon: Kanban },
  { to: "/imoveis-usados/estoque", label: "Estoque", icon: Store },
  { to: "/imoveis-usados/visitas", label: "Visitas", icon: Calendar },
  { to: "/imoveis-usados/propostas", label: "Propostas", icon: FileText },
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
      <Outlet />
    </div>
  );
}
