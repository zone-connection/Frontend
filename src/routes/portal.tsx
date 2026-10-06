import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal-shell";
import { ensurePortalSession } from "@/lib/portal-auth";
import { TenantThemeProvider } from "@/lib/tenant-theme";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/portal/login") return { proprietario: null };
    const session = await ensurePortalSession();
    if (!session) throw redirect({ to: "/portal/login", search: { email: undefined } });
    return { proprietario: session };
  },
  component: PortalLayout,
});

function PortalLayout() {
  const { proprietario } = Route.useRouteContext();
  if (!proprietario) return <Outlet />;
  return (
    <TenantThemeProvider user={null}>
      <PortalShell proprietario={proprietario}>
        <Outlet />
      </PortalShell>
    </TenantThemeProvider>
  );
}
