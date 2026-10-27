import { createFileRoute } from "@tanstack/react-router";
import { TarefasModulo } from "@/routes/_app.tarefas";

export const Route = createFileRoute("/_app/lembretes")({
  head: () => ({ meta: [{ title: "Lembretes — Zone Connection" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { aba?: "mes" | "semana"; origem?: "captacao" } => {
    const aba =
      search.aba === "mes"
        ? ("mes" as const)
        : search.aba === "agenda" || search.aba === "semana"
          ? ("semana" as const)
          : undefined;
    const origem = search.origem === "captacao" ? ("captacao" as const) : undefined;
    return {
      ...(aba ? { aba } : {}),
      ...(origem ? { origem } : {}),
    };
  },
  component: LembretesPage,
});

function LembretesPage() {
  const { aba, origem } = Route.useSearch();
  return <TarefasModulo aba={aba} origem={origem} />;
}
