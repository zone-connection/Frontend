import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Handshake, Home, LayoutDashboard, LogOut, ScrollText, Wallet } from "lucide-react";
import { ensureParceiroSession } from "@/lib/parceiros-auth";
import { signOutParceiro } from "@/lib/parceiros-auth";
import type { PortalParceiro } from "@/lib/parceiros-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parceiros")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/parceiros/login") return { parceiro: null };
    const session = await ensureParceiroSession();
    if (!session) {
      throw redirect({ to: "/parceiros/login", search: { email: undefined } });
    }
    return { parceiro: session };
  },
  component: ParceirosLayout,
});

const NAV = [
  { to: "/parceiros", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/parceiros/imoveis", label: "Imóveis", icon: Home },
  { to: "/parceiros/oportunidades", label: "Oportunidades", icon: ScrollText },
  { to: "/parceiros/repasses", label: "Repasses", icon: Wallet },
] as const;

function ParceirosLayout() {
  const { parceiro } = Route.useRouteContext();
  if (!parceiro) return <Outlet />;
  return (
    <ParceiroShell parceiro={parceiro}>
      <Outlet />
    </ParceiroShell>
  );
}

function ParceiroShell({
  parceiro,
  children,
}: {
  parceiro: PortalParceiro;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-[#f4f6f7] text-slate-800">
      <aside className="fixed inset-y-0 left-0 hidden w-[250px] flex-col bg-[#1e3a5f] px-4 py-5 text-white lg:flex">
        <p className="mb-8 flex items-center gap-2 px-2 text-sm font-semibold">
          <Handshake className="h-4 w-4" />
          Portal do parceiro
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const exact = "exact" in item && item.exact;
            const active = exact
              ? pathname === "/parceiros" || pathname === "/parceiros/"
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                  active ? "bg-white/15 font-medium" : "text-white/70 hover:bg-white/10",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="mt-auto flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white"
          onClick={() => {
            void signOutParceiro().then(() =>
              navigate({ to: "/parceiros/login", search: { email: undefined } }),
            );
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
        <p className="mt-3 truncate px-3 text-xs text-white/50">{parceiro.nome}</p>
      </aside>
      <div className="lg:pl-[250px]">
        <main className="px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
