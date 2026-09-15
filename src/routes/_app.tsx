import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ensureSession, getSession, type AuthUser } from "@/lib/auth";
import { canAccessRoute, canSeeComissao, defaultRouteForRole } from "@/lib/permissions";
import { LeadsProvider } from "@/lib/leads-store";
import { CatalogProvider } from "@/lib/catalog-store";
import { TenantThemeProvider } from "@/lib/tenant-theme";

function guardUser(user: AuthUser, pathname: string) {
  const blockedComissao =
    pathname.includes("/financeiro/comissao") && !canSeeComissao(user);
  if (
    blockedComissao ||
    !canAccessRoute(
      user.role,
      pathname,
      user.tenant?.modules ?? null,
      user.tenant?.plano ?? null,
      user.permissions ?? null,
    )
  ) {
    throw redirect({ to: defaultRouteForRole(user.role, user) });
  }
  return { user };
}

function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium">Esta tela não carregou.</p>
      <p className="text-sm text-muted-foreground">
        Pode ser um arquivo antigo do último deploy. Recarregue a página.
      </p>
      <button
        type="button"
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        onClick={() => {
          reset();
          window.location.reload();
        }}
      >
        Recarregar
      </button>
    </div>
  );
}

export const Route = createFileRoute("/_app")({
  ssr: false,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: AppError,
  // Sessão em cache → beforeLoad síncrono (troca de módulo imediata).
  // /auth/me só bloqueia se o cache local sumiu.
  beforeLoad: ({ location }) => {
    const cached = getSession();
    if (cached) {
      void ensureSession();
      return guardUser(cached, location.pathname);
    }

    return ensureSession().then((user) => {
      if (!user) throw redirect({ to: "/login" });
      return guardUser(user, location.pathname);
    });
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  return (
    <TenantThemeProvider user={user}>
      <CatalogProvider>
        <LeadsProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </LeadsProvider>
      </CatalogProvider>
    </TenantThemeProvider>
  );
}
