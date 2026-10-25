import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ModulePageTransition, OperationSubnav } from "@/components/operacao-ui";
import { ClipboardCheck, LayoutDashboard } from "lucide-react";

const TABS = [
  { to: "/imoveis-usados/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/imoveis-usados/pos-venda", label: "Pós-venda", icon: ClipboardCheck },
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
