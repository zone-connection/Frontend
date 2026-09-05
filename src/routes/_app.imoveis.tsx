import { createFileRoute } from "@tanstack/react-router";
import { ImoveisPage } from "@/components/imoveis-page";

type Search = { proprietarioId?: string; matches?: string };

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    proprietarioId:
      typeof search.proprietarioId === "string"
        ? search.proprietarioId
        : undefined,
    matches:
      typeof search.matches === "string" ? search.matches : undefined,
  }),
  component: ImoveisRoute,
});

function ImoveisRoute() {
  const { proprietarioId, matches } = Route.useSearch();
  return (
    <ImoveisPage proprietarioId={proprietarioId} openMatchesId={matches} />
  );
}
