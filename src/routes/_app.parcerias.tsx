import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Handshake, Home } from "lucide-react";
import { OperationSubnav } from "@/components/operacao-ui";

const TABS = [
  { to: "/parcerias/visao-geral", label: "Parcerias", icon: Handshake },
  { to: "/parcerias/imoveis", label: "Vitrine", icon: Home },
] as const;

export const Route = createFileRoute("/_app/parcerias")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/parcerias" || location.pathname === "/parcerias/") {
      throw redirect({ to: "/parcerias/visao-geral" });
    }
  },
  component: ParceriasLayout,
});

function ParceriasLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <OperationSubnav items={[...TABS]} pathname={pathname} />
      <Outlet />
    </div>
  );
}
