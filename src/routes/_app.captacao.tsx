import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ModulePageTransition, OperationSubnav } from "@/components/operacao-ui";
import { LayoutDashboard } from "lucide-react";

const TABS = [
  { to: "/captacao/visao-geral", label: "Visão geral", icon: LayoutDashboard },
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
