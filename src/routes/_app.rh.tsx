import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/rh")({
  head: () => ({ meta: [{ title: "RH — Zone Connection" }] }),
  component: RhLayout,
});

const LINKS = [
  { to: "/rh", label: "Visão geral", exact: true },
  { to: "/rh/recrutamento", label: "Recrutamento" },
  { to: "/rh/equipe", label: "Equipe" },
  { to: "/rh/agenda", label: "Agenda" },
] as const;

function RhLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-2">
        {LINKS.map((item) => {
          const active = "exact" in item && item.exact ? path === item.to : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active ? "bg-[#079ED4] text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
