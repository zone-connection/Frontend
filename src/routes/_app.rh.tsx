import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { Calendar, FileText, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { ModulePageTransition, OperationSubnav } from "@/components/operacao-ui";

export const Route = createFileRoute("/_app/rh")({
  head: () => ({ meta: [{ title: "RH — Zone Connection" }] }),
  component: RhLayout,
});

const TABS = [
  { to: "/rh", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/rh/recrutamento", label: "Recrutamento", icon: Users },
  { to: "/rh/equipe", label: "Equipe", icon: UsersRound },
  { to: "/rh/agenda", label: "Agenda", icon: Calendar },
  { to: "/rh/modelos", label: "Modelos", icon: FileText },
] as const;

function RhLayout() {
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
