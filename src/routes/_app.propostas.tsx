import { createFileRoute } from "@tanstack/react-router";
import { PropostasPage } from "@/components/propostas-page";

export const Route = createFileRoute("/_app/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Zone Connection" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { id?: string; origem?: "lancamento" | "usado"; lead?: string } => {
    const id =
      typeof search.id === "string" && search.id.trim() ? search.id : undefined;
    const origem =
      search.origem === "lancamento" || search.origem === "usado"
        ? search.origem
        : undefined;
    const lead =
      typeof search.lead === "string" && search.lead.trim()
        ? search.lead
        : undefined;
    return {
      ...(id ? { id } : {}),
      ...(origem ? { origem } : {}),
      ...(lead ? { lead } : {}),
    };
  },
  component: PropostasPage,
});

export { PropostaCadastroDialog } from "@/components/propostas-page";
export type { PropostaCadastroSeed } from "@/components/propostas-page";
