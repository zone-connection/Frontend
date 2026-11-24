import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Calendar, FileText, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { ModulePageTransition, OperationSubnav } from "@/components/operacao-ui";
import { startGuiaTour } from "@/lib/guia-tour";

export const Route = createFileRoute("/_app/rh")({
  head: () => ({ meta: [{ title: "RH — Zone Connection" }] }),
  component: RhLayout,
});

const TABS = [
  { to: "/rh", label: "Visão geral", icon: LayoutDashboard, exact: true, guia: "rh-visao" },
  { to: "/rh/recrutamento", label: "Recrutamento", icon: Users, guia: "rh-recrutamento" },
  { to: "/rh/equipe", label: "Equipe", icon: UsersRound, guia: "rh-equipe" },
  { to: "/rh/agenda", label: "Agenda", icon: Calendar, guia: "rh-agenda" },
  { to: "/rh/modelos", label: "Modelos", icon: FileText, guia: "rh-modelos" },
] as const;

function RhLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    try {
      if (sessionStorage.getItem("guia-ao-entrar") !== "rh") return;
      sessionStorage.removeItem("guia-ao-entrar");
    } catch {
      return;
    }
    startGuiaTour("rh", { live: true });
  }, []);
  return (
    <div>
      <OperationSubnav items={[...TABS]} pathname={pathname} />
      <ModulePageTransition pathname={pathname}>
        <Outlet />
      </ModulePageTransition>
    </div>
  );
}
