import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
// O entry antigo ficou cacheado na CDN como HTML. Mudar este módulo gera outro hash.
import { PagePendingSkeleton } from "@/components/skeletons";
import { recoverStaleChunks } from "@/lib/recover-stale-chunks";
import { routeTree } from "./routeTree.gen";

recoverStaleChunks();

function ModulePending() {
  return <PagePendingSkeleton />;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Sem preload no hover: o intent disparava dezenas de rotas pesadas
    // (funil, leads, dashboard) e quebrava com match undefined no router.
    defaultPreload: false,
    // Padrão do TanStack = 1000ms / 500ms — a tela anterior ficava “presa”.
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultPendingComponent: ModulePending,
    defaultViewTransition: false,
  });

  return router;
};
